import { describe, expect, it, vi } from "vitest";
import { aggregationShapeLoggingEnabled, describeShape, fetchAggregation } from "./aggregation";
import { RdError } from "./errors";

const URL_OK = "https://mock-bucket.s3.amazonaws.com/aggregation.json?X-Amz-Signature=abc";

async function kindOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RdError) return error.kind;
    throw error;
  }
  return "ok";
}

describe("fetchAggregation", () => {
  it("fetches the pre-signed JSON without sending the RD key and without following redirects", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json({ chunks: [] }));
    await expect(fetchAggregation(URL_OK, { fetch })).resolves.toEqual({ chunks: [] });
    const [, init] = fetch.mock.calls[0];
    expect(init?.headers).toBeUndefined();
    expect(init).toMatchObject({ redirect: "error", cache: "no-store" });
  });

  it("refuses plain http unless it is the configured local origin", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json({}));
    expect(await kindOf(fetchAggregation("http://elsewhere.example/a.json", { fetch }))).toBe("bad_response");
    expect(await kindOf(fetchAggregation("http://localhost:4010/a.json", { fetch, trustedOrigin: "http://localhost:4010" }))).toBe("ok");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("caps the size, rejects broken JSON and reports an expired link", async () => {
    const big = vi.fn<typeof globalThis.fetch>(async () => new Response("x".repeat(2000)));
    expect(await kindOf(fetchAggregation(URL_OK, { fetch: big, maxBytes: 1000 }))).toBe("bad_response");
    const broken = vi.fn<typeof globalThis.fetch>(async () => new Response("{not json"));
    expect(await kindOf(fetchAggregation(URL_OK, { fetch: broken }))).toBe("bad_response");
    const expired = vi.fn<typeof globalThis.fetch>(async () => new Response("<Error>AccessDenied</Error>", { status: 403 }));
    expect(await kindOf(fetchAggregation(URL_OK, { fetch: expired }))).toBe("unauthorized");
  });
});

describe("describeShape", () => {
  it("keeps keys, types, lengths and numeric ranges, and no text, links or ids", () => {
    const shape = describeShape({
      chunks: [
        { start: 0, end: 2.5, label: "FAKE", note: "someone's words", url: "https://x.example/?sig=1" },
        { start: 2.5, end: 5, label: "AUTHENTIC", note: "more words", url: "https://x.example/?sig=2" },
      ],
      requestId: "3f2b8c1e-5d4a-4e7b-9c1f-0a2b3c4d5e6f",
      nested: { deep: { deeper: { deepest: { a: { b: { c: 1 } } } } } },
    });
    const text = JSON.stringify(shape);
    for (const leak of ["someone", "words", "x.example", "3f2b8c1e"]) expect(text).not.toContain(leak);
    expect(shape).toMatchObject({
      chunks: { array: 2, of: { start: "number", end: "number", label: "string:FAKE", note: "string", url: "string" }, ranges: { start: [0, 2.5], end: [2.5, 5] } },
      requestId: "string",
    });
    expect(text).toContain("…");
  });

  it("is off unless explicitly switched on", () => {
    expect(aggregationShapeLoggingEnabled({})).toBe(false);
    expect(aggregationShapeLoggingEnabled({ REALITY_DEFENDER_LOG_AGGREGATION_SHAPE: "1" })).toBe(true);
  });
});
