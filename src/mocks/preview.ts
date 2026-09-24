import { useSyncExternalStore } from "react";
import type { ValidationIssue } from "@/lib/scan/input";
import type { InputSummary } from "@/lib/scan/job";

/*
 * MOCK home-page previews for the /mock review page: /?preview=<state>
 * shows a home state that normally needs a real drag or a real file.
 */

export interface HomePreview {
  dragging?: boolean;
  issue?: { issue: ValidationIssue; summary: InputSummary };
}

const PREVIEWS: Record<string, HomePreview> = {
  dragging: { dragging: true },
  "too-large": {
    issue: {
      issue: { kind: "too_large", mediaType: "audio", limitBytes: 20_000_000, sizeBytes: 34_000_000 },
      summary: { kind: "file", mediaType: "audio", fileName: "long-recording.m4a", sizeBytes: 34_000_000 },
    },
  },
  "too-long": {
    issue: {
      issue: { kind: "too_long", mediaType: "video", limitSec: 1800, durationSec: 2520 },
      summary: { kind: "file", mediaType: "video", fileName: "full-interview.mp4", durationSec: 2520 },
    },
  },
  unsupported: {
    issue: { issue: { kind: "unsupported" }, summary: { kind: "file", fileName: "notes.pdf" } },
  },
  "plus-gate": {
    issue: {
      issue: { kind: "gated", subject: "video" },
      summary: { kind: "file", mediaType: "video", fileName: "street-clip.mp4", durationSec: 72 },
    },
  },
};

const noopSubscribe = () => () => {};

/** The preview named in ?preview=, or null. Null during server rendering. */
export function useHomePreview(): HomePreview | null {
  const name = useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).get("preview"),
    () => null,
  );
  return (name && PREVIEWS[name]) || null;
}
