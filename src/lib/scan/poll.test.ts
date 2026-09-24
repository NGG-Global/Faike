import { describe, expect, it, vi } from "vitest";
import type { PollingConfig } from "@/config/polling";
import type { ScanStatusResponse } from "./api";
import type { ApiResult } from "./api-client";
import { abortableSleep, pollScan } from "./poll";

const CONFIG: PollingConfig = {
  intervalMs: 2_000,
  slowIntervalMs: 4_000,
  slowAfterMs: 30_000,
  deadlineMs: 180_000,
  requestTimeoutMs: 35_000,
  maxConsecutiveErrors: 3,
};

const processing: ApiResult<ScanStatusResponse> = { ok: true, data: { requestId: "r1", state: "processing", stage: "analysing" } };
const complete: ApiResult<ScanStatusResponse> = {
  ok: true,
  data: { requestId: "r1", state: "complete", analysis: { verdict: "artificial", models: [{ name: "mock-a" }] } },
};

/** A virtual clock: sleeping advances time instantly. */
function harness(answers: ApiResult<ScanStatusResponse>[] | (() => ApiResult<ScanStatusResponse>)) {
  let clock = 0;
  const waits: number[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const getStatus = vi.fn(async () => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await Promise.resolve();
    inFlight -= 1;
    return typeof answers === "function" ? answers() : (answers.shift() ?? processing);
  });
  const deps = {
    getStatus,
    config: CONFIG,
    now: () => clock,
    sleep: async (ms: number) => {
      waits.push(ms);
      clock += ms;
    },
  };
  return { deps, getStatus, waits, maxInFlight: () => maxInFlight, clock: () => clock };
}

describe("pollScan", () => {
  it("polls until the result is final, one request at a time", async () => {
    const h = harness([processing, processing, complete]);
    const outcome = await pollScan("r1", new AbortController().signal, h.deps);
    expect(outcome).toEqual({ kind: "complete", analysis: { verdict: "artificial", models: [{ name: "mock-a" }] } });
    expect(h.getStatus).toHaveBeenCalledTimes(3);
    expect(h.getStatus).toHaveBeenCalledWith("r1", expect.any(AbortSignal));
    expect(h.maxInFlight()).toBe(1);
    expect(h.waits).toEqual([2_000, 2_000, 2_000]);
  });

  it("stops at a retrieval failure", async () => {
    const h = harness([processing, { ok: true, data: { requestId: "r1", state: "failed", reason: "retrieval" } }]);
    expect(await pollScan("r1", new AbortController().signal, h.deps)).toEqual({ kind: "retrieval_failed" });
    expect(h.getStatus).toHaveBeenCalledTimes(2);
  });

  it("slows down for long checks and gives up at the deadline", async () => {
    const h = harness(() => processing);
    expect(await pollScan("r1", new AbortController().signal, h.deps)).toEqual({ kind: "timeout" });
    expect(h.waits.slice(0, 15).every((ms) => ms === 2_000)).toBe(true);
    expect(h.waits.at(-1)).toBe(4_000);
    expect(h.clock()).toBeGreaterThanOrEqual(CONFIG.deadlineMs);
    expect(h.clock()).toBeLessThan(CONFIG.deadlineMs + CONFIG.slowIntervalMs);
  });

  it("backs off after a failed request and recovers after a success", async () => {
    const h = harness([{ ok: false, code: "upstream_error" }, { ok: false, code: "timeout" }, processing, complete]);
    expect((await pollScan("r1", new AbortController().signal, h.deps)).kind).toBe("complete");
    expect(h.waits).toEqual([2_000, 4_000, 4_000, 2_000]);
  });

  it("fails after too many errors in a row", async () => {
    const h = harness([{ ok: false, code: "network" }, { ok: false, code: "network" }, { ok: false, code: "upstream_error" }, complete]);
    expect(await pollScan("r1", new AbortController().signal, h.deps)).toEqual({ kind: "error", code: "upstream_error" });
    expect(h.getStatus).toHaveBeenCalledTimes(3);
  });

  it("stops at once when aborted, without another request", async () => {
    const controller = new AbortController();
    const h = harness(() => {
      controller.abort();
      return processing;
    });
    expect(await pollScan("r1", controller.signal, h.deps)).toEqual({ kind: "aborted" });
    expect(h.getStatus).toHaveBeenCalledTimes(1);
  });
});

describe("abortableSleep", () => {
  it("resolves early when the signal aborts", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let done = false;
    const sleeping = abortableSleep(60_000, controller.signal).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(1_000);
    expect(done).toBe(false);
    controller.abort();
    await sleeping;
    expect(done).toBe(true);
    vi.useRealTimers();
  });
});
