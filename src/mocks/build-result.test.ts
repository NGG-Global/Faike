import { describe, expect, it } from "vitest";
import { meterPosition } from "@/lib/scan/meter";
import type { MediaType, Verdict } from "@/lib/scan/types";
import { buildMockResult, sentenceRanges } from "./build-result";
import { FIXTURES } from "./fixtures";
import { SAMPLE_TEXT } from "./sample-text";

const checkedAt = "2026-09-24T14:32:00.000Z";

describe("fixtures", () => {
  it("cover every verdict for every media type (HANDOFF §14)", () => {
    const media: MediaType[] = ["image", "audio", "video", "text"];
    const verdicts: Verdict[] = ["authentic", "suspicious", "artificial", "not_applicable", "unable"];
    for (const m of media) for (const v of verdicts) expect(FIXTURES[m][v]).toBeDefined();
  });

  it("keep every score inside the verdict's meter range", () => {
    for (const byVerdict of Object.values(FIXTURES)) {
      for (const [verdict, fixture] of Object.entries(byVerdict)) {
        const position = meterPosition(verdict as Verdict, fixture.ensembleScore);
        if (verdict === "not_applicable" || verdict === "unable") {
          expect(position).toBeNull();
          expect(fixture.ensembleScore).toBeUndefined();
        } else {
          expect(position).not.toBeNull();
        }
      }
    }
  });
});

describe("buildMockResult", () => {
  it("takes file facts from the input and scales segments to its duration", () => {
    const result = buildMockResult({
      scanId: "abc",
      checkedAt,
      verdict: "suspicious",
      input: { kind: "file", mediaType: "audio", fileName: "clip.m4a", mime: "audio/x-m4a", sizeBytes: 500_000, durationSec: 24 },
    });
    expect(result.file).toEqual({ sizeBytes: 500_000, format: "M4A", durationSec: 24 });
    expect(result.segments?.[0]).toMatchObject({ startSec: 3, endSec: 7 });
    for (const s of result.segments ?? []) expect(s.endSec).toBeLessThanOrEqual(24);
  });

  it("omits fields the fixture does not provide", () => {
    const result = buildMockResult({ scanId: "x", checkedAt, verdict: "unable", input: { kind: "file", mediaType: "image" } });
    expect("ensembleScore" in result).toBe(false);
    expect("segments" in result).toBe(false);
    expect(result.models).toEqual([]);
  });

  it("resolves text spans to sentences of the submitted text", () => {
    const result = buildMockResult({
      scanId: "t",
      checkedAt,
      verdict: "suspicious",
      input: { kind: "paste", mediaType: "text", text: SAMPLE_TEXT },
    });
    expect(result.textSpans).toHaveLength(2);
    const [first] = result.textSpans ?? [];
    expect(SAMPLE_TEXT.slice(first.start, first.end)).toBe("The benefits go well beyond fresh tomatoes and courgettes.");
  });

  it("drops spans beyond the end of a short text", () => {
    const result = buildMockResult({
      scanId: "t",
      checkedAt,
      verdict: "suspicious",
      input: { kind: "paste", mediaType: "text", text: "Just one sentence here." },
    });
    expect(result.textSpans).toEqual([]);
  });
});

describe("sentenceRanges", () => {
  it("splits sentences without leading or trailing spaces", () => {
    const text = "One. Two!  Three?";
    expect(sentenceRanges(text).map((r) => text.slice(r.start, r.end))).toEqual(["One.", "Two!", "Three?"]);
    expect(sentenceRanges("No ending")).toEqual([{ start: 0, end: 9 }]);
  });
});
