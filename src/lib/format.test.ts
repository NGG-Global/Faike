import { describe, expect, it } from "vitest";
import { verdictFromRd } from "./rd/verdict";
import {
  formatBytes,
  formatDuration,
  formatDurationWords,
  formatLabel,
  formatRelative,
  formatUploadProgress,
  languageName,
} from "./format";

describe("formatting", () => {
  it("formats sizes as in the handoff", () => {
    expect(formatBytes(1_100_000)).toBe("1.1 MB");
    expect(formatBytes(12_400_000)).toBe("12.4 MB");
    expect(formatBytes(34_000_000)).toBe("34 MB");
    expect(formatBytes(250_000_000)).toBe("250 MB");
    expect(formatBytes(900_000)).toBe("900 KB");
    expect(formatUploadProgress(7_800_000, 12_400_000)).toBe("7.8 of 12.4 MB");
  });

  it("formats durations", () => {
    expect(formatDuration(48)).toBe("0:48");
    expect(formatDuration(72.9)).toBe("1:12");
    expect(formatDuration(3723)).toBe("1:02:03");
    expect(formatDurationWords(48)).toBe("48 seconds");
    expect(formatDurationWords(72)).toBe("1:12");
  });

  it("formats relative time and language names", () => {
    const now = Date.parse("2026-09-24T14:32:00Z");
    expect(formatRelative("2026-09-24T14:31:30Z", now)).toBe("just now");
    expect(formatRelative("2026-09-24T14:27:00Z", now)).toBe("5 minutes ago");
    expect(languageName("en")).toBe("English");
  });

  it("labels formats from the extension, then the MIME subtype", () => {
    expect(formatLabel("voicenote.m4a", "audio/x-m4a")).toBe("M4A");
    expect(formatLabel(undefined, "audio/x-wav")).toBe("WAV");
    expect(formatLabel("noext", undefined)).toBeUndefined();
  });
});

describe("verdictFromRd", () => {
  it("maps the five RD concepts", () => {
    expect(verdictFromRd("AUTHENTIC")).toBe("authentic");
    expect(verdictFromRd("FAKE")).toBe("artificial");
    expect(verdictFromRd("SUSPICIOUS")).toBe("suspicious");
    expect(verdictFromRd("NOT_APPLICABLE")).toBe("not_applicable");
    expect(verdictFromRd("UNABLE_TO_EVALUATE")).toBe("unable");
  });

  it("treats anything unrecognised as unable, never as a verdict", () => {
    expect(verdictFromRd("fake ")).toBe("artificial");
    expect(verdictFromRd("REAL")).toBe("unable");
    expect(verdictFromRd(undefined)).toBe("unable");
    expect(verdictFromRd(1)).toBe("unable");
  });
});
