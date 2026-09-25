import "server-only";
import { RD_ENSEMBLE_MODEL_PATTERN, RD_LANGUAGE_CODES } from "@/config/rd";
import type { ScanAnalysis, ScanStatusResponse } from "@/lib/scan/api";
import { isMeterVerdict } from "@/lib/scan/meter";
import type { MediaType, ModelResult } from "@/lib/scan/types";
import type { RdMediaDetail, RdModelResult } from "./types";
import { verdictFromRd } from "./verdict";

/*
 * Maps a validated Reality Defender media detail into Faike's scan status.
 * Rules (CLAUDE.md):
 * - The verdict comes from the ensemble result (resultsSummary.status, then
 *   overallStatus, as RD's SDK resolves it). Per-model entries are detail
 *   and never change it; a model still ANALYZING once the ensemble has
 *   finished simply has no verdict.
 * - Unknown statuses become "unable", never a verdict about the content.
 * - A field is filled only when RD returned usable data for it.
 * - Nothing identifying RD's account, storage or the person is passed on.
 */

/** Statuses RD reports while work continues (RD SDK). */
const IN_PROGRESS = new Set(["ANALYZING", "DOWNLOADING"]);

const MEDIA_TYPES = new Map<string, MediaType>([
  ["IMAGE", "image"],
  ["AUDIO", "audio"],
  ["VIDEO", "video"],
  ["TEXT", "text"],
]);

/**
 * The request id of RD's separate check of a video's sound, if RD made one.
 * Fetching its media detail with the same endpoint is Faike's reading of
 * the docs ("populated if showAudioResult is True"); failures are ignored.
 */
export function audioRequestFor(detail: RdMediaDetail): string | undefined {
  return detail.showAudioResult !== false ? detail.audioRequestId : undefined;
}

/** Final status of a result: the ensemble summary first, then the overall status (RD SDK). */
function finalStatus(detail: RdMediaDetail): string | undefined {
  const status = detail.resultsSummary?.status ?? detail.overallStatus;
  return status !== undefined && !IN_PROGRESS.has(status) ? status : undefined;
}

export function toScanStatus(requestId: string, detail: RdMediaDetail, audio?: RdMediaDetail): ScanStatusResponse {
  // RD documents the socialLink* fields for social submissions only; a
  // file upload can carry them too (a live image check read "retrieving"),
  // so they count only when a link was submitted.
  const social = detail.socialLink !== undefined;
  if (social && detail.socialLinkDownloadFailed === true) return { requestId, state: "failed", reason: "retrieval" };

  const mediaType = detail.mediaType ? MEDIA_TYPES.get(detail.mediaType) : undefined;
  const status = detail.resultsSummary?.status ?? detail.overallStatus;

  if (status === undefined || IN_PROGRESS.has(status)) {
    const retrieving = social && (status === "DOWNLOADING" || detail.socialLinkDownloaded === false);
    return {
      requestId,
      state: "processing",
      stage: retrieving ? "retrieving" : "analysing",
      ...(mediaType && { mediaType }),
    };
  }

  return { requestId, state: "complete", analysis: toAnalysis(status, mediaType, detail, audio) };
}

function toAnalysis(status: string, mediaType: MediaType | undefined, detail: RdMediaDetail, audio?: RdMediaDetail): ScanAnalysis {
  const verdict = verdictFromRd(status);
  const metadata = detail.resultsSummary?.metadata;

  const ensembleScore = isMeterVerdict(verdict) ? scoreFrom(metadata?.finalScore) : undefined;
  const language = metadata?.languages?.map(languageCode).find((code) => code !== undefined);
  const reasons = verdict === "not_applicable" ? metadata?.reasons?.map((reason) => reason.code) : undefined;
  // A heat map shows where a model flagged the image, so it appears only
  // when the ensemble itself found signs; it never contradicts the verdict.
  const heatmaps =
    mediaType === "image" && (verdict === "suspicious" || verdict === "artificial") ? usableHeatmaps(detail) : undefined;
  // RD documents the explanation page for text only.
  const hasExplainability = mediaType === "text" && detail.explainabilityUrl !== undefined;
  // The sound check is secondary detail beside the overall verdict, never a replacement.
  const soundStatus = audio ? finalStatus(audio) : undefined;

  return {
    verdict,
    models: detail.models.flatMap(toModel),
    ...(mediaType && { mediaType }),
    ...(ensembleScore !== undefined && { ensembleScore }),
    ...(language && { language }),
    ...(reasons?.length && { notApplicableReasons: reasons }),
    ...(heatmaps?.length && { heatmaps }),
    ...(hasExplainability && { hasExplainability: true as const }),
    ...(soundStatus && { sound: { verdict: verdictFromRd(soundStatus) } }),
    ...(detail.uploadedDate && { uploadedAt: detail.uploadedDate }),
  };
}

/** RD scores are 0–100; Faike's are 0..1 model output scores. */
function scoreFrom(value: number | undefined): number | undefined {
  return value !== undefined && value >= 0 && value <= 100 ? value / 100 : undefined;
}

function languageCode(name: string): string | undefined {
  return Object.hasOwn(RD_LANGUAGE_CODES, name) ? RD_LANGUAGE_CODES[name] : undefined;
}

/**
 * The individual detectors behind the overall result. Left out: models that
 * do not apply (as RD's SDK does) and the ensemble entry, which is the
 * overall result itself. A detector still running has no verdict.
 */
function toModel(model: RdModelResult): ModelResult[] {
  if (model.status === "NOT_APPLICABLE" || model.code === "not_applicable") return [];
  if (RD_ENSEMBLE_MODEL_PATTERN.test(model.name)) return [];
  const pending = model.status !== undefined && IN_PROGRESS.has(model.status);
  const verdict = model.status && !pending ? verdictFromRd(model.status) : undefined;
  const score = scoreFrom(model.finalScore);
  return [{ name: model.name, ...(verdict && { verdict }), ...(score !== undefined && { score }), ...(pending && { pending: true as const }) }];
}

/**
 * RD: heat maps are usable only for non-ensemble image models whose status
 * is FAKE; other entries may be present but their links are invalid.
 */
function usableHeatmaps(detail: RdMediaDetail): { model: string; url: string }[] {
  const flagged = new Set(
    detail.models
      .filter((model) => model.status === "FAKE" && !RD_ENSEMBLE_MODEL_PATTERN.test(model.name))
      .map((model) => model.name),
  );
  return Object.entries(detail.heatmaps ?? {})
    .filter(([model]) => flagged.has(model))
    .map(([model, url]) => ({ model, url }));
}
