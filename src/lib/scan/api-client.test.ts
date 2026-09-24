import { describe, expect, it, vi } from "vitest";
import { getScanStatus, presignUpload } from "./api-client";

function stubFetch(handler: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => handler(String(input), init));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const signal = () => new AbortController().signal;
const file = { fileName: "beach.jpg", mimeType: "image/jpeg", sizeBytes: 1000 };

describe("presignUpload", () => {
  it("posts the file facts as JSON and returns the upload details", async () => {
    const fetch = stubFetch(() => json(200, { requestId: "req-1", uploadUrl: "https://rd.example.test/api/files/req-1?token=t" }));
    await expect(presignUpload(file, signal())).resolves.toEqual({
      ok: true,
      data: { requestId: "req-1", uploadUrl: "https://rd.example.test/api/files/req-1?token=t" },
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/scans/presign");
    expect(init).toMatchObject({ method: "POST", body: JSON.stringify(file), cache: "no-store" });
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
  });

  it("passes on Faike's error code, and treats unknown codes and odd bodies as upstream errors", async () => {
    stubFetch(() => json(503, { error: { code: "unavailable", message: "x" } }));
    await expect(presignUpload(file, signal())).resolves.toEqual({ ok: false, code: "unavailable" });
    stubFetch(() => json(500, { error: { code: "something-new" } }));
    await expect(presignUpload(file, signal())).resolves.toEqual({ ok: false, code: "upstream_error" });
    stubFetch(() => json(200, { requestId: "../x", uploadUrl: "" }));
    await expect(presignUpload(file, signal())).resolves.toEqual({ ok: false, code: "upstream_error" });
  });

  it("reports no response at all as a network failure", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    await expect(presignUpload(file, signal())).resolves.toEqual({ ok: false, code: "network" });
  });

  it("times out a request that never answers", async () => {
    vi.useFakeTimers();
    stubFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))),
    );
    const pending = presignUpload(file, signal());
    await vi.advanceTimersByTimeAsync(35_000);
    await expect(pending).resolves.toEqual({ ok: false, code: "timeout" });
    vi.useRealTimers();
  });
});

describe("getScanStatus", () => {
  it("reads a status from Faike's route", async () => {
    const fetch = stubFetch(() => json(200, { requestId: "req-1", state: "processing", stage: "analysing" }));
    await expect(getScanStatus("req-1", signal())).resolves.toMatchObject({ ok: true, data: { state: "processing" } });
    expect(fetch.mock.calls[0][0]).toBe("/api/scans/req-1");
  });

  it("refuses a complete status without a known verdict", async () => {
    stubFetch(() => json(200, { requestId: "req-1", state: "complete", analysis: { verdict: "probably", models: [] } }));
    await expect(getScanStatus("req-1", signal())).resolves.toEqual({ ok: false, code: "upstream_error" });
  });
});
