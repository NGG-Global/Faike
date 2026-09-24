import type { FeedbackAnswer, InputSummary, MediaRef } from "./job";

/*
 * The contract between the interface and whatever runs checks. Today the
 * mock (src/mocks/mock-scan-service.ts) implements it in the browser. In
 * Stage 5 a client for Faike's Route Handlers implements the same contract;
 * screens do not change. Progress is published to the scan store.
 */

export type StartInput =
  | { kind: "file"; file: File; summary: InputSummary; media?: MediaRef }
  | { kind: "link"; url: string; platformName?: string; handle?: string }
  | { kind: "paste"; text: string };

export interface ScanService {
  /** Starts a check and returns its id. */
  start(input: StartInput): string;
  /** Loads a finished check that is not in this tab (direct links). Resolves false when unknown. */
  load(id: string): Promise<boolean>;
  /** Stops a check and restores its input on the home page (HANDOFF §7.3). */
  cancel(id: string): void;
  /** Retries a failed step, or re-runs analysis after "unable", without re-uploading (HANDOFF §8). */
  retry(id: string): void;
  /** Sends the feedback answer with the check id only (HANDOFF §9.5). */
  sendFeedback(id: string, answer: FeedbackAnswer): Promise<void>;
}
