import { describe, expect, it } from "vitest";
import type { ScanAnalysis } from "./api";
import type { InputSummary } from "./job";
import { resultFromAnalysis, withLaterDetail } from "./result";

const input: InputSummary = {
  kind: "file",
  mediaType: "image",
  fileName: "beach-sunset.jpg",
  mime: "image/jpeg",
  sizeBytes: 222_708,
  width: 1600,
  height: 1200,
};

const analysis: ScanAnalysis = {
  mediaType: "image",
  verdict: "artificial",
  ensembleScore: 0.92,
  models: [
    { name: "mock-a", verdict: "artificial", score: 0.8 },
    { name: "mock-b", verdict: "artificial", score: 0.99 },
    { name: "mock-c" },
  ],
  heatmaps: [
    { model: "mock-a", url: "https://mock.example/a.png" },
    { model: "mock-b", url: "https://mock.example/b.png" },
  ],
  uploadedAt: "2026-09-24T23:02:50.908Z",
};

describe("resultFromAnalysis", () => {
  it("combines the person's file facts with what RD reported", () => {
    expect(resultFromAnalysis({ scanId: "abc", input, analysis, checkedAt: "2026-09-24T23:03:00.000Z" })).toEqual({
      scanId: "abc",
      mediaType: "image",
      source: { kind: "file", fileName: "beach-sunset.jpg" },
      file: { sizeBytes: 222_708, format: "JPG", width: 1600, height: 1200 },
      checkedAt: "2026-09-24T23:03:00.000Z",
      verdict: "artificial",
      ensembleScore: 0.92,
      models: analysis.models,
      heatmaps: [
        { label: "mock-b", url: "https://mock.example/b.png" },
        { label: "mock-a", url: "https://mock.example/a.png" },
      ],
    });
  });

  it("invents nothing RD did not return", () => {
    const result = resultFromAnalysis({
      scanId: "abc",
      input,
      analysis: { verdict: "unable", models: [] },
      checkedAt: "2026-09-24T23:03:00.000Z",
    });
    for (const key of ["ensembleScore", "language", "notApplicableReason", "heatmaps", "regions", "segments", "suitability", "partial", "hasExplainability"]) {
      expect(result, key).not.toHaveProperty(key);
    }
  });

  it("passes the first not-applicable reason code and the language", () => {
    const result = resultFromAnalysis({
      scanId: "abc",
      input,
      analysis: { verdict: "not_applicable", models: [], notApplicableReasons: ["relevance", "quality"], language: "en" },
      checkedAt: "2026-09-24T23:03:00.000Z",
    });
    expect(result).toMatchObject({ verdict: "not_applicable", notApplicableReason: "relevance", language: "en" });
  });
});

describe("secondary detail", () => {
  it("carries RD's separate sound verdict and the text explanation flag", () => {
    const result = resultFromAnalysis({
      scanId: "abc",
      input: { kind: "file", mediaType: "video", fileName: "clip.mp4" },
      analysis: { verdict: "suspicious", models: [], sound: { verdict: "artificial" }, hasExplainability: true },
      checkedAt: "2026-09-25T09:00:00.000Z",
    });
    expect(result).toMatchObject({ verdict: "suspicious", partial: { sound: "artificial" }, hasExplainability: true });
  });

  it("takes later detector rows and heat maps, never a new verdict or score", () => {
    const early = resultFromAnalysis({
      scanId: "abc",
      input,
      analysis: { ...analysis, models: [{ name: "mock-a", pending: true }], heatmaps: undefined },
      checkedAt: "2026-09-24T23:03:00.000Z",
    });
    expect(early).not.toHaveProperty("heatmaps");
    const later = withLaterDetail(early, { ...analysis, verdict: "authentic", ensembleScore: 0.1 });
    expect(later.models).toEqual(analysis.models);
    expect(later.heatmaps?.map((heatmap) => heatmap.label)).toEqual(["mock-b", "mock-a"]);
    expect(later.verdict).toBe("artificial");
    expect(later.ensembleScore).toBe(0.92);
    expect(later.checkedAt).toBe(early.checkedAt);
    expect(withLaterDetail(later, { ...analysis, heatmaps: undefined })).not.toHaveProperty("heatmaps");
  });
});
