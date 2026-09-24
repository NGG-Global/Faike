import type { IconName } from "@/components/ui/Icon";
import type { MediaType } from "@/lib/scan/types";

/*
 * Media configuration (HANDOFF §9.3). Limits and free-tier gating live here,
 * never in components.
 *
 * Limits and `extensions` match Reality Defender's AWS Presigned URL
 * documentation (checked 24 Sep 2026): images 50 MB, audio 20 MB, video
 * 250 MB and 30 minutes, text 900 KB. The byte limits use decimal megabytes,
 * which is equal to or stricter than RD's figures however RD counts them.
 *
 * `extensions` is the allow-list the server enforces before requesting an
 * upload URL (RD accepts a file by its extension). `mimeFamilies` only
 * classifies a file into a media type in the browser; it is not an
 * allow-list.
 */

export interface MediaConfig {
  /** Meta-line label: "Audio · 0:48 · 1.1 MB". */
  typeLabel: string;
  /** Sentence noun: "this voice note". */
  noun: string;
  /** Noun for "Try another …" after an unsuitable sample. */
  retryNoun: string;
  chipLabel: string;
  icon: IconName;
  maxBytes: number;
  maxDurationSec?: number;
  freeTier: boolean;
  mimeFamilies: readonly string[];
  /** Lower-case, without the dot. */
  extensions: readonly string[];
}

const MB = 1_000_000;

export const MEDIA: Record<MediaType, MediaConfig> = {
  image: {
    typeLabel: "Photo",
    noun: "photo",
    retryNoun: "photo",
    chipLabel: "Photos",
    icon: "image",
    maxBytes: 50 * MB,
    freeTier: true,
    mimeFamilies: ["image/"],
    extensions: ["jpg", "jpeg", "png", "gif", "webp"],
  },
  audio: {
    typeLabel: "Audio",
    noun: "voice note",
    retryNoun: "clip",
    chipLabel: "Audio",
    icon: "audio",
    maxBytes: 20 * MB,
    freeTier: true,
    mimeFamilies: ["audio/"],
    extensions: ["mp3", "wav", "m4a", "aac", "ogg", "flac", "alac"],
  },
  video: {
    typeLabel: "Video",
    noun: "video",
    retryNoun: "video",
    chipLabel: "Video",
    icon: "video",
    maxBytes: 250 * MB,
    maxDurationSec: 30 * 60,
    freeTier: false,
    mimeFamilies: ["video/"],
    extensions: ["mp4", "mov"],
  },
  text: {
    typeLabel: "Text",
    noun: "text",
    retryNoun: "text",
    chipLabel: "Text",
    icon: "text",
    maxBytes: 900_000,
    freeTier: false,
    mimeFamilies: ["text/plain"],
    extensions: ["txt"],
  },
};

export const MEDIA_TYPES: readonly MediaType[] = ["image", "audio", "video", "text"];

/** Social links are a Plus feature (HANDOFF §9.3). */
export const LINKS_FREE_TIER = false;

/** Passed to the file input so mobile pickers offer the right sources. */
export const FILE_INPUT_ACCEPT = MEDIA_TYPES.flatMap((type) =>
  MEDIA[type].mimeFamilies.map((family) => (family.endsWith("/") ? `${family}*` : family)),
).join(",");
