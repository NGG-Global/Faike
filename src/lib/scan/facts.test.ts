import { describe, expect, it } from "vitest";
import { fileDetailRows } from "./facts";
import type { ScanResult } from "./types";

const base: ScanResult = {
  scanId: "abc",
  mediaType: "audio",
  source: { kind: "file", fileName: "voice.m4a" },
  file: { sizeBytes: 1_234_567, format: "M4A", durationSec: 48 },
  checkedAt: "2026-09-25T09:00:00.000Z",
  verdict: "authentic",
  language: "en",
  models: [],
};

describe("fileDetailRows", () => {
  it("shows file, media type, detected language and check time only", () => {
    const rows = fileDetailRows(base);
    expect(rows.map(([label]) => label)).toEqual(["File", "Type", "Language", "Checked"]);
    expect(rows[0][1]).toBe("voice.m4a");
    expect(rows[1][1]).toBe("Audio");
    expect(rows[2][1]).toBe("English (detected)");
    expect(JSON.stringify(rows)).not.toMatch(/1,234,567|M4A|abc|bytes/);
  });

  it("drops rows RD or the file did not provide, and names a link's platform", () => {
    const rows = fileDetailRows({ ...base, mediaType: "video", language: undefined, source: { kind: "link", url: "https://youtu.be/x", platform: "YouTube" } });
    expect(rows).toEqual([
      ["File", "From a link"],
      ["Type", "Video"],
      ["Source", "YouTube"],
      ["Checked", expect.any(String)],
    ]);
  });
});
