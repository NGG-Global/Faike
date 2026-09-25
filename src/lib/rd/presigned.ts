import "server-only";
import { RdError } from "./errors";

/*
 * Fetches one of RD's pre-signed result files (aggregation.json, heat map
 * PNGs). The URL carries its own signature, so the RD key is never sent.
 * Only https URLs (or the configured API origin, for local stubs) are
 * fetched, redirects are refused, each read has a timeout and the body is
 * capped, so a bad or hostile link cannot make Faike's server wait or buffer
 * without limit. RD documents a 15-minute lifetime; an expired link answers
 * 403, reported as "unauthorized".
 */

const TIMEOUT_MS = 8_000;

export interface PresignedFetchOptions {
  fetch?: typeof fetch;
  /** The configured RD API origin; http is accepted only there (local stubs). */
  trustedOrigin?: string;
  timeoutMs?: number;
  maxBytes: number;
}

export async function fetchPresigned(url: string, options: PresignedFetchOptions): Promise<{ bytes: Uint8Array<ArrayBuffer>; contentType?: string }> {
  const { fetch: fetchImpl = fetch, trustedOrigin, timeoutMs = TIMEOUT_MS, maxBytes } = options;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new RdError("bad_response");
  }
  if (parsed.protocol !== "https:" && parsed.origin !== trustedOrigin) throw new RdError("bad_response");

  let response: Response;
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "error", cache: "no-store" });
  } catch (error) {
    const name = typeof error === "object" && error !== null ? (error as { name?: unknown }).name : undefined;
    throw new RdError(name === "TimeoutError" || name === "AbortError" ? "timeout" : "network");
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new RdError(response.status === 403 ? "unauthorized" : "upstream", { status: response.status });
  }
  if (Number(response.headers.get("content-length") ?? 0) > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new RdError("bad_response");
  }
  const contentType = response.headers.get("content-type") ?? undefined;
  return { bytes: await readCapped(response, maxBytes), contentType };
}

async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new RdError("bad_response");
    }
    chunks.push(value);
  }
  return new Uint8Array(Buffer.concat(chunks));
}
