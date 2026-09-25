import { getScanStatus, presignUpload, putFile, submitSocialLink } from "./api-client";
import type { Draft, InputSummary, MediaRef, ScanJob, ScanStage } from "./job";
import { pollScan } from "./poll";
import { resultFromAnalysis, withVisuals } from "./result";
import type { ScanService } from "./service";
import { scanStore } from "./store";

/*
 * Real checks through Reality Defender, for every input: photo, audio,
 * video and text files, pasted text and social links.
 *
 * Only the way the request id is obtained differs:
 *   file (pasted text becomes a .txt file) → POST /api/scans/presign, then
 *   PUT the file straight to the upload URL;
 *   link → POST /api/scans/social; RD downloads the post itself.
 * Everything after it is shared: one set of job stages, one poller
 * (GET /api/scans/{requestId}), one error mapping, one retry and cancel path.
 *
 * The browser never sees the RD key. Each check has one AbortController:
 * starting a step aborts the previous one, so a check never runs two loops,
 * and cancel or a newer check stops everything at once. Files stay in memory
 * for retries in this tab only; they are never stored.
 */

type Submission = { kind: "file"; file: File } | { kind: "link"; url: string };

interface Check {
  submission: Submission;
  /** What Cancel puts back on the home page (HANDOFF §7.3). */
  draft: Draft;
  requestId?: string;
  controller?: AbortController;
}

const checks = new Map<string, Check>();

/** Name of the file pasted text is sent as; RD itself receives a random name with this extension. */
const PASTED_TEXT_FILE = "pasted-text.txt";

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

const IN_PROGRESS = new Set<ScanStage["name"]>(["uploading", "retrieving", "analysing"]);

/** Obtains a request id for the check, then waits for its result. */
async function submit(id: string) {
  const check = checks.get(id);
  if (!check || !scanStore.getJob(id)) return;
  const signal = renew(check);
  check.requestId = undefined;
  const requestId = check.submission.kind === "file" ? await uploadFile(id, check.submission.file, signal) : await submitLink(id, check.submission.url, signal);
  if (!requestId || signal.aborted) return;
  check.requestId = requestId;
  scanStore.updateJob(id, (job) => ({ ...job, requestId }));
  await analyse(id);
}

async function uploadFile(id: string, file: File, signal: AbortSignal): Promise<string | undefined> {
  const input = scanStore.getJob(id)?.input;
  setStage(id, { name: "uploading", loadedBytes: 0, totalBytes: file.size });
  const presign = await presignUpload(
    { fileName: input?.fileName ?? file.name, mimeType: file.type, sizeBytes: file.size },
    signal,
  );
  if (signal.aborted) return;
  if (!presign.ok) return void setStage(id, { name: "failed", failure: connectionFailure(), at: "uploading" });

  const outcome = await putFile(presign.data.uploadUrl, file, signal, (loaded, total) =>
    setStage(id, { name: "uploading", loadedBytes: loaded, totalBytes: total }),
  );
  if (outcome === "aborted" || signal.aborted) return;
  if (outcome === "failed") return void setStage(id, { name: "failed", failure: connectionFailure(), at: "uploading" });
  return presign.data.requestId;
}

async function submitLink(id: string, url: string, signal: AbortSignal): Promise<string | undefined> {
  setStage(id, { name: "retrieving" });
  const result = await submitSocialLink({ url }, signal);
  if (signal.aborted) return;
  if (result.ok) return result.data.requestId;
  // RD refusing the link reads as "We couldn't open that link" (HANDOFF §8).
  const refused = result.code === "rejected" || result.code === "unsupported";
  setStage(id, { name: "failed", failure: refused ? "retrieval" : connectionFailure(), at: "retrieving" });
}

async function analyse(id: string) {
  const check = checks.get(id);
  if (!check?.requestId) return;
  const signal = renew(check);
  // A link shows "retrieving" until RD has the post. RD reports status only,
  // so analysis progress stays indeterminate (HANDOFF §6.8).
  const analysing: ScanStage = { name: "analysing", step: "checking", progress: null };
  setStage(id, check.submission.kind === "link" ? { name: "retrieving" } : analysing);

  const outcome = await pollScan(check.requestId, signal, {
    getStatus: getScanStatus,
    onProcessing: (status) =>
      scanStore.updateJob(id, (job) => ({
        ...job,
        input: job.input.mediaType || !status.mediaType ? job.input : { ...job.input, mediaType: status.mediaType },
        stage: status.stage === "retrieving" ? { name: "retrieving" } : job.stage.name === "analysing" ? job.stage : analysing,
        live: true,
      })),
  });

  const at = scanStore.getJob(id)?.stage.name === "retrieving" ? "retrieving" : "analysing";
  switch (outcome.kind) {
    case "aborted":
      return;
    case "complete": {
      const { analysis } = outcome;
      return scanStore.updateJob(id, (job) => {
        const input = job.input.mediaType || !analysis.mediaType ? job.input : { ...job.input, mediaType: analysis.mediaType };
        const result = resultFromAnalysis({ scanId: id, input, analysis, checkedAt: new Date().toISOString() });
        return { ...job, input, stage: { name: "done", result }, live: true };
      });
    }
    case "retrieval_failed":
      return setStage(id, { name: "failed", failure: "retrieval", at: "retrieving" });
    case "timeout":
      return setStage(id, { name: "failed", failure: "timeout", at });
    case "error":
      return setStage(id, { name: "failed", failure: connectionFailure(), at });
  }
}

function releaseMedia(job: ScanJob | undefined) {
  if (job?.media && !job.media.persistent) URL.revokeObjectURL(job.media.src);
}

export const liveScanService: ScanService & { abortInProgress(): void } = {
  start(input) {
    const id = newId();
    let summary: InputSummary;
    let check: Check;
    let media: MediaRef | undefined;

    if (input.kind === "file") {
      summary = input.summary;
      check = { submission: { kind: "file", file: input.file }, draft: { kind: "file", file: input.file, summary } };
      media = input.media ?? (summary.mediaType === "text" ? undefined : { src: URL.createObjectURL(input.file), persistent: false });
    } else if (input.kind === "paste") {
      const file = new File([input.text], PASTED_TEXT_FILE, { type: "text/plain" });
      summary = { kind: "paste", mediaType: "text", text: input.text, sizeBytes: file.size };
      check = { submission: { kind: "file", file }, draft: { kind: "paste", text: input.text } };
    } else {
      summary = { kind: "link", url: input.url, platformName: input.platformName, handle: input.handle };
      check = { submission: { kind: "link", url: input.url }, draft: { kind: "link", url: input.url } };
    }

    const stage: ScanStage =
      check.submission.kind === "file" ? { name: "uploading", loadedBytes: 0, totalBytes: check.submission.file.size } : { name: "retrieving" };
    scanStore.setDraft(null);
    scanStore.putJob({ id, createdAt: Date.now(), input: summary, media, stage, retries: 0, live: true, engine: "rd" });
    checks.set(id, check);
    void submit(id);
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
    if (check?.draft.kind === "file" && job?.input.mediaType === "image" && job.media && !job.media.persistent) {
      // A photo comes back with its preview.
      scanStore.setDraft({ ...check.draft, previewUrl: job.media.src });
    } else {
      releaseMedia(job);
      scanStore.setDraft(check?.draft ?? null);
    }
    scanStore.removeJob(id);
  },

  retry(id) {
    const check = checks.get(id);
    const stage = scanStore.getJob(id)?.stage;
    if (!check || !stage) return;
    if (stage.name === "failed") {
      // With a request id, waiting resumes on it; otherwise the submission starts over.
      void (check.requestId ? analyse(id) : submit(id));
    } else if (stage.name === "done") {
      // "Unable": RD documents no way to re-run a check, so the input kept in
      // this tab is submitted again as a new one. The person does not re-select it.
      scanStore.updateJob(id, (job) => ({ ...job, retries: job.retries + 1 }));
      void submit(id);
    }
  },

  canRetry(id) {
    return checks.has(id);
  },

  /** Resolves true only when fresh links replaced the old ones; the verdict is never touched. */
  async refresh(id) {
    const job = scanStore.getJob(id);
    if (!job?.requestId || job.stage.name !== "done") return false;
    const fresh = await getScanStatus(job.requestId, new AbortController().signal);
    if (!fresh.ok || fresh.data.state !== "complete") return false;
    const { analysis } = fresh.data;
    const before = JSON.stringify(job.stage.result.heatmaps ?? []);
    const result = withVisuals(job.stage.result, analysis);
    if (JSON.stringify(result.heatmaps ?? []) === before) return false;
    scanStore.updateJob(id, (current) => (current.stage.name === "done" ? { ...current, stage: { name: "done", result } } : current));
    return true;
  },

  async sendFeedback(id, answer) {
    // Kept in this tab only. Sending it to RD needs a mapping to RD's label
    // and category, which is a product decision (progress.md).
    scanStore.updateJob(id, (job) => ({ ...job, feedback: answer }));
  },

  /** A newer check replaces any real check still in progress. */
  abortInProgress() {
    for (const [id, check] of checks) {
      const job = scanStore.getJob(id);
      if (job && !IN_PROGRESS.has(job.stage.name)) continue;
      check.controller?.abort();
      checks.delete(id);
      releaseMedia(job);
      scanStore.removeJob(id);
    }
  },
};
