import { describe, expect, it } from "vitest";
import { isRequestId, parsePresignRequest, parseSocialRequest } from "./api-input";
import { fileExtension } from "./input";

describe("parsePresignRequest", () => {
  const valid = { fileName: "Beach Sunset.JPG", mimeType: "image/jpeg", sizeBytes: 222_708 };

  it("accepts a supported file and reports its media type and extension", () => {
    expect(parsePresignRequest(valid)).toEqual({
      ok: true,
      value: { mediaType: "image", extension: "jpg", sizeBytes: 222_708 },
    });
  });

  it("accepts every extension RD documents", () => {
    for (const name of ["a.jpeg", "a.png", "a.gif", "a.webp", "a.mp3", "a.wav", "a.m4a", "a.aac", "a.ogg", "a.flac", "a.alac", "a.mp4", "a.mov", "a.txt"]) {
      expect(parsePresignRequest({ fileName: name, mimeType: "", sizeBytes: 10 }).ok, name).toBe(true);
    }
  });

  it("decides by extension when the MIME type is empty or generic", () => {
    expect(parsePresignRequest({ fileName: "clip.mov", mimeType: "", sizeBytes: 1 })).toMatchObject({
      ok: true,
      value: { mediaType: "video" },
    });
    expect(parsePresignRequest({ fileName: "memo.m4a", mimeType: "application/octet-stream", sizeBytes: 1 })).toMatchObject({
      ok: true,
      value: { mediaType: "audio" },
    });
  });

  it("refuses a MIME family that contradicts the extension", () => {
    expect(parsePresignRequest({ ...valid, mimeType: "video/mp4" })).toMatchObject({ ok: false, code: "unsupported" });
  });

  it("refuses extensions RD does not accept", () => {
    for (const fileName of ["clip.webm", "photo.heic", "doc.pdf", "noextension", "trailingdot."]) {
      expect(parsePresignRequest({ ...valid, fileName }), fileName).toMatchObject({ ok: false, code: "unsupported" });
    }
  });

  it("applies the size limit of the media type", () => {
    expect(parsePresignRequest({ fileName: "a.jpg", mimeType: "image/jpeg", sizeBytes: 50_000_000 }).ok).toBe(true);
    expect(parsePresignRequest({ fileName: "a.jpg", mimeType: "image/jpeg", sizeBytes: 50_000_001 })).toMatchObject({ ok: false, code: "too_large" });
    expect(parsePresignRequest({ fileName: "a.wav", mimeType: "audio/wav", sizeBytes: 20_000_001 })).toMatchObject({ ok: false, code: "too_large" });
    expect(parsePresignRequest({ fileName: "a.txt", mimeType: "text/plain", sizeBytes: 900_001 })).toMatchObject({ ok: false, code: "too_large" });
  });

  it("refuses malformed bodies", () => {
    const bad = [
      null,
      [],
      "a.jpg",
      {},
      { ...valid, fileName: "" },
      { ...valid, fileName: "   " },
      { ...valid, fileName: `${"a".repeat(252)}.jpg` },
      { ...valid, fileName: 42 },
      { ...valid, mimeType: undefined },
      { ...valid, sizeBytes: 0 },
      { ...valid, sizeBytes: -1 },
      { ...valid, sizeBytes: 1.5 },
      { ...valid, sizeBytes: "100" },
      { ...valid, sizeBytes: Number.NaN },
    ];
    for (const body of bad) {
      expect(parsePresignRequest(body), JSON.stringify(body)).toMatchObject({ ok: false, code: "invalid_request" });
    }
  });
});

describe("capabilities on the server", () => {
  const all = { image: true, audio: true, video: true, text: true, social: true } as const;

  it("refuses a switched-off kind before any RD call", () => {
    expect(parsePresignRequest({ fileName: "a.mp4", mimeType: "video/mp4", sizeBytes: 10 }, { ...all, video: false })).toMatchObject({
      ok: false,
      code: "disabled",
    });
    expect(parseSocialRequest({ url: "https://youtu.be/abc" }, { ...all, social: false })).toMatchObject({ ok: false, code: "disabled" });
    expect(parsePresignRequest({ fileName: "a.txt", mimeType: "text/plain", sizeBytes: 10 }, all).ok).toBe(true);
  });
});

describe("fileExtension", () => {
  it("returns the lower-case extension after the last dot", () => {
    expect(fileExtension("My.Holiday.MP4")).toBe("mp4");
    expect(fileExtension("none")).toBeUndefined();
    expect(fileExtension("dot.")).toBeUndefined();
  });
});

describe("parseSocialRequest", () => {
  it("accepts links from the platforms RD supports", () => {
    const links = [
      "https://www.tiktok.com/@citybeat/video/1",
      "https://vm.tiktok.com/abc/",
      "https://www.instagram.com/p/abc/",
      "https://x.com/someone/status/1",
      "https://twitter.com/someone/status/1",
      "https://www.youtube.com/watch?v=abc",
      "https://youtu.be/abc",
      "https://m.facebook.com/watch/?v=1",
      "https://www.threads.net/@someone/post/abc",
      "https://www.threads.com/@someone/post/abc",
      "http://www.youtube.com/watch?v=abc",
    ];
    for (const url of links) expect(parseSocialRequest({ url }).ok, url).toBe(true);
  });

  it("returns the parsed link and its platform", () => {
    expect(parseSocialRequest({ url: "  https://www.tiktok.com/@citybeat/video/1  " })).toMatchObject({
      ok: true,
      value: { url: "https://www.tiktok.com/@citybeat/video/1", platform: { id: "tiktok" } },
    });
  });

  it("refuses other hosts, look-alike hosts and non-web schemes", () => {
    const links = [
      "https://example.com/video",
      "https://tiktok.com.evil.example/video",
      "https://eviltiktok.com/video",
      "ftp://tiktok.com/video",
      "javascript:alert(1)",
      "https://user:pass@www.tiktok.com/video",
      "https://www.tiktok.com:8443/video",
    ];
    for (const url of links) expect(parseSocialRequest({ url }), url).toMatchObject({ ok: false, code: "unsupported" });
  });

  it("refuses malformed bodies", () => {
    for (const body of [null, {}, { url: 1 }, { url: "" }, { url: "not a link" }, { url: `https://youtu.be/${"a".repeat(2048)}` }]) {
      expect(parseSocialRequest(body), JSON.stringify(body)).toMatchObject({ ok: false, code: "invalid_request" });
    }
  });
});

describe("isRequestId", () => {
  it("accepts plain ids and refuses anything that could alter an upstream path", () => {
    expect(isRequestId("3f2b8c1e-5d4a-4e7b-9c1f-0a2b3c4d5e6f")).toBe(true);
    expect(isRequestId("abc_123")).toBe(true);
    for (const value of ["", "../media", "a/b", "a b", "a?b", "-abc", "a".repeat(129), 42, null]) {
      expect(isRequestId(value), String(value)).toBe(false);
    }
  });
});
