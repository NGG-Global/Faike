import { describe, expect, it } from "vitest";
import type { ScanStatusResponse } from "@/lib/scan/api";
import { toScanStatus } from "./adapter";
import { parseMediaDetail } from "./parse";
import { audioNotApplicableDetail, HEATMAP_URL, imageDetail, REQUEST_ID, socialDownloadingDetail } from "./rd-responses.fixture";

function statusOf(json: unknown): ScanStatusResponse {
  return toScanStatus(REQUEST_ID, parseMediaDetail(json));
}

function analysisOf(json: unknown) {
  const status = statusOf(json);
  if (status.state !== "complete") throw new Error(`expected complete, got ${status.state}`);
  return status.analysis;
}

describe("toScanStatus: progress", () => {
  it("reports analysing while RD analyses and the summary is empty", () => {
    expect(statusOf({ requestId: REQUEST_ID, mediaType: "AUDIO", overallStatus: "ANALYZING", resultsSummary: null, models: [] })).toEqual({
      requestId: REQUEST_ID,
      state: "processing",
      stage: "analysing",
      mediaType: "audio",
    });
  });

  it("reports retrieving while RD downloads a social post", () => {
    expect(statusOf(socialDownloadingDetail())).toEqual({ requestId: REQUEST_ID, state: "processing", stage: "retrieving", mediaType: "video" });
    expect(statusOf(socialDownloadingDetail({ overallStatus: "ANALYZING", mediaType: undefined }))).toEqual({
      requestId: REQUEST_ID,
      state: "processing",
      stage: "retrieving",
    });
  });

  it("keeps waiting when no status is present yet", () => {
    expect(statusOf({ requestId: REQUEST_ID })).toMatchObject({ state: "processing", stage: "analysing" });
  });

  it("reports a post RD could not download as a retrieval failure", () => {
    expect(statusOf(socialDownloadingDetail({ socialLinkDownloadFailed: true, overallStatus: "UNABLE_TO_EVALUATE" }))).toEqual({
      requestId: REQUEST_ID,
      state: "failed",
      reason: "retrieval",
    });
  });
});

describe("toScanStatus: verdict", () => {
  it.each([
    ["AUTHENTIC", "authentic"],
    ["FAKE", "artificial"],
    ["SUSPICIOUS", "suspicious"],
    ["NOT_APPLICABLE", "not_applicable"],
    ["UNABLE_TO_EVALUATE", "unable"],
  ])("maps the ensemble status %s to %s", (status, verdict) => {
    expect(analysisOf(imageDetail({ overallStatus: status, resultsSummary: { status } })).verdict).toBe(verdict);
  });

  it("takes the verdict from the ensemble summary, not the overall status or the models", () => {
    const analysis = analysisOf(imageDetail({ overallStatus: "FAKE", resultsSummary: { status: "AUTHENTIC", metadata: { finalScore: 12 } } }));
    expect(analysis.verdict).toBe("authentic");
    expect(analysis.models.find((model) => model.name === "mock-img-a")?.verdict).toBe("artificial");
  });

  it("falls back to the overall status when there is no summary", () => {
    expect(analysisOf(imageDetail({ overallStatus: "SUSPICIOUS", resultsSummary: null })).verdict).toBe("suspicious");
  });

  it("maps an unknown status to unable, never to a verdict", () => {
    expect(analysisOf(imageDetail({ overallStatus: "PROBABLY_FINE", resultsSummary: { status: "PROBABLY_FINE" } })).verdict).toBe("unable");
  });
});

describe("toScanStatus: analysis details", () => {
  it("normalises the ensemble score to 0..1 for meter verdicts only", () => {
    expect(analysisOf(imageDetail()).ensembleScore).toBe(0.87);
    expect(analysisOf(audioNotApplicableDetail()).ensembleScore).toBeUndefined();
    const unable = imageDetail({ overallStatus: "UNABLE_TO_EVALUATE", resultsSummary: { status: "UNABLE_TO_EVALUATE", metadata: { finalScore: 40 } } });
    expect(analysisOf(unable).ensembleScore).toBeUndefined();
  });

  it("drops scores outside RD's documented range", () => {
    expect(analysisOf(imageDetail({ resultsSummary: { status: "FAKE", metadata: { finalScore: 150 } } })).ensembleScore).toBeUndefined();
    expect(analysisOf(imageDetail({ resultsSummary: { status: "FAKE", metadata: {} } })).ensembleScore).toBeUndefined();
  });

  it("passes not-applicable reason codes and the detected language", () => {
    const analysis = analysisOf(audioNotApplicableDetail());
    expect(analysis).toMatchObject({ mediaType: "audio", verdict: "not_applicable", notApplicableReasons: ["cross-talk"], language: "en" });
  });

  it("uses the first recognised language and never guesses others", () => {
    const withLanguages = (languages: unknown) =>
      analysisOf({ requestId: REQUEST_ID, resultsSummary: { status: "AUTHENTIC", metadata: { languages } }, models: [] }).language;
    expect(withLanguages(["klingon", "spanish"])).toBe("es");
    expect(withLanguages(["klingon"])).toBeUndefined();
    expect(withLanguages(["constructor", "toString"])).toBeUndefined();
  });

  it("lists models by the names RD returns, leaving out those that do not apply", () => {
    expect(analysisOf(imageDetail()).models).toEqual([
      { name: "mock-img-a", verdict: "artificial", score: 0.91 },
      { name: "mock-img-b", verdict: "authentic", score: 0.2 },
      { name: "mock-img-ensemble", verdict: "artificial", score: 0.87 },
    ]);
  });

  it("gives a model that is still running no verdict", () => {
    const models = [{ name: "mock-aud-z", status: "ANALYZING", finalScore: null }];
    expect(analysisOf({ requestId: REQUEST_ID, resultsSummary: { status: "SUSPICIOUS" }, models }).models).toEqual([{ name: "mock-aud-z" }]);
  });

  it("keeps heat maps only from non-ensemble models that flagged the image", () => {
    expect(analysisOf(imageDetail()).heatmaps).toEqual([{ model: "mock-img-a", url: HEATMAP_URL }]);
  });

  it("shows no heat map when the ensemble found the image authentic, or for other media", () => {
    expect(analysisOf(imageDetail({ overallStatus: "AUTHENTIC", resultsSummary: { status: "AUTHENTIC" } })).heatmaps).toBeUndefined();
    expect(analysisOf(imageDetail({ mediaType: "VIDEO" })).heatmaps).toBeUndefined();
  });

  it("never passes on account identifiers, storage links or file names", () => {
    const text = JSON.stringify(statusOf(imageDetail()));
    for (const value of [
      "mock-user-id-123",
      "mock-institution-id-456",
      "holiday-photo-of-anna",
      "original.jpg",
      "aggregation.json",
      "rd-file-name",
      "releaseVersion",
    ]) {
      expect(text).not.toContain(value);
    }
  });
});
