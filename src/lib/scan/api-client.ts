import { POLLING } from "@/config/polling";
import { isRecord } from "@/lib/guards";
import {
  API_ERROR_CODES,
  type ApiErrorCode,
  type PresignRequest,
  type PresignResponse,
  type ScanStatusResponse,
  type SocialRequest,
  type SocialResponse,
} from "./api";
import { isRequestId } from "./api-input";
import type { Verdict } from "./types";

/*
 * Browser calls to Faike's scan Route Handlers, and the direct upload to
 * the URL they hand out. No credentials are involved: the Reality Defender
 * key stays on the server. Responses are checked before use, like any
 * other input.
 */

/** "network": no response at all (offline, blocked, or refused by CORS). */
export type ClientErrorCode = ApiErrorCode | "network";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: ClientErrorCode };

export function presignUpload(body: PresignRequest, signal: AbortSignal): Promise<ApiResult<PresignResponse>> {
  return call(
    "/api/scans/presign",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    signal,
    isPresignResponse,
  );
}

export function submitSocialLink(body: SocialRequest, signal: AbortSignal): Promise<ApiResult<SocialResponse>> {
  return call(
    "/api/scans/social",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    signal,
    (value): value is SocialResponse => isRecord(value) && isRequestId(value.requestId),
  );
}

export function getScanStatus(requestId: string, signal: AbortSignal): Promise<ApiResult<ScanStatusResponse>> {
  return call(`/api/scans/${encodeURIComponent(requestId)}`, { method: "GET" }, signal, isStatusResponse);
}

export type UploadOutcome = "ok" | "failed" | "aborted";

/**
 * PUTs the file body, and nothing else, to the upload URL. XMLHttpRequest
 * rather than fetch because only it reports upload progress.
 */
export function putFile(
  url: string,
  file: Blob,
  signal: AbortSignal,
  onProgress: (loaded: number, total: number) => void,
): Promise<UploadOutcome> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve("aborted");
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const settle = (outcome: UploadOutcome) => {
      signal.removeEventListener("abort", abort);
      resolve(outcome);
    };
    xhr.open("PUT", url);
    xhr.upload.onprogress = (event) => onProgress(event.loaded, event.lengthComputable ? event.total : file.size);
    xhr.onload = () => settle(xhr.status >= 200 && xhr.status < 300 ? "ok" : "failed");
    xhr.onerror = () => settle("failed");
    xhr.onabort = () => settle(signal.aborted ? "aborted" : "failed");
    signal.addEventListener("abort", abort, { once: true });
    xhr.send(file);
  });
}

async function call<T>(
  path: string,
  init: RequestInit,
  signal: AbortSignal,
  valid: (value: unknown) => value is T,
): Promise<ApiResult<T>> {
  // One request never outlives its own timeout or the caller's signal.
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, POLLING.requestTimeoutMs);

  try {
    const response = await fetch(path, { ...init, signal: controller.signal, cache: "no-store" });
    const body: unknown = await response.json().catch(() => undefined);
    if (response.ok) return valid(body) ? { ok: true, data: body } : { ok: false, code: "upstream_error" };
    return { ok: false, code: errorCode(body) };
  } catch {
    return { ok: false, code: timedOut ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

function errorCode(body: unknown): ClientErrorCode {
  const code = isRecord(body) && isRecord(body.error) ? body.error.code : undefined;
  return (API_ERROR_CODES as readonly unknown[]).includes(code) ? (code as ApiErrorCode) : "upstream_error";
}

function isPresignResponse(value: unknown): value is PresignResponse {
  return isRecord(value) && isRequestId(value.requestId) && typeof value.uploadUrl === "string" && value.uploadUrl !== "";
}

const VERDICTS: readonly unknown[] = ["authentic", "suspicious", "artificial", "not_applicable", "unable"] satisfies Verdict[];

function isStatusResponse(value: unknown): value is ScanStatusResponse {
  if (!isRecord(value) || !isRequestId(value.requestId)) return false;
  if (value.state === "processing" || value.state === "failed") return true;
  return (
    value.state === "complete" &&
    isRecord(value.analysis) &&
    VERDICTS.includes(value.analysis.verdict) &&
    Array.isArray(value.analysis.models)
  );
}
