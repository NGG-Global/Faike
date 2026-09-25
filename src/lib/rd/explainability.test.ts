import { describe, expect, it } from "vitest";
import type { ScanStatusResponse } from "@/lib/scan/api";
import { audioRequestFor, toScanStatus } from "./adapter";
import { parseMediaDetail } from "./parse";
import {
  AUDIO_REQUEST_ID,
  audioDetail,
  imageDetail,
  liveImageDetail,
  minimalDetail,
  REQUEST_ID,
  socialDownloadingDetail,
  soundDetail,
  textDetail,
  videoWithSoundDetail,
} from "./rd-responses.fixture";

/* Explainability and secondary detail, for every media type (adapter). */

function analysisOf(json: unknown, audio?: unknown) {
  const status: ScanStatusResponse = toScanStatus(REQUEST_ID, parseMediaDetail(json), audio ? parseMediaDetail(audio) : undefined);
  if (status.state !== "complete") throw new Error(`expected complete, got ${status.state}`);
  return status.analysis;
}

const LEAKS = ["mock-user-id-123", "mock-institution-id-456", "aggregation.json", "thumb.jpg", "explainability-mock", "X-Amz"];

describe("every media type", () => {
  it.each([
    ["image", liveImageDetail(), "artificial"],
    ["audio", audioDetail(), "authentic"],
    ["video", videoWithSoundDetail(), "suspicious"],
    ["text", textDetail(), "artificial"],
    ["video", socialDownloadingDetail({ overallStatus: "FAKE", resultsSummary: { status: "FAKE" }, socialLinkDownloaded: true }), "artificial"],
  ])("maps a %s result from RD's ensemble without leaking links or account ids", (mediaType, json, verdict) => {
    const analysis = analysisOf(json);
    expect(analysis).toMatchObject({ mediaType, verdict });
    const text = JSON.stringify(analysis);
    // Image heat maps are the only links passed on, and only when the ensemble found signs.
    for (const leak of mediaType === "image" ? LEAKS.slice(0, 5) : LEAKS) expect(text, leak).not.toContain(leak);
  });

  it("keeps the audio language and leaves the ensemble out of the detector list", () => {
    expect(analysisOf(audioDetail())).toMatchObject({ language: "en", models: [{ name: "mock-aud-a", verdict: "authentic", score: 0.1 }] });
  });
});

describe("missing optional fields", () => {
  it.each(["IMAGE", "AUDIO", "VIDEO", "TEXT"])("a bare %s result carries only the verdict", (mediaType) => {
    const analysis = analysisOf(minimalDetail(mediaType));
    expect(Object.keys(analysis).sort()).toEqual(["mediaType", "models", "verdict"]);
    expect(analysis.models).toEqual([]);
  });

  it("shows no score for detectors that have none, rather than a made-up value", () => {
    const models = analysisOf(liveImageDetail({ models: [{ name: "mock-x", status: "FAKE" }] })).models;
    expect(models).toEqual([{ name: "mock-x", verdict: "artificial" }]);
  });
});

describe("text explanation", () => {
  it("is offered only for text, only when RD returned a page", () => {
    expect(analysisOf(textDetail()).hasExplainability).toBe(true);
    expect(analysisOf(textDetail({ explainabilityUrl: "" }))).not.toHaveProperty("hasExplainability");
    expect(analysisOf(imageDetail({ explainabilityUrl: "https://mock.example/x.html" }))).not.toHaveProperty("hasExplainability");
  });
});

describe("a video's separate sound check", () => {
  it("adds the sound verdict beside, never instead of, the overall verdict", () => {
    const analysis = analysisOf(videoWithSoundDetail(), soundDetail("FAKE"));
    expect(analysis.verdict).toBe("suspicious");
    expect(analysis.sound).toEqual({ verdict: "artificial" });
  });

  it("leaves the sound out while it is still running, or when it was not checked", () => {
    expect(analysisOf(videoWithSoundDetail(), soundDetail("ANALYZING"))).not.toHaveProperty("sound");
    expect(analysisOf(videoWithSoundDetail())).not.toHaveProperty("sound");
  });

  it("reads the audio request only when RD says it made one", () => {
    expect(audioRequestFor(parseMediaDetail(videoWithSoundDetail()))).toBe(AUDIO_REQUEST_ID);
    expect(audioRequestFor(parseMediaDetail(videoWithSoundDetail({ showAudioResult: false })))).toBeUndefined();
    expect(audioRequestFor(parseMediaDetail(videoWithSoundDetail({ showAudioResult: "False" })))).toBeUndefined();
    expect(audioRequestFor(parseMediaDetail(videoWithSoundDetail({ audioRequestId: "../x" })))).toBeUndefined();
  });
});
