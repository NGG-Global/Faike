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
let socials = 0;
const presignBodies: { fileName: string; mimeType: string; sizeBytes: number }[] = [];
let statusFor: (requestId: string, call: number) => Status;
const statusCalls: string[] = [];

function install() {
  presigns = 0;
  socials = 0;
  presignBodies.length = 0;
  statusCalls.length = 0;
  FakeXHR.puts = [];
  FakeXHR.fail = false;
  vi.stubGlobal("XMLHttpRequest", FakeXHR);
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url === "/api/scans/presign") {
        presigns += 1;
        presignBodies.push(JSON.parse(String(init?.body)));
        const requestId = `req-${presigns}`;
        return Response.json({ requestId, uploadUrl: `https://rd.example.test/api/files/${requestId}?token=t` });
      }
      if (url === "/api/scans/social") {
        socials += 1;
        const body = JSON.parse(String(init?.body));
        if (body.url.includes("refused")) return Response.json({ error: { code: "rejected", message: "" } }, { status: 422 });
        return Response.json({ requestId: `link-${socials}` });
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

describe("live checks", () => {
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

  it("checks audio, video and text files through the same path", async () => {
    statusFor = (id) => complete(id);
    const { scanService, scanStore } = await load();
    const files = [
      { name: "voice.m4a", type: "audio/mp4", mediaType: "audio" as const, extra: { durationSec: 48 } },
      { name: "clip.mov", type: "video/quicktime", mediaType: "video" as const, extra: { durationSec: 12, width: 960, height: 540 } },
      { name: "notes.txt", type: "text/plain", mediaType: "text" as const, extra: { text: "Some words." } },
    ];
    for (const spec of files) {
      const file = new File([new Uint8Array(20)], spec.name, { type: spec.type });
      const id = scanService.start({
        kind: "file",
        file,
        summary: { kind: "file", mediaType: spec.mediaType, fileName: spec.name, mime: spec.type, sizeBytes: 20, ...spec.extra },
        media: spec.mediaType === "text" ? undefined : { src: `/samples/${spec.name}`, persistent: true },
      });
      expect(scanStore.getJob(id)?.engine).toBe("rd");
      await vi.advanceTimersByTimeAsync(5_000);
      const stage = scanStore.getJob(id)?.stage;
      expect(stage?.name === "done" && stage.result, spec.name).toMatchObject({ mediaType: spec.mediaType, source: { kind: "file", fileName: spec.name } });
    }
    expect(presignBodies.map((body) => body.fileName)).toEqual(["voice.m4a", "clip.mov", "notes.txt"]);
    expect(FakeXHR.puts).toHaveLength(3);
  });

  it("sends pasted text as a .txt file", async () => {
    statusFor = (id) => complete(id);
    const { scanService, scanStore } = await load();
    const id = scanService.start({ kind: "paste", text: "Crème brûlée." });
    expect(scanStore.getJob(id)?.stage.name).toBe("uploading");
    await vi.advanceTimersByTimeAsync(5_000);
    // Size in UTF-8 bytes (13 characters, three of them two bytes), as the 900 KB limit counts.
    expect(presignBodies[0]).toEqual({ fileName: "pasted-text.txt", mimeType: "text/plain", sizeBytes: 16 });
    expect(await (FakeXHR.puts[0].body as Blob).text()).toBe("Crème brûlée.");
    const stage = scanStore.getJob(id)?.stage;
    expect(stage?.name === "done" && stage.result).toMatchObject({ mediaType: "text", source: { kind: "paste" } });
    expect(scanStore.getJob(id)?.input.text).toBe("Crème brûlée.");
  });

  it("checks a social link: retrieving, then analysing, then the result, with the media type from RD", async () => {
    statusFor = (id, call) =>
      call === 1
        ? { requestId: id, state: "processing", stage: "retrieving" }
        : call === 2
          ? { requestId: id, state: "processing", stage: "analysing", mediaType: "video" }
          : { ...complete(id), analysis: { ...(complete(id) as { analysis: object }).analysis, mediaType: "video" } } as ScanStatusResponse;
    const { scanService, scanStore } = await load();
    const id = scanService.start({ kind: "link", url: "https://www.tiktok.com/@citybeat/video/1", platformName: "TikTok", handle: "@citybeat" });
    expect(scanStore.getJob(id)?.stage.name).toBe("retrieving");
    expect(presigns).toBe(0);

    await vi.advanceTimersByTimeAsync(2_100);
    expect(scanStore.getJob(id)?.stage.name).toBe("retrieving");
    await vi.advanceTimersByTimeAsync(2_000);
    expect(scanStore.getJob(id)).toMatchObject({ stage: { name: "analysing" }, input: { mediaType: "video" } });
    await vi.advanceTimersByTimeAsync(2_000);
    const stage = scanStore.getJob(id)?.stage;
    expect(stage?.name === "done" && stage.result).toMatchObject({
      mediaType: "video",
      source: { kind: "link", url: "https://www.tiktok.com/@citybeat/video/1", platform: "TikTok", handle: "@citybeat" },
      file: {},
    });
    expect(statusCalls.every((requestId) => requestId === "link-1")).toBe(true);
  });

  it("shows a link RD refuses, or cannot download, as a link that can't be opened", async () => {
    statusFor = (id) => ({ requestId: id, state: "failed", reason: "retrieval" });
    const { scanService, scanStore } = await load();
    const refused = scanService.start({ kind: "link", url: "https://www.tiktok.com/refused" });
    await vi.advanceTimersByTimeAsync(100);
    expect(scanStore.getJob(refused)?.stage).toEqual({ name: "failed", failure: "retrieval", at: "retrieving" });

    const lost = scanService.start({ kind: "link", url: "https://www.tiktok.com/private" });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(scanStore.getJob(lost)?.stage).toEqual({ name: "failed", failure: "retrieval", at: "retrieving" });
  });

  it("gives a cancelled link back to the paste field", async () => {
    statusFor = (id) => processing(id);
    const { scanService, scanStore } = await load();
    const id = scanService.start({ kind: "link", url: "https://youtu.be/abc" });
    await vi.advanceTimersByTimeAsync(3_000);
    scanService.cancel(id);
    expect(scanStore.getState().draft).toEqual({ kind: "link", url: "https://youtu.be/abc" });
  });

  it("re-submits a link after an unable result, without the person pasting it again", async () => {
    statusFor = (id) => complete(id, id === "link-1" ? "unable" : "artificial");
    const { scanService, scanStore } = await load();
    const id = scanService.start({ kind: "link", url: "https://youtu.be/abc" });
    await vi.advanceTimersByTimeAsync(5_000);
    scanService.retry(id);
    await vi.advanceTimersByTimeAsync(5_000);
    const job = scanStore.getJob(id);
    expect(socials).toBe(2);
    expect(job?.stage.name === "done" && job.stage.result.verdict).toBe("artificial");
  });

  it("keeps RD's request id on the job, for refreshes and the text explanation", async () => {
    statusFor = (id) => complete(id);
    const { scanService, scanStore } = await load();
    const id = scanService.start(imageInput());
    await vi.advanceTimersByTimeAsync(5_000);
    expect(scanStore.getJob(id)?.requestId).toBe("req-1");
  });
});

describe("detail that arrives after the result", () => {
  const read = (id: string, running: boolean): ScanStatusResponse => ({
    requestId: id,
    state: "complete",
    analysis: {
      mediaType: "image",
      verdict: "artificial",
      ensembleScore: 0.92,
      models: running
        ? [{ name: "mock-a", verdict: "artificial", score: 0.9 }, { name: "mock-b", pending: true }]
        : [
            { name: "mock-a", verdict: "artificial", score: 0.9 },
            { name: "mock-b", verdict: "artificial", score: 0.95 },
          ],
      heatmaps: running
        ? [{ model: "mock-a", url: `/api/scans/${id}/heatmap?model=mock-a` }]
        : [
            { model: "mock-a", url: `/api/scans/${id}/heatmap?model=mock-a` },
            { model: "mock-b", url: `/api/scans/${id}/heatmap?model=mock-b` },
          ],
    },
  });

  it("re-reads while detectors are still running and takes their rows and heat maps", async () => {
    let running = true;
    statusFor = (id) => read(id, running);
    const { scanService, scanStore } = await load();
    const id = scanService.start(imageInput());
    await vi.advanceTimersByTimeAsync(5_000);
    const before = statusCalls.length;

    const refreshed = scanService.refresh(id);
    await vi.advanceTimersByTimeAsync(0);
    running = false;
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(refreshed).resolves.toBe(true);

    const stage = scanStore.getJob(id)?.stage;
    expect(stage?.name === "done" && stage.result.models.every((model) => !model.pending)).toBe(true);
    expect(stage?.name === "done" && stage.result.heatmaps?.map((heatmap) => heatmap.label)).toEqual(["mock-b", "mock-a"]);
    expect(stage?.name === "done" && stage.result.verdict).toBe("artificial");
    // Two reads: one still running, one settled; then it stops.
    expect(statusCalls.length - before).toBe(2);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(statusCalls.length - before).toBe(2);
  });

  it("reads nothing when no detector is running, and runs once however often it is asked", async () => {
    statusFor = (id) => read(id, false);
    const { scanService } = await load();
    const id = scanService.start(imageInput());
    await vi.advanceTimersByTimeAsync(5_000);
    const before = statusCalls.length;
    await expect(scanService.refresh(id)).resolves.toBe(false);
    expect(statusCalls.length).toBe(before);

    statusFor = (id) => read(id, true);
    const other = scanService.start(imageInput());
    await vi.advanceTimersByTimeAsync(5_000);
    const reads = statusCalls.length;
    const first = scanService.refresh(other);
    const second = scanService.refresh(other);
    expect(second).toBe(first);
    await vi.advanceTimersByTimeAsync(30_000);
    await first;
    expect(statusCalls.length - reads).toBe(4); // every wait used, still running
  });

  it("never fails the check when a later read cannot be made", async () => {
    statusFor = (id) => read(id, true);
    const { scanService, scanStore } = await load();
    const id = scanService.start(imageInput());
    await vi.advanceTimersByTimeAsync(5_000);
    statusFor = () => ({ error: "upstream_error", status: 502 });
    const refreshed = scanService.refresh(id);
    await vi.advanceTimersByTimeAsync(30_000);
    await expect(refreshed).resolves.toBe(false);
    const stage = scanStore.getJob(id)?.stage;
    expect(stage?.name === "done" && stage.result.verdict).toBe("artificial");
  });

  it("does nothing for checks without a request id (the mock) or not finished yet", async () => {
    statusFor = (id) => processing(id);
    const { scanService } = await load();
    const id = scanService.start(imageInput());
    await vi.advanceTimersByTimeAsync(3_000);
    await expect(scanService.refresh(id)).resolves.toBe(false);
    await expect(scanService.refresh("demo-photo-artificial")).resolves.toBe(false);
  });
});
