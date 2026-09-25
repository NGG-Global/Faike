import { CAPABILITIES, type Capabilities } from "@/config/capabilities";
import { MEDIA } from "@/config/media";
import type { SocialPlatform } from "@/config/platforms";
import { isRecord } from "@/lib/guards";
import type { ApiErrorCode } from "./api";
import { detectPlatform, fileExtension, mediaTypeForExtension, mediaTypeForMime } from "./input";
import type { MediaType } from "./types";

/*
 * Validation of request bodies sent to Faike's scan Route Handlers. The
 * server runs it before contacting Reality Defender; it is pure, so the
 * browser can reuse it when the interface is connected.
 */

export type Parsed<T> = { ok: true; value: T } | { ok: false; code: ApiErrorCode; message: string };

const MAX_FILE_NAME_LENGTH = 255;
const MAX_MIME_LENGTH = 255;
const MAX_URL_LENGTH = 2048;

/**
 * Faike's own limit on request ids, applied to the path parameter and to
 * every id RD returns, so an id is never placed in an upstream URL unless it
 * is plain. RD documents no format; revisit if real ids fall outside this.
 */
const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function isRequestId(value: unknown): value is string {
  return typeof value === "string" && REQUEST_ID.test(value);
}

function fail<T>(code: ApiErrorCode, message: string): Parsed<T> {
  return { ok: false, code, message };
}

export interface PresignInput {
  mediaType: MediaType;
  extension: string;
  sizeBytes: number;
}

export function parsePresignRequest(body: unknown, capabilities: Capabilities = CAPABILITIES): Parsed<PresignInput> {
  if (!isRecord(body)) return fail("invalid_request", "Expected a JSON object.");
  const { fileName, mimeType, sizeBytes } = body;

  if (typeof fileName !== "string" || fileName.trim() === "" || fileName.length > MAX_FILE_NAME_LENGTH) {
    return fail("invalid_request", `fileName must be a non-empty string of at most ${MAX_FILE_NAME_LENGTH} characters.`);
  }
  if (typeof mimeType !== "string" || mimeType.length > MAX_MIME_LENGTH) {
    return fail("invalid_request", "mimeType must be a string.");
  }
  if (typeof sizeBytes !== "number" || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
    return fail("invalid_request", "sizeBytes must be a positive whole number.");
  }

  const extension = fileExtension(fileName);
  const mediaType = extension ? mediaTypeForExtension(extension) : null;
  if (!extension || !mediaType) return fail("unsupported", "This file type is not supported.");
  if (!capabilities[mediaType]) return fail("disabled", `${MEDIA[mediaType].typeLabel} checks are switched off.`);

  // The extension decides, as it does for RD. A recognised MIME family that
  // disagrees with it is refused; an empty or generic MIME type is not.
  const mimeMediaType = mediaTypeForMime(mimeType.trim());
  if (mimeMediaType && mimeMediaType !== mediaType) {
    return fail("unsupported", "The file's type does not match its extension.");
  }

  if (sizeBytes > MEDIA[mediaType].maxBytes) return fail("too_large", "The file is over the size limit for its type.");

  return { ok: true, value: { mediaType, extension, sizeBytes } };
}

export interface SocialInput {
  url: string;
  platform: SocialPlatform;
}

export function parseSocialRequest(body: unknown, capabilities: Capabilities = CAPABILITIES): Parsed<SocialInput> {
  if (!capabilities.social) return fail("disabled", "Link checks are switched off.");
  if (!isRecord(body) || typeof body.url !== "string") return fail("invalid_request", "url must be a string.");
  const raw = body.url.trim();
  if (raw === "" || raw.length > MAX_URL_LENGTH) {
    return fail("invalid_request", `url must be a non-empty string of at most ${MAX_URL_LENGTH} characters.`);
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail("invalid_request", "url must be an absolute web address.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return fail("unsupported", "Only web links are supported.");
  if (url.username || url.password || url.port) return fail("unsupported", "This link is not supported.");

  const platform = detectPlatform(url);
  if (!platform) return fail("unsupported", "Links from this site are not supported.");
  return { ok: true, value: { url: url.href, platform } };
}
