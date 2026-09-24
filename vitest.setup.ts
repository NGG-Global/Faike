import { afterEach, beforeEach, vi } from "vitest";

/*
 * No test may reach the network, and in particular Reality Defender's paid
 * API. Any fetch a test has not replaced with a stub throws.
 */
beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("Network access is disabled in unit tests. Stub fetch in the test.");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
