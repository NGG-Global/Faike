import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScanStatusResponse } from "./api";

/*
 * The real image flow with Faike's routes and the direct upload replaced by
 * stubs: presign → PUT → poll → result, cancel, retry, and a newer check
 * replacing an older one. Virtual timers drive the polling.
 */

type Status = ScanStatusResponse | { error: string; status: number };

class FakeXHR {
  static puts: { url: string; body: unknown }[] = [];
  static fail = false;
  upload: { onprogress: ((event: { loaded: number; total: number; lengthComputable: boolean }) => void) | null } = { onprogress: null };
  status = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  private url = "";
  private aborted = false;
  open(_method: string, url: string) {
    this.url = url;
  }
  send(body: Blob) {
    FakeXHR.puts.push({ url: this.url, body });
    setTimeout(() => {
      if (this.aborted) return;
      if (FakeXHR.fail) return this.onerror?.();
      this.upload.onprogress?.({ loaded: body.size, total: body.size, lengthComputable: true });
      this.status = 200;
      this.onload?.();
    }, 50);
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
}

let presigns = 0;
let statusFor: (requestId: string, call: number) => Status;
const statusCalls: string[] = [];

function install() {
  presigns = 0;
  statusCalls.length = 0;
  FakeXHR.puts = [];
  FakeXHR.fail = false;
  vi.stubGlobal("XMLHttpRequest", FakeXHR);
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url === "/api/scans/presign") {
        presigns += 1;
        const requestId = `req-${presigns}`;
        return Response.json({ requestId, uploadUrl: `https://rd.example.test/api/files/${requestId}?token=t` });
      }
      const requestId = url.replace("/api/scans/", "");
      statusCalls.push(requestId);
      const answer = statusFor(requestId, statusCalls.filter((id) => id === requestId).length);
      return "error" in answer ? Response.json({ error: { code: answer.error, message: "" } }, { status: answer.status }) : Response.json(answer);
    }),
  );
}

const complete = (requestId: string, verdict: "artificial" | "unable" = "artificial"): ScanStatusResponse => ({
  requestId,
  state: "complete",
  analysis: { mediaType: "image", verdict, ensembleScore: verdict === "unable" ? undefined : 0.92, models: [{ name: "mock-a", verdict: "artificial", score: 0.92 }, { name: "mock-b" }] },
});
const processing = (requestId: string): ScanStatusResponse => ({ requestId, state: "processing", stage: "analysing" });

async function load() {
  vi.resetModules();
  const client = await import("./client");
  const { scanStore } = await import("./store");
  return { scanService: client.scanService, scanStore };
}

function imageInput(name = "beach.jpg") {
  const file = new File([new Uint8Array(1000)], name, { type: "image/jpeg" });
  return {
    kind: "file" as const,
    file,
    summary: { kind: "file" as const, mediaType: "image" as const, fileName: name, mime: "image/jpeg", sizeBytes: 1000, width: 10, height: 10 },
    media: { src: "/samples/beach-sunset.jpg", persistent: true },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  install();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("live image checks", () => {
  it("uploads straight to the upload URL, polls Faike's route and shows RD's result", async () => {
    statusFor = (id, call) => (call < 3 ? processing(id) : complete(id));
    const { scanService, scanStore } = await load();
    const input = imageInput();
    const id = scanService.start(input);
    expect(scanStore.getJob(id)).toMatchObject({ engine: "rd", stage: { name: "uploading" } });

    await vi.advanceTimersByTimeAsync(100);
    expect(FakeXHR.puts).toEqual([{ url: "https://rd.example.test/api/files/req-1?token=t", body: input.file }]);
    expect(scanStore.getJob(id)?.stage).toEqual({ name: "analysing", step: "checking", progress: null });

    await vi.advanceTimersByTimeAsync(10_000);
    const stage = scanStore.getJob(id)?.stage;
    expect(stage?.name).toBe("done");
    expect(stage?.name === "done" && stage.result).toMatchObject({
      scanId: id,
      mediaType: "image",
      verdict: "artificial",
      ensembleScore: 0.92,
      source: { kind: "file", fileName: "beach.jpg" },
      file: { sizeBytes: 1000, width: 10, height: 10 },
    });
    expect(statusCalls).toEqual(["req-1", "req-1", "req-1"]);

    // Final: no more requests.
    await vi.advanceTimersByTimeAsync(20_000);
    expect(statusCalls).toHaveLength(3);
  });

  it("stops the older check's polling when a new check begins", async () => {
    statusFor = (id) => processing(id);
    const { scanService, scanStore } = await load();
    const first = scanService.start(imageInput("first.jpg"));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(statusCalls.filter((id) => id === "req-1").length).toBeGreaterThan(0);

    const second = scanService.start(imageInput("second.jpg"));
    expect(scanStore.getJob(first)).toBeUndefined();
    const before = statusCalls.filter((id) => id === "req-1").length;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(statusCalls.filter((id) => id === "req-1").length).toBe(before);
    expect(statusCalls.filter((id) => id === "req-2").length).toBeGreaterThan(0);
    expect(scanStore.getJob(second)?.stage.name).toBe("analysing");
  });

  it("offers a retry after the deadline that keeps waiting on the same request", async () => {
    // About 52 requests fit in the deadline (2 s for 30 s, then 4 s); the result lands after the retry.
    statusFor = (id, call) => (call <= 60 ? processing(id) : complete(id));
    const { scanService, scanStore } = await load();
    const id = scanService.start(imageInput());
    await vi.advanceTimersByTimeAsync(185_000);
    expect(scanStore.getJob(id)?.stage).toEqual({ name: "failed", failure: "timeout", at: "analysing" });

    const calls = statusCalls.length;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(statusCalls).toHaveLength(calls);

    scanService.retry(id);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(scanStore.getJob(id)?.stage.name).toBe("done");
    expect(presigns).toBe(1);
  });

  it("shows a connection failure when the upload is refused, and starts over on retry", async () => {
    statusFor = (id) => complete(id);
    const { scanService, scanStore } = await load();
    FakeXHR.fail = true;
    const id = scanService.start(imageInput());
    await vi.advanceTimersByTimeAsync(100);
    expect(scanStore.getJob(id)?.stage).toEqual({ name: "failed", failure: "network", at: "uploading" });
    expect(statusCalls).toHaveLength(0);

    FakeXHR.fail = false;
    scanService.retry(id);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(presigns).toBe(2);
    expect(scanStore.getJob(id)?.stage.name).toBe("done");
  });

  it("does not treat a model that is still analyzing as a failure", async () => {
    statusFor = (id) => complete(id);
    const { scanService, scanStore } = await load();
    const id = scanService.start(imageInput());
    await vi.advanceTimersByTimeAsync(5_000);
    const stage = scanStore.getJob(id)?.stage;
    expect(stage?.name === "done" && stage.result.models).toEqual([{ name: "mock-a", verdict: "artificial", score: 0.92 }, { name: "mock-b" }]);
  });

  it("re-sends the kept file after an unable result, counting the retry", async () => {
    statusFor = (id) => complete(id, id === "req-1" ? "unable" : "artificial");
    const { scanService, scanStore } = await load();
    const id = scanService.start(imageInput());
    await vi.advanceTimersByTimeAsync(5_000);
    const first = scanStore.getJob(id)?.stage;
    expect(first?.name === "done" && first.result.verdict).toBe("unable");
    expect(scanService.canRetry(id)).toBe(true);

    scanService.retry(id);
    await vi.advanceTimersByTimeAsync(5_000);
    const second = scanStore.getJob(id);
    expect(second?.retries).toBe(1);
    expect(second?.stage.name === "done" && second.stage.result.verdict).toBe("artificial");
    expect(presigns).toBe(2);
  });

  it("stops everything on cancel and gives the photo back to the home page", async () => {
    statusFor = (id) => processing(id);
    const { scanService, scanStore } = await load();
    const input = imageInput();
    const id = scanService.start(input);
    await vi.advanceTimersByTimeAsync(3_000);
    scanService.cancel(id);
    const calls = statusCalls.length;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(statusCalls).toHaveLength(calls);
    expect(scanStore.getJob(id)).toBeUndefined();
    expect(scanStore.getState().draft).toMatchObject({ kind: "file", file: input.file });
  });

  it("cannot retry a real check whose file is not in this tab", async () => {
    const { scanService, scanStore } = await load();
    scanStore.putJob({
      id: "restored",
      createdAt: 0,
      input: imageInput().summary,
      stage: { name: "done", result: { scanId: "restored", mediaType: "image", source: { kind: "file" }, file: {}, checkedAt: "", verdict: "unable", models: [] } },
      retries: 0,
      live: false,
      engine: "rd",
    });
    expect(scanService.canRetry("restored")).toBe(false);
  });

  it("keeps other media on the mock", async () => {
    const { scanService, scanStore } = await load();
    const audio = new File([new Uint8Array(10)], "voice.wav", { type: "audio/wav" });
    const id = scanService.start({
      kind: "file",
      file: audio,
      summary: { kind: "file", mediaType: "audio", fileName: "voice.wav", mime: "audio/wav", sizeBytes: 10 },
      media: { src: "/samples/voicenote_0923.wav", persistent: true },
    });
    expect(scanStore.getJob(id)?.engine).toBeUndefined();
    await vi.advanceTimersByTimeAsync(100);
    expect(presigns).toBe(0);
  });
});
