import "server-only";
import { isRecord, optBoolean, optHttpsUrl, optNumber, optString } from "@/lib/guards";
import { isRequestId } from "@/lib/scan/api-input";
import { RdError } from "./errors";
import type {
  RdMediaDetail,
  RdModelResult,
  RdPresignedUploadResponse,
  RdResultsSummary,
  RdSocialUploadResponse,
  RdSummaryMetadata,
} from "./types";

/*
 * Runtime validation of Reality Defender responses. Required fields that
 * are missing or malformed throw RdError("bad_response"); optional fields
 * that are missing, null, renamed or of the wrong type are dropped, never
 * guessed.
 */

const CODE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_NAME_LENGTH = 200;

function optCode(value: unknown): string | undefined {
  const text = optString(value);
  return text && CODE.test(text) ? text : undefined;
}

function optStatus(value: unknown): string | undefined {
  return optCode(value)?.toUpperCase();
}

function optIsoDate(value: unknown): string | undefined {
  const text = optString(value);
  return text && Number.isFinite(Date.parse(text)) ? text : undefined;
}

function optName(value: unknown): string | undefined {
  const text = optString(value);
  return text && text.length <= MAX_NAME_LENGTH ? text : undefined;
}

export function parsePresignedUploadResponse(json: unknown): RdPresignedUploadResponse {
  if (!isRecord(json)) throw new RdError("bad_response");
  const signedUrl = isRecord(json.response) ? optHttpsUrl(json.response.signedUrl) : undefined;
  if (!isRequestId(json.requestId) || !signedUrl) throw new RdError("bad_response");
  return { response: { signedUrl }, requestId: json.requestId };
}

export function parseSocialUploadResponse(json: unknown): RdSocialUploadResponse {
  if (!isRecord(json) || !isRequestId(json.requestId)) throw new RdError("bad_response");
  return { requestId: json.requestId };
}

export function parseMediaDetail(json: unknown): RdMediaDetail {
  if (!isRecord(json)) throw new RdError("bad_response");
  return {
    requestId: optString(json.requestId),
    mediaType: optStatus(json.mediaType),
    overallStatus: optStatus(json.overallStatus),
    uploadedDate: optIsoDate(json.uploadedDate),
    socialLinkDownloaded: optBoolean(json.socialLinkDownloaded),
    socialLinkDownloadFailed: optBoolean(json.socialLinkDownloadFailed),
    resultsSummary: parseSummary(json.resultsSummary),
    models: Array.isArray(json.models) ? json.models.flatMap(parseModel) : [],
    heatmaps: parseHeatmaps(json.heatmaps),
  };
}

function parseSummary(value: unknown): RdResultsSummary | undefined {
  if (!isRecord(value)) return undefined;
  return {
    status: optStatus(value.status),
    metadata: parseMetadata(value.metadata),
    error: isRecord(value.error) ? { code: optCode(value.error.code) } : undefined,
  };
}

function parseMetadata(value: unknown): RdSummaryMetadata | undefined {
  if (!isRecord(value)) return undefined;
  const languages = Array.isArray(value.languages)
    ? value.languages.flatMap((language) => optName(language)?.toLowerCase() ?? [])
    : undefined;
  const reasons = Array.isArray(value.reasons)
    ? value.reasons.flatMap((reason) => {
        const code = isRecord(reason) ? optCode(reason.code) : undefined;
        return code ? [{ code }] : [];
      })
    : undefined;
  return { finalScore: optNumber(value.finalScore), languages, reasons };
}

function parseModel(value: unknown): RdModelResult[] {
  if (!isRecord(value)) return [];
  const name = optName(value.name);
  if (!name) return [];
  return [{ name, status: optStatus(value.status), finalScore: optNumber(value.finalScore), code: optCode(value.code) }];
}

function parseHeatmaps(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value).flatMap(([model, url]) => {
    const name = optName(model);
    const href = optHttpsUrl(url);
    return name && href ? [[name, href] as const] : [];
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
}
