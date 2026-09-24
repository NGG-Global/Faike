import type { InputSummary, MediaRef, ScanJob } from "@/lib/scan/job";
import type { Verdict } from "@/lib/scan/types";
import { buildMockResult } from "./build-result";
import { retrievedMedia, SAMPLE_LINKS, SAMPLE_TEXT, SAMPLES, sampleMedia, sampleSummary } from "./samples";

/*
 * MOCK demo checks: /check/demo-<source>-<verdict> loads a finished check
 * built from a bundled sample and its fixture, so every verdict for every
 * media type can be opened directly (HANDOFF §14).
 */

export const DEMO_SOURCES = ["photo", "voice", "video", "text", "link"] as const;
export type DemoSource = (typeof DEMO_SOURCES)[number];

export const DEMO_VERDICTS: Record<string, Verdict> = {
  authentic: "authentic",
  suspicious: "suspicious",
  artificial: "artificial",
  "not-applicable": "not_applicable",
  unable: "unable",
};

export function demoId(source: DemoSource, verdict: Verdict): string {
  const slug = Object.entries(DEMO_VERDICTS).find(([, v]) => v === verdict)?.[0] ?? verdict;
  return `demo-${source}-${slug}`;
}

export function demoInput(source: DemoSource): { input: InputSummary; media?: MediaRef } {
  switch (source) {
    case "photo":
      return { input: sampleSummary(SAMPLES.photo), media: sampleMedia(SAMPLES.photo) };
    case "voice":
      return { input: sampleSummary(SAMPLES.voice), media: sampleMedia(SAMPLES.voice) };
    case "video":
      return { input: sampleSummary(SAMPLES.video), media: sampleMedia(SAMPLES.video) };
    case "text":
      return { input: { kind: "paste", mediaType: "text", text: SAMPLE_TEXT } };
    case "link":
      return {
        input: {
          ...retrievedMedia(SAMPLES.video),
          kind: "link",
          url: SAMPLE_LINKS.tiktok,
          platformName: "TikTok",
          handle: "@citybeat",
        },
        media: sampleMedia(SAMPLES.video),
      };
  }
}

export function createDemoJob(id: string): ScanJob | null {
  const match = id.match(/^demo-(photo|voice|video|text|link)-(.+)$/);
  const verdict = match ? DEMO_VERDICTS[match[2]] : undefined;
  if (!match || !verdict) return null;
  const { input, media } = demoInput(match[1] as DemoSource);
  const now = Date.now();
  return {
    id,
    createdAt: now,
    input,
    media,
    stage: { name: "done", result: buildMockResult({ scanId: id, input, verdict, checkedAt: new Date(now).toISOString() }) },
    retries: 0,
    live: false,
  };
}
