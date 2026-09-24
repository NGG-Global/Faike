import { formatLabel } from "@/lib/format";
import type { ScanAnalysis } from "./api";
import type { InputSummary } from "./job";
import type { ScanResult } from "./types";

/*
 * Builds the ScanResult the screens consume from two sources only: what the
 * person submitted (file name, size, dimensions read in the browser) and
 * what Reality Defender reported (ScanAnalysis from Faike's route). Nothing
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
  const heatmapUrl = strongestHeatmap(analysis);

  const result: ScanResult = {
    scanId,
    mediaType: input.mediaType ?? analysis.mediaType ?? "image",
    source: compact({ kind: input.kind, fileName: input.kind === "file" ? input.fileName : undefined }),
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
  if (heatmapUrl) result.heatmapUrl = heatmapUrl;
  return result;
}

/**
 * The interface shows one heat map. RD returns one per model that flagged
 * the image; Faike shows the one from the model with the highest output
 * score, and no model name travels with it.
 */
function strongestHeatmap(analysis: ScanAnalysis): string | undefined {
  const scores = new Map(analysis.models.map((model) => [model.name, model.score ?? -1]));
  const [best] = [...(analysis.heatmaps ?? [])].sort((a, b) => (scores.get(b.model) ?? -1) - (scores.get(a.model) ?? -1));
  return best?.url;
}

function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
