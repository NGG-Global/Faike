import type { MediaType, ScanResult } from "./types";

/*
 * Client-side state of one check as it moves through the flow
 * (HANDOFF §9.4): uploading or retrieving → analysing → done, or failed.
 * Not-applicable and unable are results (stage "done"), not failures.
 */

/** What the person submitted, as far as the interface needs to show it. */
export interface InputSummary {
  kind: "file" | "link" | "paste";
  /** Unknown for links until the media has been retrieved. */
  mediaType?: MediaType;
  fileName?: string;
  mime?: string;
  sizeBytes?: number;
  durationSec?: number;
  width?: number;
  height?: number;
  url?: string;
  platformName?: string;
  handle?: string;
  /** Submitted or file text, kept in the browser for the text preview. */
  text?: string;
}

/** Where the preview reads the media from. */
export interface MediaRef {
  src: string;
  posterSrc?: string;
  /** Bundled samples survive a reload; object URLs for local files do not. */
  persistent: boolean;
}

export type FlowStep = "uploading" | "retrieving" | "analysing";

/** "timeout": the service stopped answering before a final result (derived state). */
export type FailureKind = "offline" | "network" | "retrieval" | "timeout";

export type ScanStage =
  | { name: "uploading"; loadedBytes: number; totalBytes: number }
  | { name: "retrieving" }
  | {
      name: "analysing";
      step: "checking" | "writing";
      /** 0–100 when progress is reported, null when only status is known. */
      progress: number | null;
      partial?: ScanResult["partial"];
    }
  | { name: "done"; result: ScanResult }
  | { name: "failed"; failure: FailureKind; at: FlowStep };

export type FeedbackAnswer = "yes" | "no" | "not_sure";

export interface ScanJob {
  id: string;
  createdAt: number;
  input: InputSummary;
  media?: MediaRef;
  stage: ScanStage;
  /** Analysis retries after an "unable" result (HANDOFF §8). */
  retries: number;
  /** True when the stage change was seen live in this tab, not restored. */
  live: boolean;
  /** "rd" for a real check through Reality Defender; absent for the mock. */
  engine?: "rd";
  /** RD's request id, kept so expired visual links can be refreshed and the text explanation opened. Not secret. */
  requestId?: string;
  feedback?: FeedbackAnswer;
}

/** Input kept on the home page after Cancel or a failed link (HANDOFF §7.3). */
export type Draft =
  | { kind: "file"; file: File; summary: InputSummary; previewUrl?: string }
  | { kind: "link"; url: string }
  | { kind: "paste"; text: string };
