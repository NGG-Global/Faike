import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  audioNotApplicableDetail,
  imageDetail,
  soundDetail,
  textDetail,
  videoWithSoundDetail,
  HEATMAP_URL,
  PRESIGN_RESPONSE,
  REQUEST_ID,
  SIGNED_URL,
  SOCIAL_RESPONSE,
} from "@/lib/rd/rd-responses.fixture";
import { GET as getExplainability } from "./[requestId]/explainability/route";
import { GET as getHeatmap } from "./[requestId]/heatmap/route";
import { GET as getScan } from "./[requestId]/route";
import { POST as presign } from "./presign/route";
import { POST as social } from "./social/route";

/*
 * Route Handlers end to end, with Reality Defender replaced by a fetch
 * stub. The key below is a placeholder; no test reaches the network.
 */

const API_KEY = "test-key-not-real-0123456789";
const BASE_URL = "https://rd.example.test";

function reply(status: number, body?: unknown) {
  return new Response(body === undefined ? "" : JSON.stringify(body), { status });
}

function stubRd(...answers: Response[]) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => {
    const next = answers.shift();
    if (!next) throw new Error("no more answers");
    return next;
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function post(path: string, body: unknown, contentType = "application/json") {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function scan(requestId: string) {
  return getScan(new Request(`http://localhost/api/scans/${requestId}`), { params: Promise.resolve({ requestId }) });
}

async function read(response: Response) {
  const text = await response.text();
  expect(text).not.toContain(API_KEY);
  return { status: response.status, cache: response.headers.get("cache-control"), body: JSON.parse(text) };
}

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv("REALITY_DEFENDER_API_KEY", API_KEY);
  vi.stubEnv("REALITY_DEFENDER_API_BASE_URL", BASE_URL);
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/scans/presign", () => {
  const file = { fileName: "Anna at the beach.JPG", mimeType: "image/jpeg", sizeBytes: 222_708 };

  it("returns only the request id and the upload URL", async () => {
    const fetch = stubRd(reply(200, PRESIGN_RESPONSE));
    const { status, cache, body } = await read(await presign(post("/api/scans/presign", file)));
    expect(status).toBe(200);
    expect(cache).toBe("no-store");
    expect(body).toEqual({ requestId: REQUEST_ID, uploadUrl: SIGNED_URL });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("hands the browser RD's live upload address on Faike's own domain while the upload proxy is on", async () => {
    const live = `https://api.prd.realitydefender.xyz/api/files/${REQUEST_ID}?token=eyJ.mock.token`;
    stubRd(reply(200, { ...PRESIGN_RESPONSE, response: { signedUrl: live } }));
    const { body } = await read(await presign(post("/api/scans/presign", file)));
    expect(body).toEqual({ requestId: REQUEST_ID, uploadUrl: `/rd-upload/${REQUEST_ID}?token=eyJ.mock.token` });
  });

  it("sends RD a random file name with the right extension, not the person's", async () => {
    const fetch = stubRd(reply(200, PRESIGN_RESPONSE));
    await presign(post("/api/scans/presign", file));
    const sent = JSON.parse(String(fetch.mock.calls[0][1]?.body));
    expect(sent.fileName).toMatch(/^[0-9a-f-]{36}\.jpg$/);
  });

  it("validates before contacting RD", async () => {
    const fetch = stubRd();
    const cases: [Request, number, string][] = [
      [post("/api/scans/presign", { ...file, fileName: "clip.webm", mimeType: "video/webm" }), 400, "unsupported"],
      [post("/api/scans/presign", { ...file, sizeBytes: 60_000_000 }), 400, "too_large"],
      [post("/api/scans/presign", { ...file, sizeBytes: "big" }), 400, "invalid_request"],
      [post("/api/scans/presign", "{not json"), 400, "invalid_request"],
      [post("/api/scans/presign", file, "text/plain"), 415, "invalid_request"],
      [post("/api/scans/presign", { ...file, padding: "x".repeat(9000) }), 413, "invalid_request"],
    ];
    for (const [request, expectedStatus, code] of cases) {
      const { status, body } = await read(await presign(request));
      expect([status, body.error.code]).toEqual([expectedStatus, code]);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports a missing configuration as unavailable, without saying why", async () => {
    vi.stubEnv("REALITY_DEFENDER_API_KEY", "");
    const fetch = stubRd();
    const { status, body } = await read(await presign(post("/api/scans/presign", file)));
    expect(status).toBe(503);
    expect(body).toEqual({ error: { code: "unavailable", message: "Checks are unavailable right now. Try again later." } });
    expect(JSON.stringify(body)).not.toMatch(/REALITY_DEFENDER|key|configur/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("hides credential problems and logs a safe summary only", async () => {
    stubRd(reply(401, { code: "unauthorized", response: "Invalid API key" }));
    const { status, body } = await read(await presign(post("/api/scans/presign", file)));
    expect(status).toBe(503);
    expect(body.error.code).toBe("unavailable");
    expect(JSON.stringify(body)).not.toMatch(/api key|credential|401/i);
    expect(logged).toHaveBeenCalledWith("[rd] presign failed", { kind: "unauthorized", status: 401, code: undefined });
    expect(JSON.stringify(logged.mock.calls)).not.toContain(API_KEY);
  });
});

describe("POST /api/scans/social", () => {
  it("returns the request id for a supported link", async () => {
    const fetch = stubRd(reply(200, SOCIAL_RESPONSE));
    const { status, body } = await read(await social(post("/api/scans/social", { url: "https://www.tiktok.com/@citybeat/video/1" })));
    expect(status).toBe(200);
    expect(body).toEqual({ requestId: REQUEST_ID });
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ socialLink: "https://www.tiktok.com/@citybeat/video/1" });
  });

  it("refuses links from other sites without contacting RD", async () => {
    const fetch = stubRd();
    const { status, body } = await read(await social(post("/api/scans/social", { url: "https://example.com/v" })));
    expect([status, body.error.code]).toEqual([400, "unsupported"]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("passes on RD refusing a link as rejected", async () => {
    stubRd(reply(400, { code: "invalid-link", response: "Could not process" }));
    const { status, body } = await read(await social(post("/api/scans/social", { url: "https://youtu.be/abc" })));
    expect([status, body.error.code]).toEqual([422, "rejected"]);
  });
});

describe("GET /api/scans/[requestId]", () => {
  it("returns the analysis in Faike's terms, without RD's account data", async () => {
    stubRd(reply(200, imageDetail()));
    const { status, cache, body } = await read(await scan(REQUEST_ID));
    expect(status).toBe(200);
    expect(cache).toBe("no-store");
    expect(body).toMatchObject({ requestId: REQUEST_ID, state: "complete", analysis: { verdict: "artificial", ensembleScore: 0.87 } });
    expect(JSON.stringify(body)).not.toMatch(/mock-user-id|mock-institution-id|holiday-photo|storageLocation|aggregation/);
  });

  it("returns non-verdict results with their reasons", async () => {
    stubRd(reply(200, audioNotApplicableDetail()));
    const { body } = await read(await scan(REQUEST_ID));
    expect(body.analysis).toMatchObject({ verdict: "not_applicable", notApplicableReasons: ["cross-talk"] });
  });

  it("answers 404 for an unsafe id without contacting RD", async () => {
    const fetch = stubRd();
    const { status, body } = await read(await scan("..%2Fpages"));
    expect([status, body.error.code]).toEqual([404, "not_found"]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [404, "not_found", 404],
    [429, "rate_limited", 429],
    [403, "unavailable", 503],
  ])("maps RD %i to %s", async (upstream, code, expected) => {
    stubRd(reply(upstream));
    const { status, body } = await read(await scan(REQUEST_ID));
    expect([status, body.error.code]).toEqual([expected, code]);
  });

  it("maps an unexpected RD response to a generic upstream error", async () => {
    stubRd(reply(200, ["not", "an", "object"]));
    const { status, body } = await read(await scan(REQUEST_ID));
    expect([status, body.error.code]).toEqual([502, "upstream_error"]);
  });
});

describe("GET /api/scans/[requestId]: a video's separate sound check", () => {
  it("reads the audio request and reports its verdict beside the overall one", async () => {
    const fetch = stubRd(reply(200, videoWithSoundDetail()), reply(200, soundDetail("FAKE")));
    const { body } = await read(await scan(REQUEST_ID));
    expect(body.analysis).toMatchObject({ verdict: "suspicious", sound: { verdict: "artificial" } });
    expect(String(fetch.mock.calls[1][0])).toContain("/api/media/users/7c1d2e3f-4a5b-4c6d-8e9f-a0b1c2d3e4f5");
    expect(JSON.stringify(body)).not.toMatch(/aggregation|thumb\.jpg|audioRequestId/);
  });

  it("still answers with the overall result when the sound check cannot be read", async () => {
    stubRd(reply(200, videoWithSoundDetail()), reply(404));
    const { status, body } = await read(await scan(REQUEST_ID));
    expect(status).toBe(200);
    expect(body.analysis.verdict).toBe("suspicious");
    expect(body.analysis).not.toHaveProperty("sound");
  });
});

describe("GET /api/scans/[requestId]/explainability", () => {
  function explain(requestId: string) {
    return getExplainability(new Request(`http://localhost/api/scans/${requestId}/explainability`), { params: Promise.resolve({ requestId }) });
  }

  it("redirects to the fresh link from a new read of the media detail, every time", async () => {
    const fetch = stubRd(
      reply(200, textDetail({ explainabilityUrl: "https://mock-bucket.s3.amazonaws.com/e.html?sig=first" })),
      reply(200, textDetail({ explainabilityUrl: "https://mock-bucket.s3.amazonaws.com/e.html?sig=second" })),
    );
    const first = await explain(REQUEST_ID);
    const second = await explain(REQUEST_ID);
    expect(first.status).toBe(302);
    expect(first.headers.get("location")).toBe("https://mock-bucket.s3.amazonaws.com/e.html?sig=first");
    expect(second.headers.get("location")).toBe("https://mock-bucket.s3.amazonaws.com/e.html?sig=second");
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect(first.headers.get("referrer-policy")).toBe("no-referrer");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("answers 404 when there is no explanation, or for another media type", async () => {
    stubRd(reply(200, textDetail({ explainabilityUrl: "" })), reply(200, imageDetail({ explainabilityUrl: "https://mock.example/x.html" })));
    expect((await explain(REQUEST_ID)).status).toBe(404);
    expect((await explain(REQUEST_ID)).status).toBe(404);
  });

  it("refuses an unsafe id without contacting RD", async () => {
    const fetch = stubRd();
    expect((await explain("..%2Fx")).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("GET /api/scans/[requestId]/heatmap", () => {
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

  function heatmap(requestId: string, model: string | null = "mock-img-a") {
    const query = model === null ? "" : `?model=${encodeURIComponent(model)}`;
    return getHeatmap(new Request(`http://localhost/api/scans/${requestId}/heatmap${query}`), { params: Promise.resolve({ requestId }) });
  }

  function png(bytes: Uint8Array<ArrayBuffer> = PNG) {
    return new Response(bytes, { status: 200, headers: { "Content-Type": "image/png" } });
  }

  it("serves the detector's PNG from Faike's origin, read through a fresh storage link each time", async () => {
    const fresh = `${HEATMAP_URL}&sig=second`;
    const fetch = stubRd(
      reply(200, imageDetail()),
      png(),
      reply(200, imageDetail({ heatmaps: { "mock-img-a": fresh } })),
      png(),
    );
    const first = await heatmap(REQUEST_ID);
    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toBe("image/png");
    expect(first.headers.get("cache-control")).toBe("private, no-store");
    expect(first.headers.get("x-content-type-options")).toBe("nosniff");
    expect(first.headers.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(new Uint8Array(await first.arrayBuffer())).toEqual(PNG);
    await heatmap(REQUEST_ID);

    const [detail, storage, , freshStorage] = fetch.mock.calls;
    expect(String(detail[0])).toBe(`${BASE_URL}/api/media/users/${REQUEST_ID}`);
    expect(String(storage[0])).toBe(HEATMAP_URL);
    expect(String(freshStorage[0])).toBe(fresh);
    // The storage link is signed on its own; the RD key never goes with it.
    expect(JSON.stringify(storage[1]?.headers ?? {})).not.toContain(API_KEY);
    expect(storage[1]?.redirect).toBe("error");
  });

  it("answers 404 for a detector without a usable heat map, an authentic result or a missing name", async () => {
    stubRd(reply(200, imageDetail()), reply(200, imageDetail({ overallStatus: "AUTHENTIC", resultsSummary: { status: "AUTHENTIC" } })));
    expect((await heatmap(REQUEST_ID, "mock-img-b")).status).toBe(404);
    expect((await heatmap(REQUEST_ID)).status).toBe(404);
    const fetch = stubRd();
    expect((await heatmap(REQUEST_ID, null)).status).toBe(404);
    expect((await heatmap("..%2Fx")).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("answers a gateway error, never a broken image, when the link has expired or the file is not a PNG", async () => {
    stubRd(reply(200, imageDetail()), new Response("<Error>AccessDenied</Error>", { status: 403 }));
    const expired = await heatmap(REQUEST_ID);
    expect(expired.status).toBe(503);
    stubRd(reply(200, imageDetail()), png(new TextEncoder().encode("<html>not a png</html>")));
    const html = await heatmap(REQUEST_ID);
    expect(html.status).toBe(502);
    expect(await html.text()).not.toContain("not a png");
  });
});

describe("aggregation shape logging (development aid)", () => {
  it("logs keys and types only, and only when switched on", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    stubRd(reply(200, imageDetail()));
    await scan(REQUEST_ID);
    expect(info).not.toHaveBeenCalled();

    vi.stubEnv("REALITY_DEFENDER_LOG_AGGREGATION_SHAPE", "1");
    stubRd(reply(200, imageDetail()), reply(200, { bboxes: [{ x: 1, y: 2, label: "private text" }] }));
    await scan(REQUEST_ID);
    const logged = JSON.stringify(info.mock.calls);
    expect(logged).toContain("bboxes");
    expect(logged).not.toMatch(/private text|mock-bucket|X-Amz/);
  });
});
