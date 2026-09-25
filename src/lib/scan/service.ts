import type { FeedbackAnswer, InputSummary, MediaRef } from "./job";

/*
 * The contract between the interface and whatever runs checks. Image files
 * go to Reality Defender through Faike's Route Handlers
 * (src/lib/scan/live-service.ts); every other input still runs on the mock
 * (src/mocks/mock-scan-service.ts). src/lib/scan/client.ts routes between
 * them; screens do not know which one runs. Progress is published to the
 * scan store.
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
  /** Retries a failed step, or re-runs analysis after "unable", without the person choosing the file again (HANDOFF §8). */
  retry(id: string): void;
  /** False when a retry is impossible, e.g. the file of a real check is gone after a reload. */
  canRetry(id: string): boolean;
  /**
   * Re-reads a finished check to replace expired visual links (heat maps).
   * Never changes the verdict or fails the check; resolves false when
   * nothing could be refreshed.
   */
  refresh(id: string): Promise<boolean>;
  /** Sends the feedback answer with the check id only (HANDOFF §9.5). */
  sendFeedback(id: string, answer: FeedbackAnswer): Promise<void>;
}
