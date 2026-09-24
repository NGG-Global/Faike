import "server-only";

/*
 * Failures talking to Reality Defender, classified so Route Handlers can
 * answer with a safe application error. Messages are fixed text: nothing
 * from RD's response body, the request URL or the credentials is copied
 * into them.
 */

export type RdErrorKind =
  /** API key or base URL missing or invalid. */
  | "not_configured"
  /** RD refused the credentials (401/403). */
  | "unauthorized"
  | "not_found"
  /** RD refused the input (400/422). */
  | "rejected"
  /** RD's plan or upload limits (400 with free-tier-not-allowed or upload-limit-reached). */
  | "quota"
  | "rate_limited"
  | "timeout"
  | "network"
  /** 5xx, a redirect or another unexpected status. */
  | "upstream"
  /** A 2xx response that is not the documented shape. */
  | "bad_response";

const MESSAGES: Record<RdErrorKind, string> = {
  not_configured: "Reality Defender is not configured.",
  unauthorized: "Reality Defender refused the credentials.",
  not_found: "Reality Defender has no such request.",
  rejected: "Reality Defender refused the request.",
  quota: "Reality Defender's plan or upload limit was reached.",
  rate_limited: "Reality Defender is rate limiting requests.",
  timeout: "Reality Defender did not respond in time.",
  network: "Reality Defender could not be reached.",
  upstream: "Reality Defender returned an unexpected status.",
  bad_response: "Reality Defender returned an unexpected response.",
};

export class RdError extends Error {
  readonly kind: RdErrorKind;
  /** Upstream HTTP status, for server logs only. */
  readonly status?: number;
  /** RD's machine code (e.g. "upload-limit-reached"), for server logs only. */
  readonly upstreamCode?: string;

  constructor(kind: RdErrorKind, details: { status?: number; upstreamCode?: string } = {}) {
    super(MESSAGES[kind]);
    this.name = "RdError";
    this.kind = kind;
    this.status = details.status;
    this.upstreamCode = details.upstreamCode;
  }
}
