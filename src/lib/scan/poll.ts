import { POLLING, type PollingConfig } from "@/config/polling";
import type { ScanAnalysis, ScanStatusResponse } from "./api";
import type { ApiResult, ClientErrorCode } from "./api-client";

/*
 * Waits for a Reality Defender result by polling Faike's own status route.
 *
 * - One request at a time: the next one is scheduled only after the
 *   previous one has settled.
 * - Stops at the first final state (complete, or the post not retrievable).
 *   A model that is still analyzing does not keep it waiting: the route
 *   reports "complete" as soon as the ensemble result is final.
 * - Gives up after `deadlineMs`, or after `maxConsecutiveErrors` failed
 *   requests in a row; a success resets the error count.
 * - Stops at once when `signal` is aborted (cancel, or a newer check).
 */

export type PollOutcome =
  | { kind: "complete"; analysis: ScanAnalysis }
  | { kind: "retrieval_failed" }
  | { kind: "timeout" }
  | { kind: "error"; code: ClientErrorCode }
  | { kind: "aborted" };

type ProcessingStatus = Extract<ScanStatusResponse, { state: "processing" }>;

export interface PollDeps {
  getStatus: (requestId: string, signal: AbortSignal) => Promise<ApiResult<ScanStatusResponse>>;
  /** Each non-final status, e.g. to move a link from "retrieving" to "analysing". */
  onProcessing?: (status: ProcessingStatus) => void;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  now?: () => number;
  config?: PollingConfig;
}

export async function pollScan(requestId: string, signal: AbortSignal, deps: PollDeps): Promise<PollOutcome> {
  const { getStatus, onProcessing, sleep = abortableSleep, now = Date.now, config = POLLING } = deps;
  const started = now();
  let errors = 0;

  for (;;) {
    const interval = now() - started >= config.slowAfterMs ? config.slowIntervalMs : config.intervalMs;
    // Back off after a failed request.
    await sleep(errors > 0 ? interval * 2 : interval, signal);
    if (signal.aborted) return { kind: "aborted" };
    if (now() - started >= config.deadlineMs) return { kind: "timeout" };

    const result = await getStatus(requestId, signal);
    if (signal.aborted) return { kind: "aborted" };

    if (!result.ok) {
      errors += 1;
      if (result.code === "invalid_request" || errors >= config.maxConsecutiveErrors) return { kind: "error", code: result.code };
      continue;
    }

    errors = 0;
    const status = result.data;
    if (status.state === "complete") return { kind: "complete", analysis: status.analysis };
    if (status.state === "failed") return { kind: "retrieval_failed" };
    onProcessing?.(status);
  }
}

/** Resolves after `ms`, or immediately once `signal` aborts. */
export function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done, { once: true });
  });
}
