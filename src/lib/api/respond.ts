import "server-only";
import { RdError, type RdErrorKind } from "@/lib/rd/errors";
import type { ApiErrorBody, ApiErrorCode } from "@/lib/scan/api";

/*
 * Response helpers for Faike's Route Handlers. Every response is marked
 * no-store: results carry short-lived pre-signed URLs and must not be
 * cached by browsers or the CDN. Upstream failures are logged as a safe
 * summary (operation, kind, status, RD's code) and answered with a generic
 * error; no key, URL, request id, file name or upstream text is logged or
 * returned.
 */

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 8 * 1024;

const STATUS: Record<ApiErrorCode, number> = {
  invalid_request: 400,
  unsupported: 400,
  too_large: 400,
  not_found: 404,
  rejected: 422,
  rate_limited: 429,
  timeout: 504,
  unavailable: 503,
  upstream_error: 502,
};

const MESSAGES: Record<ApiErrorCode, string> = {
  invalid_request: "The request is not valid.",
  unsupported: "This input is not supported.",
  too_large: "The file is over the size limit.",
  not_found: "No check was found with that id.",
  rejected: "The check service could not accept this input.",
  rate_limited: "Too many requests. Try again shortly.",
  timeout: "The check service did not respond in time. Try again.",
  unavailable: "Checks are unavailable right now. Try again later.",
  upstream_error: "The check service could not be reached. Try again.",
};

/** Reality Defender failure → what the browser is told. Credential and plan problems read as "unavailable". */
const FROM_RD: Record<RdErrorKind, ApiErrorCode> = {
  not_configured: "unavailable",
  unauthorized: "unavailable",
  quota: "unavailable",
  not_found: "not_found",
  rejected: "rejected",
  rate_limited: "rate_limited",
  timeout: "timeout",
  network: "upstream_error",
  upstream: "upstream_error",
  bad_response: "upstream_error",
};

export function json<T>(data: T, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

export function apiError(code: ApiErrorCode, message = MESSAGES[code], status = STATUS[code]): Response {
  return json<ApiErrorBody>({ error: { code, message } }, status);
}

export function upstreamFailure(operation: string, error: unknown): Response {
  if (error instanceof RdError) {
    if (error.kind !== "not_found") {
      console.error(`[rd] ${operation} failed`, { kind: error.kind, status: error.status, code: error.upstreamCode });
    }
    return apiError(FROM_RD[error.kind]);
  }
  console.error(`[rd] ${operation} failed unexpectedly`, { name: error instanceof Error ? error.name : typeof error });
  return apiError("upstream_error");
}

type Body = { ok: true; value: unknown } | { ok: false; response: Response };

/** A small JSON body. Requiring application/json also means a cross-site form cannot post here. */
export async function readJsonBody(request: Request): Promise<Body> {
  const type = request.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(type)) {
    return { ok: false, response: apiError("invalid_request", "Send JSON with Content-Type: application/json.", 415) };
  }
  const tooLarge = { ok: false, response: apiError("invalid_request", "The request body is too large.", 413) } as const;
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return tooLarge;

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return tooLarge;
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: apiError("invalid_request", "The request body is not valid JSON.") };
  }
}
