import { describe, expect, it } from "vitest";
import { homeIntro, issueCopy, notApplicableCopy, pastePrompt } from "./copy";

const ALL = { image: true, audio: true, video: true, text: true, social: true } as const;

describe("issueCopy", () => {
  it("states the limit for each kind in plain words", () => {
    expect(issueCopy({ kind: "too_large", mediaType: "image", limitBytes: 50_000_000, sizeBytes: 64_200_000 }).body).toBe(
      "Images can be up to 50 MB. This one is 64.2 MB. Try a smaller image.",
    );
    expect(issueCopy({ kind: "too_large", mediaType: "audio", limitBytes: 20_000_000, sizeBytes: 34_000_000 }).body).toBe(
      "Audio files can be up to 20 MB. This one is 34 MB. Try a shorter clip.",
    );
    expect(issueCopy({ kind: "too_large", mediaType: "video", limitBytes: 250_000_000, sizeBytes: 300_000_000 }).body).toBe(
      "Videos can be up to 250 MB. This one is 300 MB. Try a shorter clip.",
    );
    const text = issueCopy({ kind: "too_large", mediaType: "text", limitBytes: 900_000, sizeBytes: 1_200_000 }, { kind: "paste" });
    expect(text).toMatchObject({ title: "That text is over the limit", body: "Text can be up to 900 KB. This is 1.2 MB. Try a shorter piece." });
  });

  it("states the video length limit with the file's real length", () => {
    expect(issueCopy({ kind: "too_long", mediaType: "video", limitSec: 1800, durationSec: 1824 }).body).toBe(
      "Videos can be up to 30 minutes. This one is 30:24 long. Try a shorter clip.",
    );
  });

  it("names the accepted formats when the category is right but the format is not", () => {
    expect(issueCopy({ kind: "unsupported", subject: "image" })).toEqual({
      label: "Can't check this",
      title: "Faike can't check this type of photo",
      body: "Images can be JPG, JPEG, PNG, GIF or WEBP files.",
    });
    expect(issueCopy({ kind: "unsupported", subject: "video" }).body).toBe("Videos can be MP4 or MOV files.");
  });

  it("lists RD's platforms for a link from another site", () => {
    expect(issueCopy({ kind: "unsupported", subject: "link" }).body).toBe(
      "Faike checks links from TikTok, Instagram, X, YouTube, Facebook and Threads.",
    );
  });

  it("keeps the handoff's generic line, limited to what is switched on", () => {
    expect(issueCopy({ kind: "unsupported" }).body).toBe("Try a photo, audio, video or text file.");
    expect(issueCopy({ kind: "unsupported" }, undefined, { ...ALL, image: false, video: false }).body).toBe("Try an audio or text file.");
  });

  it("explains a switched-off kind and what is available instead", () => {
    expect(issueCopy({ kind: "unavailable", subject: "video" }, undefined, { ...ALL, video: false })).toEqual({
      label: "Not available",
      title: "Video checks aren't available right now",
      body: "Faike can check photos, audio and text at the moment.",
    });
    expect(issueCopy({ kind: "unavailable", subject: "social" }, undefined, { ...ALL, social: false }).body).toBe(
      "You can download the post and upload the file instead.",
    );
  });
});

describe("pastePrompt", () => {
  it("offers only what can be pasted", () => {
    expect(pastePrompt(ALL)?.placeholder).toBe("…or paste a link or some text");
    expect(pastePrompt({ ...ALL, text: false })?.placeholder).toBe("…or paste a link");
    expect(pastePrompt({ ...ALL, social: false })?.label).toBe("Paste some text");
    expect(pastePrompt({ ...ALL, social: false, text: false })).toBeNull();
  });
});

describe("notApplicableCopy", () => {
  it("has a sentence for each reason code RD documents, and a fallback", () => {
    for (const code of ["relevance", "duration", "detected", "cross-talk", "quality", "language"]) {
      expect(notApplicableCopy(code).known, code).toBe(true);
    }
    expect(notApplicableCopy("cross-talk")).toMatchObject({ reason: "multiple speakers were detected" });
    expect(notApplicableCopy("something-new")).toEqual({ reason: "there wasn't enough suitable material to analyze", known: false });
    expect(notApplicableCopy("constructor").known).toBe(false);
  });
});

describe("homeIntro", () => {
  it("is the handoff's sentence with everything on, and lists only what is on otherwise", () => {
    expect(homeIntro(ALL)).toBe("Photos, voice notes, videos, text or a link. Faike checks for signs of AI and tells you what it found, in plain words.");
    expect(homeIntro({ ...ALL, video: false, social: false })).toBe(
      "Photos, voice notes or text. Faike checks for signs of AI and tells you what it found, in plain words.",
    );
  });
});
