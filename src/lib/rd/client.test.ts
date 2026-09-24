import { describe, expect, it, vi } from "vitest";
import { createRdClient, readRdConfig } from "./client";
import { RdError } from "./errors";
import { imageDetail, PRESIGN_RESPONSE, REQUEST_ID, SIGNED_URL, SOCIAL_RESPONSE } from "./rd-responses.fixture";

const API_KEY = "test-key-not-real-0123456789";
const BASE_URL = "https://rd.example.test";

function reply(status: number, body?: unknown) {
  const text = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
  return new Response(text, { status, headers: { "Content-Type": "application/json" } });
}

/** A fetch stub answering each call with the next response (or throwing the next error). */
function fakeFetch(...answers: (Response | Error)[]) {
  return vi.fn<typeof fetch>(async () => {
    const next = answers.shift();
    if (!next) throw new Error("no more answers");
    if (next instanceof Error) throw next;
    return next;
  });
}

function client(fetch: typeof globalThis.fetch, timeoutMs?: number) {
  const sleep = vi.fn<(ms: number) => Promise<void>>(async () => undefined);
  return { rd: createRdClient({ apiKey: API_KEY, baseUrl: BASE_URL, fetch, sleep, timeoutMs }), sleep };
}

async function failureOf(promise: Promise<unknown>): Promise<RdError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RdError) return error;
    throw error;
  }
  throw new Error("expected a failure");
}

function networkError(code: string) {
  return new TypeError("fetch failed", { cause: Object.assign(new Error(code), { code }) });
}

describe("readRdConfig", () => {
  it("reads the key and base URL from the environment", () => {
    expect(
      readRdConfig({ REALITY_DEFENDER_API_KEY: ` ${API_KEY} `, REALITY_DEFENDER_API_BASE_URL: "https://api.prd.realitydefender.xyz/" }),
    ).toEqual({ apiKey: API_KEY, baseUrl: "https://api.prd.realitydefender.xyz" });
  });

  it("allows plain http only for a local stub", () => {
    expect(readRdConfig({ REALITY_DEFENDER_API_KEY: API_KEY, REALITY_DEFENDER_API_BASE_URL: "http://localhost:4010" }).baseUrl).toBe(
      "http://localhost:4010",
    );
  });

  it("refuses a missing or unsafe configuration", () => {
    const cases = [
      {},
      { REALITY_DEFENDER_API_KEY: API_KEY },
      { REALITY_DEFENDER_API_BASE_URL: BASE_URL },
      { REALITY_DEFENDER_API_KEY: "  ", REALITY_DEFENDER_API_BASE_URL: BASE_URL },
      { REALITY_DEFENDER_API_KEY: "two words", REALITY_DEFENDER_API_BASE_URL: BASE_URL },
      { REALITY_DEFENDER_API_KEY: API_KEY, REALITY_DEFENDER_API_BASE_URL: "http://rd.example.test" },
      { REALITY_DEFENDER_API_KEY: API_KEY, REALITY_DEFENDER_API_BASE_URL: "https://user:pw@rd.example.test" },
      { REALITY_DEFENDER_API_KEY: API_KEY, REALITY_DEFENDER_API_BASE_URL: "https://rd.example.test/?x=1" },
      { REALITY_DEFENDER_API_KEY: API_KEY, REALITY_DEFENDER_API_BASE_URL: "not a url" },
    ];
    for (const env of cases) {
      expect(() => readRdConfig(env), JSON.stringify(env)).toThrow(RdError);
    }
  });
});

describe("RD client requests", () => {
  it("requests a pre-signed upload with the documented call", async () => {
    const fetch = fakeFetch(reply(200, PRESIGN_RESPONSE));
    const { rd } = client(fetch);
    await expect(rd.requestPresignedUpload("f1.jpg")).resolves.toEqual({ response: { signedUrl: SIGNED_URL }, requestId: REQUEST_ID });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/files/aws-presigned`);
    expect(init).toMatchObject({ method: "POST", redirect: "manual", cache: "no-store", body: JSON.stringify({ fileName: "f1.jpg" }) });
    expect(init?.headers).toEqual({ "X-API-KEY": API_KEY, Accept: "application/json", "Content-Type": "application/json" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("accepts an upload URL on a local stub's own origin", async () => {
    const local = "http://localhost:4010";
    const signedUrl = `${local}/api/files/${REQUEST_ID}?token=abc`;
    const fetch = fakeFetch(reply(200, { ...PRESIGN_RESPONSE, response: { signedUrl } }));
    const rd = createRdClient({ apiKey: API_KEY, baseUrl: local, fetch, sleep: async () => undefined });
    await expect(rd.requestPresignedUpload("f.jpg")).resolves.toMatchObject({ response: { signedUrl } });
  });

  it("submits a social link with the documented call", async () => {
    const fetch = fakeFetch(reply(200, SOCIAL_RESPONSE));
    const { rd } = client(fetch);
    await expect(rd.submitSocialLink("https://youtu.be/abc")).resolves.toEqual({ requestId: REQUEST_ID });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/files/social`);
    expect(init?.body).toBe(JSON.stringify({ socialLink: "https://youtu.be/abc" }));
  });

  it("reads the media detail for a request", async () => {
    const fetch = fakeFetch(reply(200, imageDetail()));
    const { rd } = client(fetch);
    await expect(rd.getMediaDetail(REQUEST_ID)).resolves.toMatchObject({ requestId: REQUEST_ID, overallStatus: "FAKE" });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/media/users/${REQUEST_ID}`);
    expect(init).toMatchObject({ method: "GET", body: undefined });
    expect(init?.headers).toEqual({ "X-API-KEY": API_KEY, Accept: "application/json" });
  });

  it("never calls RD with an unsafe id, and never passes on another request's result", async () => {
    const fetch = fakeFetch(reply(200, imageDetail({ requestId: "someone-else" })));
    const { rd } = client(fetch);
    expect((await failureOf(rd.getMediaDetail("../pages"))).kind).toBe("not_found");
    expect(fetch).not.toHaveBeenCalled();
    expect((await failureOf(rd.getMediaDetail(REQUEST_ID))).kind).toBe("bad_response");
  });
});

describe("RD client failures", () => {
  it.each([
    [401, undefined, "unauthorized"],
    [403, undefined, "unauthorized"],
    [404, undefined, "not_found"],
    [400, { code: "invalid-request", response: "Bad" }, "rejected"],
    [422, undefined, "rejected"],
    [400, { code: "upload-limit-reached", response: "Limit" }, "quota"],
    [400, { code: "free-tier-not-allowed", response: "Free tier" }, "quota"],
    [429, undefined, "rate_limited"],
    [302, undefined, "upstream"],
    [418, undefined, "upstream"],
  ])("classifies HTTP %i as %s", async (status, body, kind) => {
    const { rd } = client(fakeFetch(reply(status, body)));
    expect((await failureOf(rd.requestPresignedUpload("f.jpg"))).kind).toBe(kind);
  });

  it("keeps RD's machine code for the server log, and nothing else from the body", async () => {
    const { rd } = client(fakeFetch(reply(400, { code: "upload-limit-reached", response: `detail for ${API_KEY}` })));
    const error = await failureOf(rd.requestPresignedUpload("f.jpg"));
    expect(error).toMatchObject({ kind: "quota", status: 400, upstreamCode: "upload-limit-reached" });
    expect(error.message).not.toContain(API_KEY);
    expect(error.message).not.toContain("detail");
  });

  it("reports a 2xx body that is not JSON as a bad response", async () => {
    const { rd } = client(fakeFetch(reply(200, "<html>oops</html>")));
    expect((await failureOf(rd.getMediaDetail(REQUEST_ID))).kind).toBe("bad_response");
  });

  it("uses a fixed message that never includes the key or upstream text", async () => {
    const { rd } = client(fakeFetch(reply(500, `internal detail ${API_KEY}`), reply(500), reply(500)));
    const error = await failureOf(rd.getMediaDetail(REQUEST_ID));
    expect(error.kind).toBe("upstream");
    expect(`${error.message} ${error.stack}`).not.toContain(API_KEY);
    expect(error.message).not.toContain("internal detail");
  });
});

describe("RD client timeouts and retries", () => {
  it("times out a call that does not answer", async () => {
    const hanging = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason))),
    );
    const { rd } = client(hanging, 5);
    expect((await failureOf(rd.getMediaDetail(REQUEST_ID))).kind).toBe("timeout");
    expect(hanging).toHaveBeenCalledTimes(3);
  });

  it("does not repeat a POST that timed out, since RD may have received it", async () => {
    const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    const fetch = fakeFetch(timeout, reply(200, SOCIAL_RESPONSE));
    const { rd } = client(fetch);
    expect((await failureOf(rd.submitSocialLink("https://youtu.be/abc"))).kind).toBe("timeout");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries a GET on gateway errors with back-off", async () => {
    const fetch = fakeFetch(reply(503), reply(502), reply(200, imageDetail()));
    const { rd, sleep } = client(fetch);
    await expect(rd.getMediaDetail(REQUEST_ID)).resolves.toMatchObject({ requestId: REQUEST_ID });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([400, 1200]);
  });

  it("gives up after three attempts", async () => {
    const fetch = fakeFetch(reply(504), reply(504), reply(504), reply(200, imageDetail()));
    const { rd } = client(fetch);
    expect((await failureOf(rd.getMediaDetail(REQUEST_ID))).kind).toBe("upstream");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("retries a POST only when RD certainly did not process it", async () => {
    const unavailable = fakeFetch(reply(503), reply(200, PRESIGN_RESPONSE));
    await expect(client(unavailable).rd.requestPresignedUpload("f.jpg")).resolves.toMatchObject({ requestId: REQUEST_ID });
    expect(unavailable).toHaveBeenCalledTimes(2);

    const refused = fakeFetch(networkError("ECONNREFUSED"), reply(200, PRESIGN_RESPONSE));
    await expect(client(refused).rd.requestPresignedUpload("f.jpg")).resolves.toMatchObject({ requestId: REQUEST_ID });
    expect(refused).toHaveBeenCalledTimes(2);

    const gateway = fakeFetch(reply(502), reply(200, SOCIAL_RESPONSE));
    expect((await failureOf(client(gateway).rd.submitSocialLink("https://youtu.be/abc"))).kind).toBe("upstream");
    expect(gateway).toHaveBeenCalledTimes(1);

    const reset = fakeFetch(networkError("ECONNRESET"), reply(200, SOCIAL_RESPONSE));
    expect((await failureOf(client(reset).rd.submitSocialLink("https://youtu.be/abc"))).kind).toBe("network");
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does not retry refusals", async () => {
    const fetch = fakeFetch(reply(401), reply(200, imageDetail()));
    expect((await failureOf(client(fetch).rd.getMediaDetail(REQUEST_ID))).kind).toBe("unauthorized");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
