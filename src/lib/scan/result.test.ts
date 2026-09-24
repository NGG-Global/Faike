import { describe, expect, it } from "vitest";
import type { ScanAnalysis } from "./api";
import type { InputSummary } from "./job";
import { resultFromAnalysis } from "./result";

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
      heatmapUrl: "https://mock.example/b.png",
    });
  });

  it("invents nothing RD did not return", () => {
    const result = resultFromAnalysis({
      scanId: "abc",
      input,
      analysis: { verdict: "unable", models: [] },
      checkedAt: "2026-09-24T23:03:00.000Z",
    });
    for (const key of ["ensembleScore", "language", "notApplicableReason", "heatmapUrl", "regions", "segments", "suitability"]) {
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
