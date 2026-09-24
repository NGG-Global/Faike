import { formatLabel } from "@/lib/format";
import type { InputSummary } from "@/lib/scan/job";
import type { ScanResult, Strength, TextSpan, Verdict } from "@/lib/scan/types";
import { FIXTURES } from "./fixtures";

/*
 * MOCK: builds a ScanResult for any input from the fixtures. File facts come
 * from the input's own metadata; everything else from the fixture, with
 * times scaled to the input's duration and text spans resolved against the
 * submitted text.
 */

export function buildMockResult(args: {
  scanId: string;
  input: InputSummary;
  verdict: Verdict;
  checkedAt: string;
}): ScanResult {
  const { scanId, input, verdict, checkedAt } = args;
  const mediaType = input.mediaType ?? "image";
  const { basisDurationSec, textSpanPlan, segments, sceneCuts, ...fixture } = FIXTURES[mediaType][verdict];
  const scale = basisDurationSec && input.durationSec ? input.durationSec / basisDurationSec : 1;
  const round = (n: number) => Math.round(n * scale * 10) / 10;

  const result: ScanResult = {
    ...fixture,
    scanId,
    mediaType,
    verdict,
    checkedAt,
    source: {
      kind: input.kind,
      fileName: input.kind === "file" ? input.fileName : undefined,
      url: input.url,
      platform: input.platformName,
      handle: input.handle,
    },
    file: {
      sizeBytes: input.sizeBytes,
      format: input.kind === "paste" ? undefined : formatLabel(input.fileName, input.mime),
      durationSec: input.durationSec,
      width: input.width,
      height: input.height,
    },
    segments: segments?.map((s) => ({ ...s, startSec: round(s.startSec), endSec: round(s.endSec) })),
    sceneCuts: sceneCuts?.map(round),
    textSpans: textSpanPlan && input.text !== undefined ? resolveSpans(input.text, textSpanPlan) : undefined,
  };
  return withoutUndefined(result);
}

/** Sentence ranges of `text`, trailing whitespace excluded. */
export function sentenceRanges(text: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const pattern = /[^.!?]+(?:[.!?]+["')\]]*|$)/g;
  for (const match of text.matchAll(pattern)) {
    const raw = match[0];
    const leading = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const start = (match.index ?? 0) + leading;
    ranges.push({ start, end: start + trimmed.length });
  }
  return ranges;
}

function resolveSpans(text: string, plan: { sentence: number; strength: Strength }[]): TextSpan[] {
  const ranges = sentenceRanges(text);
  return plan
    .filter((p) => p.sentence < ranges.length)
    .map((p) => ({ ...ranges[p.sentence], strength: p.strength }));
}

function withoutUndefined<T extends object>(value: T): T {
  const out = { ...value };
  for (const key of Object.keys(out) as (keyof T)[]) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}
