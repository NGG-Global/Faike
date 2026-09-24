import { getScanStatus, presignUpload, putFile } from "./api-client";
import type { ScanJob, ScanStage } from "./job";
import { pollScan } from "./poll";
import { resultFromAnalysis } from "./result";
import type { ScanService, StartInput } from "./service";
import { scanStore } from "./store";

/*
 * Real checks through Reality Defender, for image files only (first
 * vertical slice; every other input stays on the mock).
 *
 *   presign (POST /api/scans/presign) → PUT the file straight to the
 *   upload URL → poll GET /api/scans/{requestId} → result.
 *
 * The browser never sees the RD key. Each check has one AbortController:
 * starting a step aborts the previous one, so a check never runs two
 * loops, and cancel or a newer check stops everything at once. The file
 * stays in memory for retries in this tab only; it is never stored.
 */

interface Check {
  file: File;
  requestId?: string;
  controller?: AbortController;
}

const checks = new Map<string, Check>();

export type LiveInput = Extract<StartInput, { kind: "file" }>;

export function handlesInput(input: StartInput): input is LiveInput {
  return input.kind === "file" && input.summary.mediaType === "image";
}

/** randomUUID exists only in secure contexts; plain-http LAN testing falls back. */
function newId(): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return random.replace(/-/g, "").slice(0, 12);
}

function setStage(id: string, stage: ScanStage) {
  scanStore.updateJob(id, (job) => ({ ...job, stage, live: true }));
}

/** Stops whatever drives the check and returns a fresh signal for the next step. */
function renew(check: Check): AbortSignal {
  check.controller?.abort();
  check.controller = new AbortController();
  return check.controller.signal;
}

function connectionFailure(): "offline" | "network" {
  return typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "network";
}

async function upload(id: string) {
  const check = checks.get(id);
  const job = scanStore.getJob(id);
  if (!check || !job) return;
  const signal = renew(check);
  const { file } = check;
  check.requestId = undefined;
  setStage(id, { name: "uploading", loadedBytes: 0, totalBytes: file.size });

  const presign = await presignUpload(
    { fileName: job.input.fileName ?? file.name, mimeType: file.type, sizeBytes: file.size },
    signal,
  );
  if (signal.aborted) return;
  if (!presign.ok) return setStage(id, { name: "failed", failure: connectionFailure(), at: "uploading" });

  const outcome = await putFile(presign.data.uploadUrl, file, signal, (loaded, total) =>
    setStage(id, { name: "uploading", loadedBytes: loaded, totalBytes: total }),
  );
  if (outcome === "aborted" || signal.aborted) return;
  if (outcome === "failed") return setStage(id, { name: "failed", failure: connectionFailure(), at: "uploading" });

  check.requestId = presign.data.requestId;
  await analyse(id);
}

async function analyse(id: string) {
  const check = checks.get(id);
  if (!check?.requestId) return;
  const signal = renew(check);
  // RD reports status only, so progress stays indeterminate (HANDOFF §6.8).
  setStage(id, { name: "analysing", step: "checking", progress: null });

  const outcome = await pollScan(check.requestId, signal, { getStatus: getScanStatus });
  switch (outcome.kind) {
    case "aborted":
      return;
    case "complete": {
      const job = scanStore.getJob(id);
      if (!job) return;
      const result = resultFromAnalysis({ scanId: id, input: job.input, analysis: outcome.analysis, checkedAt: new Date().toISOString() });
      return setStage(id, { name: "done", result });
    }
    case "retrieval_failed":
      return setStage(id, { name: "failed", failure: "retrieval", at: "analysing" });
    case "timeout":
      return setStage(id, { name: "failed", failure: "timeout", at: "analysing" });
    case "error":
      return setStage(id, { name: "failed", failure: connectionFailure(), at: "analysing" });
  }
}

function releaseMedia(job: ScanJob | undefined) {
  if (job?.media && !job.media.persistent) URL.revokeObjectURL(job.media.src);
}

export const liveScanService: ScanService & { abortInProgress(): void } = {
  start(input) {
    if (!handlesInput(input)) throw new Error("The live service checks image files only.");
    const id = newId();
    const media = input.media ?? { src: URL.createObjectURL(input.file), persistent: false };
    scanStore.setDraft(null);
    scanStore.putJob({
      id,
      createdAt: Date.now(),
      input: input.summary,
      media,
      stage: { name: "uploading", loadedBytes: 0, totalBytes: input.file.size },
      retries: 0,
      live: true,
      engine: "rd",
    });
    checks.set(id, { file: input.file });
    void upload(id);
    return id;
  },

  async load(id) {
    return scanStore.getJob(id) !== undefined;
  },

  cancel(id) {
    const check = checks.get(id);
    const job = scanStore.getJob(id);
    check?.controller?.abort();
    checks.delete(id);
    if (check && job) {
      // The photo comes back on the home page with its preview (HANDOFF §7.3).
      const previewUrl = job.media && !job.media.persistent ? job.media.src : undefined;
      scanStore.setDraft({ kind: "file", file: check.file, summary: job.input, previewUrl });
    } else {
      releaseMedia(job);
    }
    scanStore.removeJob(id);
  },

  retry(id) {
    const check = checks.get(id);
    const stage = scanStore.getJob(id)?.stage;
    if (!check || !stage) return;
    if (stage.name === "failed") {
      // Waiting again needs no new upload; a failed upload starts over.
      void (stage.at === "analysing" && check.requestId ? analyse(id) : upload(id));
    } else if (stage.name === "done") {
      // "Unable": RD documents no way to re-run a check, so the file kept in
      // this tab is sent again as a new one. The person does not re-select it.
      scanStore.updateJob(id, (job) => ({ ...job, retries: job.retries + 1 }));
      void upload(id);
    }
  },

  canRetry(id) {
    return checks.has(id);
  },

  async sendFeedback(id, answer) {
    // Kept in this tab only. Sending it to RD needs a mapping to RD's label
    // and category, which is a product decision (progress.md).
    scanStore.updateJob(id, (job) => ({ ...job, feedback: answer }));
  },

  /** A newer check replaces any real check still uploading or analysing. */
  abortInProgress() {
    for (const [id, check] of checks) {
      const job = scanStore.getJob(id);
      if (job && job.stage.name !== "uploading" && job.stage.name !== "analysing") continue;
      check.controller?.abort();
      checks.delete(id);
      releaseMedia(job);
      scanStore.removeJob(id);
    }
  },
};
