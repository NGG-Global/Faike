import { verdictFromRd, type RdVerdict } from "@/lib/rd/verdict";
import { textByteLength } from "@/lib/scan/input";
import type { Draft, FailureKind, FlowStep, InputSummary, ScanJob, ScanStage } from "@/lib/scan/job";
import type { ScanService, StartInput } from "@/lib/scan/service";
import { scanStore } from "@/lib/scan/store";
import type { MediaType } from "@/lib/scan/types";
import { buildMockResult } from "./build-result";
import { createDemoJob } from "./demo";
import { FIXTURES } from "./fixtures";
import { retrievedMedia, sampleForMedia, sampleMedia } from "./samples";
import { consumeNextScenario, getMockSettings, type MockOutcome } from "./settings";

/*
 * MOCK scan service. Simulates the flow of HANDOFF §9.4 in the browser with
 * timers and fixtures; nothing is uploaded anywhere. Outcomes default per
 * media type and can be set for the next check from the /mock review page.
 */

/** Default outcome when none is chosen, per media type. */
const DEFAULT_OUTCOME: Record<MediaType, RdVerdict> = {
  image: "AUTHENTIC",
  audio: "SUSPICIOUS",
  video: "FAKE",
  text: "SUSPICIOUS",
};

/** Which media a mock link "retrieves", by platform. Unknown platforms fail. */
const LINK_MEDIA: Record<string, Exclude<MediaType, "text">> = {
  TikTok: "video",
  YouTube: "video",
  Facebook: "video",
  Instagram: "image",
  X: "image",
  Threads: "image",
};

const ANALYSIS_MS: Record<MediaType, number> = { image: 3600, audio: 4800, video: 6000, text: 3000 };
const RETRIEVAL_MS = 2600;
const WRITING_MS = 800;
const TICK_MS = 100;
/** Where a held step pauses, matching the reference comps. */
const HOLD_AT = { uploading: 0.63, analysing: 0.62 };

interface Scenario {
  outcome: MockOutcome;
  hold?: FlowStep;
  progress: "determinate" | "indeterminate";
}

const scenarios = new Map<string, Scenario>();
const drafts = new Map<string, Draft>();
/** Cancels whatever timer is driving each check. */
const timers = new Map<string, () => void>();

function newId(): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return random.replace(/-/g, "").slice(0, 12);
}

function stop(id: string) {
  timers.get(id)?.();
  timers.delete(id);
}

function after(id: string, ms: number, fn: () => void) {
  stop(id);
  const timeout = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.set(id, () => clearTimeout(timeout));
}

function setStage(id: string, stage: ScanStage, patch: Partial<ScanJob> = {}) {
  scanStore.updateJob(id, (job) => ({ ...job, ...patch, stage, live: true }));
}

function isFailure(outcome: MockOutcome): outcome is "NETWORK_ERROR" | "OFFLINE" {
  return outcome === "NETWORK_ERROR" || outcome === "OFFLINE";
}

/** Marks the check failed and returns true, so tick callbacks can `return fail(…)`. */
function fail(id: string, failure: FailureKind, at: FlowStep): true {
  stop(id);
  setStage(id, { name: "failed", failure, at });
  return true;
}

function failureKind(outcome: "NETWORK_ERROR" | "OFFLINE"): FailureKind {
  return outcome === "OFFLINE" ? "offline" : "network";
}

function offline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Runs `onTick` with elapsed fraction 0..1 until it returns true. */
function tick(id: string, durationMs: number, onTick: (fraction: number) => boolean) {
  stop(id);
  const started = Date.now();
  const interval = setInterval(() => {
    if (!scanStore.getJob(id) || onTick(Math.min(1, (Date.now() - started) / durationMs))) {
      clearInterval(interval);
      if (timers.get(id) === cancel) timers.delete(id);
    }
  }, TICK_MS);
  const cancel = () => clearInterval(interval);
  timers.set(id, cancel);
}

function upload(id: string, job: ScanJob, scenario: Scenario) {
  const total = job.input.sizeBytes ?? 1_000_000;
  const duration = Math.min(3600, Math.max(1400, (total / 4_000_000) * 1000));
  tick(id, duration, (fraction) => {
    if (offline()) return fail(id, "offline", "uploading");
    if (isFailure(scenario.outcome) && fraction >= 0.45) return fail(id, failureKind(scenario.outcome), "uploading");
    const held = scenario.hold === "uploading" ? Math.min(fraction, HOLD_AT.uploading) : fraction;
    if (held < 1) {
      setStage(id, { name: "uploading", loadedBytes: Math.round(total * held), totalBytes: total });
      return held === HOLD_AT.uploading && scenario.hold === "uploading";
    }
    startAnalysis(id, scenario);
    return true;
  });
}

function retrieve(id: string, job: ScanJob, scenario: Scenario) {
  tick(id, RETRIEVAL_MS, (fraction) => {
    if (scenario.hold === "retrieving") return false;
    if (offline()) return fail(id, "offline", "retrieving");
    if (isFailure(scenario.outcome) && fraction >= 0.5) return fail(id, failureKind(scenario.outcome), "retrieving");
    if (scenario.outcome === "RETRIEVAL_FAILED" && fraction >= 0.7) return fail(id, "retrieval", "retrieving");
    if (fraction < 1) return false;
    const mediaType = LINK_MEDIA[job.input.platformName ?? ""] ?? "video";
    const sample = sampleForMedia(mediaType);
    scanStore.updateJob(id, (current) => ({
      ...current,
      input: { ...current.input, ...retrievedMedia(sample) },
      media: sampleMedia(sample),
    }));
    startAnalysis(id, scenario);
    return true;
  });
}

function startAnalysis(id: string, scenario: Scenario) {
  const job = scanStore.getJob(id);
  if (!job) return;
  const determinate = scenario.progress === "determinate";
  setStage(id, { name: "analysing", step: "checking", progress: determinate ? 0 : null });
  analyse(id, job, scenario);
}

function analyse(id: string, job: ScanJob, scenario: Scenario) {
  const mediaType = job.input.mediaType ?? "image";
  const determinate = scenario.progress === "determinate";
  const verdict = isFailure(scenario.outcome) ? "unable" : verdictFromRd(scenario.outcome);
  const lanes = FIXTURES[mediaType][verdict].partial;

  tick(id, ANALYSIS_MS[mediaType], (fraction) => {
    if (offline()) return fail(id, "offline", "analysing");
    if (isFailure(scenario.outcome)) return fail(id, failureKind(scenario.outcome), "analysing");
    const held = scenario.hold === "analysing" ? Math.min(fraction, HOLD_AT.analysing) : fraction;
    if (held < 1) {
      // Video reports the picture first (HANDOFF §8 "Partly done").
      const partial = lanes?.picture && held >= 0.55 ? { picture: lanes.picture, sound: "pending" as const } : undefined;
      setStage(id, {
        name: "analysing",
        step: "checking",
        progress: determinate ? Math.round(held * 100) : null,
        partial,
      });
      return scenario.hold === "analysing" && held === HOLD_AT.analysing;
    }
    setStage(id, { name: "analysing", step: "writing", progress: determinate ? 100 : null, partial: lanes });
    after(id, WRITING_MS, () => finish(id, scenario));
    return false;
  });
}

function finish(id: string, scenario: Scenario) {
  const job = scanStore.getJob(id);
  if (!job) return;
  const verdict = verdictFromRd(scenario.outcome);
  setStage(id, {
    name: "done",
    result: buildMockResult({ scanId: id, input: job.input, verdict, checkedAt: new Date().toISOString() }),
  });
}

function run(id: string) {
  const job = scanStore.getJob(id);
  const scenario = scenarios.get(id);
  if (!job || !scenario) return;
  if (job.stage.name === "uploading") upload(id, job, scenario);
  else if (job.stage.name === "retrieving") retrieve(id, job, scenario);
  else if (job.stage.name === "analysing") analyse(id, job, scenario);
}

export const mockScanService: ScanService = {
  start(input: StartInput): string {
    const id = newId();
    const chosen = consumeNextScenario();
    const settings = getMockSettings();
    let summary: InputSummary;
    let stage: ScanStage;
    let media: ScanJob["media"];
    let outcome: MockOutcome;

    if (input.kind === "file") {
      summary = input.summary;
      const mediaType = summary.mediaType ?? "image";
      media =
        input.media ?? (mediaType === "text" ? undefined : { src: URL.createObjectURL(input.file), persistent: false });
      stage = { name: "uploading", loadedBytes: 0, totalBytes: summary.sizeBytes ?? 0 };
      drafts.set(id, { kind: "file", file: input.file, summary });
      outcome = chosen?.outcome ?? DEFAULT_OUTCOME[mediaType];
    } else if (input.kind === "link") {
      summary = { kind: "link", url: input.url, platformName: input.platformName, handle: input.handle };
      stage = { name: "retrieving" };
      drafts.set(id, { kind: "link", url: input.url });
      const known = input.platformName && LINK_MEDIA[input.platformName];
      outcome = chosen?.outcome ?? (known ? DEFAULT_OUTCOME[LINK_MEDIA[input.platformName!]] : "RETRIEVAL_FAILED");
    } else {
      summary = { kind: "paste", mediaType: "text", text: input.text, sizeBytes: textByteLength(input.text) };
      stage = { name: "analysing", step: "checking", progress: settings.progress === "determinate" ? 0 : null };
      drafts.set(id, { kind: "paste", text: input.text });
      outcome = chosen?.outcome ?? DEFAULT_OUTCOME.text;
    }

    scenarios.set(id, { outcome, hold: chosen?.hold, progress: settings.progress });
    scanStore.setDraft(null);
    scanStore.putJob({ id, createdAt: Date.now(), input: summary, media, stage, retries: 0, live: true });
    run(id);
    return id;
  },

  async load(id: string): Promise<boolean> {
    if (scanStore.getJob(id)) return true;
    const demo = createDemoJob(id);
    if (!demo) return false;
    scanStore.putJob(demo);
    return true;
  },

  cancel(id: string) {
    stop(id);
    const job = scanStore.getJob(id);
    const draft = drafts.get(id) ?? null;
    const localUrl = job?.media && !job.media.persistent ? job.media.src : undefined;
    // A photo keeps its preview in the restored input; other object URLs are released.
    if (draft?.kind === "file" && job?.input.mediaType === "image" && localUrl) {
      scanStore.setDraft({ ...draft, previewUrl: localUrl });
    } else {
      if (localUrl) URL.revokeObjectURL(localUrl);
      scanStore.setDraft(draft);
    }
    scanStore.removeJob(id);
    scenarios.delete(id);
  },

  retry(id: string) {
    const job = scanStore.getJob(id);
    const scenario = scenarios.get(id);
    if (!job) return;
    if (!scenario) {
      // A restored check (after a reload) has no live scenario: re-run analysis.
      scenarios.set(id, { outcome: DEFAULT_OUTCOME[job.input.mediaType ?? "image"], progress: getMockSettings().progress });
    }
    const current = scenarios.get(id)!;
    const { stage } = job;

    if (stage.name === "failed") {
      // A connection failure clears on retry; the check then completes normally.
      if (isFailure(current.outcome)) {
        const mediaType = job.input.mediaType ?? LINK_MEDIA[job.input.platformName ?? ""] ?? "image";
        current.outcome = DEFAULT_OUTCOME[mediaType];
      }
      const next: ScanStage =
        stage.at === "uploading"
          ? { name: "uploading", loadedBytes: 0, totalBytes: job.input.sizeBytes ?? 0 }
          : stage.at === "retrieving"
            ? { name: "retrieving" }
            : { name: "analysing", step: "checking", progress: current.progress === "determinate" ? 0 : null };
      setStage(id, next);
      run(id);
      return;
    }

    if (stage.name === "done") {
      // "Unable" re-runs analysis on the file already received (HANDOFF §8).
      scanStore.updateJob(id, (j) => ({ ...j, retries: j.retries + 1 }));
      startAnalysis(id, current);
    }
  },

  async sendFeedback(id, answer) {
    // MOCK: stored locally only. The real client sends { id, answer } and nothing else.
    scanStore.updateJob(id, (job) => ({ ...job, feedback: answer }));
  },
};
