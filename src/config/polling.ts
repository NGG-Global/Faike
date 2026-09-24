/*
 * How the browser waits for a Reality Defender result, through Faike's own
 * GET /api/scans/{requestId}. RD offers no progress, only status; its SDK
 * polls every 5 s by default. A live image check (24 Sep 2026) finished in
 * about 10 s, so Faike starts faster and slows down for long checks.
 */
export const POLLING = {
  /** Wait before each status request while the check is young. */
  intervalMs: 2_000,
  /** Wait once the check has run for `slowAfterMs`. */
  slowIntervalMs: 4_000,
  slowAfterMs: 30_000,
  /** After this long without a final result the person is offered a retry. */
  deadlineMs: 180_000,
  /** One status request; above the route's own 30 s limit. */
  requestTimeoutMs: 35_000,
  /** Failed status requests in a row before the check is shown as failed. */
  maxConsecutiveErrors: 3,
} as const;

export type PollingConfig = { readonly [K in keyof typeof POLLING]: number };
