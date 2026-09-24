import type { InputSummary, MediaRef } from "@/lib/scan/job";
import type { MediaType } from "@/lib/scan/types";
import { SAMPLE_TEXT } from "./sample-text";

/*
 * MOCK bundled samples in /public/samples, generated for Faike (no
 * third-party media). Used by the example links (HANDOFF §6.6), the demo
 * fixtures and as the "retrieved" media for mock social links.
 */

export interface MediaSample {
  mediaType: Exclude<MediaType, "text">;
  url: string;
  posterUrl?: string;
  fileName: string;
  mime: string;
  sizeBytes: number;
  durationSec?: number;
  width?: number;
  height?: number;
}

export const SAMPLES = {
  photo: {
    mediaType: "image",
    url: "/samples/beach-sunset.jpg",
    fileName: "beach-sunset.jpg",
    mime: "image/jpeg",
    sizeBytes: 222_708,
    width: 1600,
    height: 1200,
  },
  voice: {
    mediaType: "audio",
    url: "/samples/voicenote_0923.wav",
    fileName: "voicenote_0923.wav",
    mime: "audio/wav",
    sizeBytes: 1_152_044,
    durationSec: 48,
  },
  video: {
    mediaType: "video",
    url: "/samples/street-clip.webm",
    posterUrl: "/samples/street-clip-poster.jpg",
    fileName: "street-clip.webm",
    mime: "video/webm",
    sizeBytes: 1_834_551,
    durationSec: 18,
    width: 960,
    height: 540,
  },
} as const satisfies Record<string, MediaSample>;

export type SampleId = keyof typeof SAMPLES;

/** Heat map overlay matching the image fixtures' regions. */
export const SAMPLE_HEATMAP_URL = "/samples/beach-sunset-heatmap.png";

export { SAMPLE_TEXT };

/** MOCK social links. The URLs are illustrative and never fetched. */
export const SAMPLE_LINKS = {
  tiktok: "https://www.tiktok.com/@citybeat/video/7419203846512",
  instagram: "https://www.instagram.com/p/faike-mock-post/",
  unsupported: "https://example.com/posts/1234",
} as const;

export function sampleSummary(sample: MediaSample): InputSummary {
  return {
    kind: "file",
    mediaType: sample.mediaType,
    fileName: sample.fileName,
    mime: sample.mime,
    sizeBytes: sample.sizeBytes,
    durationSec: sample.durationSec,
    width: sample.width,
    height: sample.height,
  };
}

/** Media facts of a sample "retrieved" from a link (no file name of its own). */
export function retrievedMedia(sample: MediaSample): Omit<InputSummary, "kind"> {
  return {
    mediaType: sample.mediaType,
    mime: sample.mime,
    sizeBytes: sample.sizeBytes,
    durationSec: sample.durationSec,
    width: sample.width,
    height: sample.height,
  };
}

export function sampleMedia(sample: MediaSample): MediaRef {
  return { src: sample.url, posterSrc: sample.posterUrl, persistent: true };
}

export function sampleForMedia(mediaType: Exclude<MediaType, "text">): MediaSample {
  return mediaType === "image" ? SAMPLES.photo : mediaType === "audio" ? SAMPLES.voice : SAMPLES.video;
}

/** Fetches a bundled sample as a File, as if the person had picked it. */
export async function loadSampleFile(sample: MediaSample): Promise<File> {
  const response = await fetch(sample.url);
  if (!response.ok) throw new Error(`Sample unavailable: ${sample.url}`);
  const blob = await response.blob();
  return new File([blob], sample.fileName, { type: sample.mime });
}
