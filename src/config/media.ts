import type { IconName } from "@/components/ui/Icon";
import type { MediaType } from "@/lib/scan/types";

/*
 * Media configuration (HANDOFF §9.3). Limits and free-tier gating live here,
 * never in components. The limits are the handoff's and must be re-confirmed
 * against Reality Defender's documentation (HANDOFF §12.10).
 *
 * `mimeFamilies` classifies a file into a media type by its MIME type. It is
 * NOT an allow-list of formats: the accepted formats per type must come from
 * RD's documentation and are validated server-side once RD is integrated.
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
  },
};

export const MEDIA_TYPES: readonly MediaType[] = ["image", "audio", "video", "text"];

/** Social links are a Plus feature (HANDOFF §9.3). */
export const LINKS_FREE_TIER = false;

/** Passed to the file input so mobile pickers offer the right sources. */
export const FILE_INPUT_ACCEPT = MEDIA_TYPES.flatMap((type) =>
  MEDIA[type].mimeFamilies.map((family) => (family.endsWith("/") ? `${family}*` : family)),
).join(",");
