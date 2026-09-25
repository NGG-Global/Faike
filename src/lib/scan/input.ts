import { CAPABILITIES, type Capabilities, type Capability } from "@/config/capabilities";
import { LINKS_FREE_TIER, MEDIA, MEDIA_TYPES } from "@/config/media";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/config/platforms";
import type { Plan } from "@/lib/plan";
import type { MediaType } from "./types";

/*
 * Classification and validation of the universal input (HANDOFF §6.3,
 * §6.5, §9.3). Runs in the browser before anything is uploaded; the server
 * validates again once Reality Defender is integrated.
 */

export function mediaTypeForMime(mime: string): MediaType | null {
  const value = mime.toLowerCase();
  if (!value) return null;
  return (
    MEDIA_TYPES.find((type) =>
      MEDIA[type].mimeFamilies.some((family) => (family.endsWith("/") ? value.startsWith(family) : value === family)),
    ) ?? null
  );
}

export type PasteInput =
  | { kind: "empty" }
  | { kind: "link"; url: string; platform: SocialPlatform | null; handle?: string }
  | { kind: "text"; text: string };

const SCHEME = /^https?:\/\//i;
// A bare host with a path, such as "tiktok.com/@name/video/1".
const BARE_LINK = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/\S*$/i;

/** HANDOFF §6.5: a URL is treated as a social link, anything else as text. */
export function classifyPaste(value: string): PasteInput {
  const trimmed = value.trim();
  if (!trimmed) return { kind: "empty" };
  if (!/\s/.test(trimmed) && (SCHEME.test(trimmed) || BARE_LINK.test(trimmed))) {
    try {
      const url = new URL(SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`);
      if (url.hostname.includes(".")) {
        return { kind: "link", url: url.toString(), platform: detectPlatform(url), handle: extractHandle(url) };
      }
    } catch {
      // Not a URL: fall through to text.
    }
  }
  return { kind: "text", text: value };
}

export function detectPlatform(url: URL): SocialPlatform | null {
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|vm\.)/, "");
  return SOCIAL_PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? null;
}

/** "@name" when the link's path names an account that way. */
export function extractHandle(url: URL): string | undefined {
  const segment = url.pathname.split("/").find((part) => part.startsWith("@") && part.length > 1);
  return segment ? decodeURIComponent(segment) : undefined;
}

/** Truncated display form: "tiktok.com/@citybeat…". */
export function displayUrl(url: string, max = 28): string {
  const stripped = url.replace(SCHEME, "").replace(/^www\./, "");
  return stripped.length > max ? `${stripped.slice(0, max - 1)}…` : stripped;
}

export type ValidationIssue =
  /** `subject`: the category was recognised but this format or site is not accepted. */
  | { kind: "unsupported"; subject?: MediaType | "link" }
  /** The category is switched off for this deployment (capabilities.ts). */
  | { kind: "unavailable"; subject: Capability }
  | { kind: "too_large"; mediaType: MediaType; limitBytes: number; sizeBytes: number }
  | { kind: "too_long"; mediaType: MediaType; limitSec: number; durationSec: number }
  | { kind: "gated"; subject: MediaType | "link" };

export type Validation = { ok: true; mediaType: MediaType } | { ok: false; issue: ValidationIssue };

export interface FileFacts {
  name: string;
  mime: string;
  sizeBytes: number;
  durationSec?: number;
}

/** Lower-case extension without the dot, or undefined. */
export function fileExtension(fileName: string): string | undefined {
  const dot = fileName.lastIndexOf(".");
  if (dot === -1 || dot === fileName.length - 1) return undefined;
  return fileName.slice(dot + 1).trim().toLowerCase();
}

export function mediaTypeForExtension(extension: string): MediaType | null {
  return MEDIA_TYPES.find((type) => MEDIA[type].extensions.includes(extension)) ?? null;
}

/** Browsers report some audio files with no MIME type, or a generic one. */
const UNTYPED = new Set(["", "application/octet-stream"]);

/** The category from the MIME family, or from the extension when the browser gives no MIME type. */
export function detectMediaType(name: string, mime: string): MediaType | null {
  const type = mime.toLowerCase();
  return mediaTypeForMime(type) ?? (UNTYPED.has(type) ? mediaTypeForExtension(fileExtension(name) ?? "") : null);
}

/**
 * Runs in the browser before anything is uploaded, with the same config the
 * server enforces. Order (HANDOFF §9.4): category, availability, format,
 * size, duration, then the Plus gate.
 */
export function validateFile(file: FileFacts, plan: Plan, capabilities: Capabilities = CAPABILITIES): Validation {
  const extension = fileExtension(file.name) ?? "";
  const mediaType = detectMediaType(file.name, file.mime);
  if (!mediaType) return { ok: false, issue: { kind: "unsupported" } };
  if (!capabilities[mediaType]) return { ok: false, issue: { kind: "unavailable", subject: mediaType } };
  const config = MEDIA[mediaType];
  if (!config.extensions.includes(extension)) return { ok: false, issue: { kind: "unsupported", subject: mediaType } };
  if (file.sizeBytes > config.maxBytes) {
    return { ok: false, issue: { kind: "too_large", mediaType, limitBytes: config.maxBytes, sizeBytes: file.sizeBytes } };
  }
  if (config.maxDurationSec !== undefined && file.durationSec !== undefined && file.durationSec > config.maxDurationSec) {
    return {
      ok: false,
      issue: { kind: "too_long", mediaType, limitSec: config.maxDurationSec, durationSec: file.durationSec },
    };
  }
  if (!config.freeTier && plan !== "plus") return { ok: false, issue: { kind: "gated", subject: mediaType } };
  return { ok: true, mediaType };
}

export function textByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Pasted text is sent as a .txt file, so it follows the text limits. */
export function validateText(text: string, plan: Plan, capabilities: Capabilities = CAPABILITIES): Validation {
  if (!capabilities.text) return { ok: false, issue: { kind: "unavailable", subject: "text" } };
  const sizeBytes = textByteLength(text);
  if (sizeBytes > MEDIA.text.maxBytes) {
    return { ok: false, issue: { kind: "too_large", mediaType: "text", limitBytes: MEDIA.text.maxBytes, sizeBytes } };
  }
  if (!MEDIA.text.freeTier && plan !== "plus") return { ok: false, issue: { kind: "gated", subject: "text" } };
  return { ok: true, mediaType: "text" };
}

/** A link must come from one of RD's platforms; size limits apply to the retrieved media, on RD's side. */
export function validateLink(
  platform: SocialPlatform | null,
  plan: Plan,
  capabilities: Capabilities = CAPABILITIES,
): { ok: true } | { ok: false; issue: ValidationIssue } {
  if (!capabilities.social) return { ok: false, issue: { kind: "unavailable", subject: "social" } };
  if (!platform) return { ok: false, issue: { kind: "unsupported", subject: "link" } };
  if (!linkAllowed(plan)) return { ok: false, issue: { kind: "gated", subject: "link" } };
  return { ok: true };
}

/** Links are gated before retrieval; size limits apply to the retrieved media. */
export function linkAllowed(plan: Plan): boolean {
  return LINKS_FREE_TIER || plan === "plus";
}
