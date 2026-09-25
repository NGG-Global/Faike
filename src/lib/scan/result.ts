import { formatLabel } from "@/lib/format";
import type { ScanAnalysis } from "./api";
import type { InputSummary } from "./job";
import type { ScanResult } from "./types";

/*
 * Builds the ScanResult the screens consume from two sources only: what the
 * person submitted (file name, size, duration and dimensions read in the
 * browser; the link and its platform) and what Reality Defender reported
 * (ScanAnalysis from Faike's route). For a link, the media type comes from
 * RD; Faike never has the post itself, so no file facts are shown. Nothing
 * is inferred; fields neither source provides stay absent, so the elements
 * tied to them hide.
 */

export function resultFromAnalysis(args: {
  scanId: string;
  input: InputSummary;
  analysis: ScanAnalysis;
  /** When Faike received the final result. */
  checkedAt: string;
}): ScanResult {
  const { scanId, input, analysis, checkedAt } = args;

  const result: ScanResult = {
    scanId,
    mediaType: input.mediaType ?? analysis.mediaType ?? "image",
    source: compact({
      kind: input.kind,
      fileName: input.kind === "file" ? input.fileName : undefined,
      url: input.kind === "link" ? input.url : undefined,
      platform: input.kind === "link" ? input.platformName : undefined,
      handle: input.kind === "link" ? input.handle : undefined,
    }),
    file: compact({
      sizeBytes: input.sizeBytes,
      format: input.kind === "paste" ? undefined : formatLabel(input.fileName, input.mime),
      durationSec: input.durationSec,
      width: input.width,
      height: input.height,
    }),
    checkedAt,
    verdict: analysis.verdict,
    models: analysis.models,
  };
  if (analysis.ensembleScore !== undefined) result.ensembleScore = analysis.ensembleScore;
  if (analysis.language) result.language = analysis.language;
  if (analysis.notApplicableReasons?.length) result.notApplicableReason = analysis.notApplicableReasons[0];
  if (analysis.hasExplainability) result.hasExplainability = true;
  // RD's separate check of a video's sound, beside (never instead of) the overall verdict.
  if (analysis.sound) result.partial = { sound: analysis.sound.verdict };
  return withVisuals(result, analysis);
}

/**
 * Replaces the expiring visual links (heat maps) with fresh ones from a new
 * read of the same request, leaving the verdict and everything else as it
 * was. Used when a pre-signed link has expired.
 */
export function withVisuals(result: ScanResult, analysis: ScanAnalysis): ScanResult {
  const heatmaps = orderedHeatmaps(analysis);
  const next: ScanResult = { ...result };
  if (heatmaps.length) next.heatmaps = heatmaps;
  else delete next.heatmaps;
  return next;
}

/**
 * Every usable heat map RD returned (one per detector that flagged the
 * image), strongest detector first; detectors without a score keep RD's order.
 */
function orderedHeatmaps(analysis: ScanAnalysis): { label: string; url: string }[] {
  const scores = new Map(analysis.models.map((model) => [model.name, model.score ?? -1]));
  return [...(analysis.heatmaps ?? [])]
    .sort((a, b) => (scores.get(b.model) ?? -1) - (scores.get(a.model) ?? -1))
    .map((heatmap) => ({ label: heatmap.model, url: heatmap.url }));
}

function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
