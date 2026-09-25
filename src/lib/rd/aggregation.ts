import "server-only";
import { isRecord } from "@/lib/guards";
import { RdError } from "./errors";

/*
 * RD's `aggregation.json` (modelMetadataUrl / audioModelMetadataUrl): the
 * data RD's own interface uses for boxes, timelines, scenes and audio
 * chunks. RD's Media Detail documentation (checked 25 Sep 2026) names only
 * its top-level keys:
 *   image  bboxes, conclusions, contextResult (optional)
 *   video  frame/timeline fields such as scenes, frames, tubes; models,
 *          ensembles, conclusions, contextResult (optional)
 *   audio  chunks, languages, conclusions, models, ensembles
 *   text   models, ensembles, conclusions
 * The fields inside them are not documented, and CLAUDE.md forbids guessing
 * field names, so Faike does not draw timelines or regions from this file
 * yet. This module fetches it safely and can describe its shape without any
 * values, so the real structure can be confirmed from one check (set
 * REALITY_DEFENDER_LOG_AGGREGATION_SHAPE=1) and then mapped explicitly.
 */

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 5_000_000;

export interface AggregationFetchOptions {
  fetch?: typeof fetch;
  /** The configured RD API origin; http is accepted only there (local stubs). */
  trustedOrigin?: string;
  timeoutMs?: number;
  maxBytes?: number;
}

/**
 * Fetches a pre-signed aggregation URL. The RD key is never sent (the URL
 * carries its own signature), redirects are refused, and the body is capped.
 */
export async function fetchAggregation(url: string, options: AggregationFetchOptions = {}): Promise<unknown> {
  const { fetch: fetchImpl = fetch, trustedOrigin, timeoutMs = TIMEOUT_MS, maxBytes = MAX_BYTES } = options;
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

  const text = await readCapped(response, maxBytes);
  try {
    return JSON.parse(text);
  } catch {
    throw new RdError("bad_response");
  }
}

async function readCapped(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
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
  return new TextDecoder().decode(Buffer.concat(chunks));
}

const ENUM_LIKE = /^[A-Z][A-Z0-9_]{1,31}$/;
const MAX_DEPTH = 6;
const MAX_KEYS = 60;
const RANGE_SAMPLE = 500;

/**
 * The shape of a JSON value with no content: keys, types, array lengths and
 * numeric ranges. Strings are reduced to "string" unless they look like an
 * enum code ("FAKE"), so no text, URL, id or name is ever included.
 */
export function describeShape(value: unknown, depth = 0): unknown {
  if (value === null) return "null";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return ENUM_LIKE.test(value) ? `string:${value}` : "string";
  if (depth >= MAX_DEPTH) return "…";
  if (Array.isArray(value)) {
    const shape: Record<string, unknown> = { array: value.length };
    if (value.length) shape.of = describeShape(value[0], depth + 1);
    const ranges = numericRanges(value.slice(0, RANGE_SAMPLE));
    if (ranges) shape.ranges = ranges;
    return shape;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value).slice(0, MAX_KEYS);
    return Object.fromEntries(entries.map(([key, child]) => [key.length <= 40 ? key : "<long key>", describeShape(child, depth + 1)]));
  }
  return typeof value;
}

/** Min and max of each numeric field across an array of objects, to reveal units (seconds, frames, 0–1). */
function numericRanges(items: unknown[]): Record<string, [number, number]> | undefined {
  const ranges: Record<string, [number, number]> = {};
  for (const item of items) {
    if (!isRecord(item)) continue;
    for (const [key, value] of Object.entries(item)) {
      if (typeof value !== "number" || !Number.isFinite(value) || key.length > 40) continue;
      const current = ranges[key];
      ranges[key] = current ? [Math.min(current[0], value), Math.max(current[1], value)] : [value, value];
    }
  }
  return Object.keys(ranges).length ? ranges : undefined;
}

/** Development aid only: off unless REALITY_DEFENDER_LOG_AGGREGATION_SHAPE=1. Not a secret. */
export function aggregationShapeLoggingEnabled(env: Partial<Record<string, string>> = process.env): boolean {
  return env.REALITY_DEFENDER_LOG_AGGREGATION_SHAPE === "1";
}
