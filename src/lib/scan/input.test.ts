import { describe, expect, it } from "vitest";
import { SOCIAL_PLATFORMS } from "@/config/platforms";
import { classifyPaste, detectMediaType, displayUrl, linkAllowed, mediaTypeForMime, validateFile, validateLink, validateText } from "./input";

describe("mediaTypeForMime", () => {
  it("classifies by MIME family", () => {
    expect(mediaTypeForMime("image/jpeg")).toBe("image");
    expect(mediaTypeForMime("audio/x-m4a")).toBe("audio");
    expect(mediaTypeForMime("video/webm")).toBe("video");
    expect(mediaTypeForMime("text/plain")).toBe("text");
  });

  it("returns null for anything else", () => {
    expect(mediaTypeForMime("application/pdf")).toBeNull();
    expect(mediaTypeForMime("text/html")).toBeNull();
    expect(mediaTypeForMime("")).toBeNull();
  });
});

describe("classifyPaste", () => {
  it("treats URLs as links and recognises the platform and handle", () => {
    const result = classifyPaste("  https://www.tiktok.com/@citybeat/video/123 ");
    expect(result).toMatchObject({ kind: "link", handle: "@citybeat" });
    expect(result.kind === "link" && result.platform?.name).toBe("TikTok");
  });

  it("accepts a bare host with a path", () => {
    expect(classifyPaste("instagram.com/p/abc")).toMatchObject({ kind: "link" });
  });

  it("keeps links from unknown sites, without a platform", () => {
    const result = classifyPaste("https://example.com/post/1");
    expect(result.kind === "link" && result.platform).toBeNull();
  });

  it("treats everything else as text, preserving it", () => {
    expect(classifyPaste("Is this real?\nhttps://x.com/a")).toEqual({ kind: "text", text: "Is this real?\nhttps://x.com/a" });
    expect(classifyPaste("example.com")).toMatchObject({ kind: "text" });
    expect(classifyPaste("   ")).toEqual({ kind: "empty" });
  });

  it("truncates URLs for display", () => {
    expect(displayUrl("https://www.tiktok.com/@citybeat/video/7412345678")).toBe("tiktok.com/@citybeat/video/…");
  });
});

describe("validateFile (HANDOFF §9.3)", () => {
  it("rejects unsupported types first", () => {
    expect(validateFile({ name: "a.zip", mime: "application/zip", sizeBytes: 10 }, "plus")).toEqual({
      ok: false,
      issue: { kind: "unsupported" },
    });
  });

  it("rejects a known MIME family with an extension Reality Defender does not accept, naming the category", () => {
    for (const [name, mime, subject] of [["photo.heic", "image/heic", "image"], ["photo.avif", "image/avif", "image"], ["clip.webm", "video/webm", "video"], ["noext", "image/jpeg", "image"]]) {
      expect(validateFile({ name, mime, sizeBytes: 10 }, "plus"), name).toEqual({ ok: false, issue: { kind: "unsupported", subject } });
    }
    expect(validateFile({ name: "Photo.JPEG", mime: "image/jpeg", sizeBytes: 10 }, "plus")).toEqual({ ok: true, mediaType: "image" });
  });

  it("enforces size limits per type", () => {
    const result = validateFile({ name: "a.mp3", mime: "audio/mpeg", sizeBytes: 34_000_000 }, "plus");
    expect(result).toEqual({
      ok: false,
      issue: { kind: "too_large", mediaType: "audio", limitBytes: 20_000_000, sizeBytes: 34_000_000 },
    });
    expect(validateFile({ name: "a.png", mime: "image/png", sizeBytes: 49_000_000 }, "free")).toEqual({ ok: true, mediaType: "image" });
  });

  it("enforces the 30-minute video limit when the duration is known", () => {
    const result = validateFile({ name: "a.mp4", mime: "video/mp4", sizeBytes: 1_000, durationSec: 31 * 60 }, "plus");
    expect(result.ok === false && result.issue.kind).toBe("too_long");
  });

  it("gates Plus types for free users before upload", () => {
    expect(validateFile({ name: "a.mp4", mime: "video/mp4", sizeBytes: 1_000 }, "free")).toEqual({
      ok: false,
      issue: { kind: "gated", subject: "video" },
    });
    expect(validateFile({ name: "a.mp4", mime: "video/mp4", sizeBytes: 1_000 }, "plus").ok).toBe(true);
  });
});

describe("validateText and links", () => {
  it("limits text to 900 KB and gates it for free users", () => {
    expect(validateText("hello", "plus")).toEqual({ ok: true, mediaType: "text" });
    expect(validateText("hello", "free")).toEqual({ ok: false, issue: { kind: "gated", subject: "text" } });
    const big = "a".repeat(900_001);
    expect(validateText(big, "plus").ok).toBe(false);
  });

  it("allows links on Plus only", () => {
    expect(linkAllowed("plus")).toBe(true);
    expect(linkAllowed("free")).toBe(false);
  });
});

const ALL = { image: true, audio: true, video: true, text: true, social: true } as const;

describe("capabilities", () => {
  it("explains a switched-off kind before size or Plus checks", () => {
    const noVideo = { ...ALL, video: false };
    expect(validateFile({ name: "big.mp4", mime: "video/mp4", sizeBytes: 999_000_000 }, "free", noVideo)).toEqual({
      ok: false,
      issue: { kind: "unavailable", subject: "video" },
    });
    expect(validateFile({ name: "a.jpg", mime: "image/jpeg", sizeBytes: 10 }, "plus", noVideo).ok).toBe(true);
  });

  it("covers pasted text and links", () => {
    expect(validateText("hello", "plus", { ...ALL, text: false })).toEqual({ ok: false, issue: { kind: "unavailable", subject: "text" } });
    expect(validateLink(SOCIAL_PLATFORMS[0], "plus", { ...ALL, social: false })).toEqual({
      ok: false,
      issue: { kind: "unavailable", subject: "social" },
    });
  });
});

describe("validateLink", () => {
  it("accepts RD's platforms and refuses other sites before any request", () => {
    expect(validateLink(SOCIAL_PLATFORMS[0], "plus")).toEqual({ ok: true });
    expect(validateLink(null, "plus")).toEqual({ ok: false, issue: { kind: "unsupported", subject: "link" } });
    expect(validateLink(SOCIAL_PLATFORMS[0], "free")).toEqual({ ok: false, issue: { kind: "gated", subject: "link" } });
  });
});

describe("detectMediaType", () => {
  it("uses the extension only when the browser gives no MIME type", () => {
    expect(detectMediaType("memo.m4a", "")).toBe("audio");
    expect(detectMediaType("song.flac", "application/octet-stream")).toBe("audio");
    expect(detectMediaType("clip.mov", "video/quicktime")).toBe("video");
    expect(detectMediaType("notes.pdf", "")).toBeNull();
    expect(detectMediaType("a.jpg", "application/pdf")).toBeNull();
  });

  it("validates every RD format within its limits", () => {
    const files: [string, string, number][] = [
      ["a.gif", "image/gif", 50_000_000],
      ["a.webp", "image/webp", 1],
      ["a.alac", "", 20_000_000],
      ["a.ogg", "audio/ogg", 1],
      ["a.mov", "video/quicktime", 250_000_000],
      ["a.txt", "text/plain", 900_000],
    ];
    for (const [name, mime, sizeBytes] of files) {
      expect(validateFile({ name, mime, sizeBytes, durationSec: 60 }, "plus").ok, name).toBe(true);
    }
    expect(validateFile({ name: "long.mp4", mime: "video/mp4", sizeBytes: 1, durationSec: 30 * 60 + 1 }, "plus")).toMatchObject({
      ok: false,
      issue: { kind: "too_long", limitSec: 1800 },
    });
  });
});
