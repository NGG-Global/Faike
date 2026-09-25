import "server-only";
import { isRecord, optString } from "@/lib/guards";
import { isRequestId } from "@/lib/scan/api-input";
import { RdError, type RdErrorKind } from "./errors";
import { parseMediaDetail, parsePresignedUploadResponse, parseSocialUploadResponse } from "./parse";
import type { RdMediaDetail, RdPresignedUploadResponse, RdSocialUploadResponse } from "./types";

/*
 * Server-side Reality Defender client. The only module that reads the API
 * key, and the only code that calls RD. Endpoints and headers follow RD's
 * documentation (checked 24 Sep 2026); the key travels in X-API-KEY.
 *
 * Every call has a per-attempt timeout. Retries use back-off and happen
 * only when repeating cannot duplicate work: GETs retry on timeouts,
 * network errors and 5xx gateway statuses; POSTs retry only when RD
 * certainly did not process the request (503, or no connection made).
 * Redirects are never followed, so the key cannot be forwarded elsewhere.
 */

const PATHS = {
  presignedUpload: "/api/files/aws-presigned",
  socialUpload: "/api/files/social",
  mediaDetail: "/api/media/users",
} as const;

const ATTEMPT_TIMEOUT_MS = 8_000;
const RETRY_DELAYS_MS = [400, 1_200] as const;
/** Network errors raised before a connection exists: the request was never sent. */
const NOT_SENT_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"]);
/** RD's 400 codes for plan limits (from the official SDK). */
const QUOTA_CODES = ["free-tier-not-allowed", "upload-limit-reached"];

export interface RdClientConfig {
  apiKey: string;
  baseUrl: string;
}

export interface RdClientOptions extends RdClientConfig {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
}

export interface RdClient {
  /** The configured API origin; pre-signed URLs there may be plain http (local stubs). */
  readonly origin: string;
  requestPresignedUpload(fileName: string): Promise<RdPresignedUploadResponse>;
  submitSocialLink(socialLink: string): Promise<RdSocialUploadResponse>;
  getMediaDetail(requestId: string): Promise<RdMediaDetail>;
}

type Env = Partial<Record<string, string>>;

/** Reads REALITY_DEFENDER_API_KEY and REALITY_DEFENDER_API_BASE_URL. */
export function readRdConfig(env: Env = process.env): RdClientConfig {
  const apiKey = env.REALITY_DEFENDER_API_KEY?.trim();
  const baseUrl = normaliseBaseUrl(env.REALITY_DEFENDER_API_BASE_URL);
  if (!apiKey || /\s/.test(apiKey) || !baseUrl) throw new RdError("not_configured");
  return { apiKey, baseUrl };
}

/** https only (http for a local stub), no credentials, query or fragment. */
function normaliseBaseUrl(value: string | undefined): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return undefined;
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return undefined;
  if (url.username || url.password || url.search || url.hash) return undefined;
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

export function rdClientFromEnv(): RdClient {
  return createRdClient(readRdConfig());
}

type Retry = "never" | "idempotent" | "always";
type Outcome = { ok: true; json: unknown } | { ok: false; error: RdError; retry: Retry };

export function createRdClient(options: RdClientOptions): RdClient {
  const fetchImpl = options.fetch ?? fetch;
  const trustedOrigin = new URL(options.baseUrl).origin;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = options.timeoutMs ?? ATTEMPT_TIMEOUT_MS;

  function failure(kind: RdErrorKind, retry: Retry, details?: { status?: number; upstreamCode?: string }): Outcome {
    return { ok: false, error: new RdError(kind, details), retry };
  }

  async function attempt(method: "GET" | "POST", path: string, body?: unknown): Promise<Outcome> {
    const headers: Record<string, string> = { "X-API-KEY": options.apiKey, Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let response: Response;
    try {
      response = await fetchImpl(`${options.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "manual",
        cache: "no-store",
      });
    } catch (error) {
      if (isTimeout(error)) return failure("timeout", "idempotent");
      return failure("network", notSent(error) ? "always" : "idempotent");
    }

    const status = response.status;
    if (response.ok) {
      try {
        return { ok: true, json: JSON.parse(await response.text()) };
      } catch (error) {
        return isTimeout(error) ? failure("timeout", "idempotent") : failure("bad_response", "never", { status });
      }
    }

    if (status === 400 || status === 422) {
      const upstreamCode = await readErrorCode(response);
      const quota = upstreamCode !== undefined && QUOTA_CODES.some((code) => upstreamCode.includes(code));
      return failure(quota ? "quota" : "rejected", "never", { status, upstreamCode });
    }
    await response.body?.cancel().catch(() => undefined);
    if (status === 401 || status === 403) return failure("unauthorized", "never", { status });
    if (status === 404) return failure("not_found", "never", { status });
    if (status === 429) return failure("rate_limited", "never", { status });
    if (status === 503) return failure("upstream", "always", { status });
    if (status === 408 || status === 500 || status === 502 || status === 504) {
      return failure("upstream", "idempotent", { status });
    }
    return failure("upstream", "never", { status });
  }

  async function request(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
    for (let index = 0; ; index++) {
      const outcome = await attempt(method, path, body);
      if (outcome.ok) return outcome.json;
      const retryable = outcome.retry === "always" || (outcome.retry === "idempotent" && method === "GET");
      if (!retryable || index >= RETRY_DELAYS_MS.length) throw outcome.error;
      await sleep(RETRY_DELAYS_MS[index]);
    }
  }

  return {
    origin: trustedOrigin,

    async requestPresignedUpload(fileName) {
      return parsePresignedUploadResponse(await request("POST", PATHS.presignedUpload, { fileName }), trustedOrigin);
    },

    async submitSocialLink(socialLink) {
      return parseSocialUploadResponse(await request("POST", PATHS.socialUpload, { socialLink }));
    },

    async getMediaDetail(requestId) {
      if (!isRequestId(requestId)) throw new RdError("not_found");
      const json = await request("GET", `${PATHS.mediaDetail}/${encodeURIComponent(requestId)}`);
      const detail = parseMediaDetail(json, trustedOrigin);
      // A result for a different request is never passed on.
      if (detail.requestId !== undefined && detail.requestId !== requestId) throw new RdError("bad_response");
      return detail;
    },
  };
}

/** AbortSignal.timeout rejects with a DOMException named "TimeoutError". */
function isTimeout(error: unknown): boolean {
  const name = typeof error === "object" && error !== null ? (error as { name?: unknown }).name : undefined;
  return name === "TimeoutError" || name === "AbortError";
}

function notSent(error: unknown): boolean {
  const cause = error instanceof Error ? (error.cause as { code?: unknown } | undefined) : undefined;
  return typeof cause?.code === "string" && NOT_SENT_CODES.has(cause.code);
}

/** RD's machine-readable `code` from an error body, if it is plain. */
async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const json: unknown = JSON.parse(await response.text());
    const code = isRecord(json) ? optString(json.code) : undefined;
    return code && /^[A-Za-z0-9_:-]{1,64}$/.test(code) ? code : undefined;
  } catch {
    return undefined;
  }
}
