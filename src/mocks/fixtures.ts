import type { MediaType, ModelResult, ScanResult, Strength, Verdict } from "@/lib/scan/types";
import { SAMPLE_HEATMAP_URL } from "./samples";

/*
 * MOCK result fixtures: every verdict for every media type (HANDOFF §14), so
 * design can review all views. They follow Faike's ScanResult shape, not
 * RD's (RD's schema is unconfirmed, §12.1). Model names are prefixed "mock-"
 * and scores are illustrative; neither describes a real RD model.
 *
 * Times are written against the bundled samples (voice 48 s, video 18 s) and
 * scaled to the real duration when a person's own file is used. Text spans
 * are planned by sentence and resolved against the submitted text.
 */

export interface FixtureTemplate
  extends Omit<ScanResult, "scanId" | "mediaType" | "source" | "file" | "checkedAt" | "verdict" | "textSpans"> {
  basisDurationSec?: number;
  textSpanPlan?: { sentence: number; strength: Strength }[];
}

const model = (
  name: string,
  friendlyName: string,
  checks: string,
  verdict: Verdict,
  score?: number,
): ModelResult => ({ name, friendlyName, checks, verdict, score });

const unableModels: ModelResult[] = [];

const IMAGE_REGIONS: ScanResult["regions"] = [
  { id: 1, x: 0.54, y: 0.3, w: 0.16, h: 0.16, strength: "strong" },
  { id: 2, x: 0.1, y: 0.64, w: 0.22, h: 0.14, strength: "some" },
  { id: 3, x: 0.7, y: 0.7, w: 0.16, h: 0.12, strength: "strong" },
];

const image: Record<Verdict, FixtureTemplate> = {
  authentic: {
    ensembleScore: 0.08,
    regions: [],
    models: [
      model("mock-img-generation", "Whole-image generation", "Signs that the entire image was generated", "authentic", 0.06),
      model("mock-img-edits", "Local edits", "Signs that parts of the image were altered", "authentic", 0.11),
      model("mock-img-diffusion", "Diffusion patterns", "Patterns typical of diffusion image generators", "authentic", 0.07),
    ],
  },
  suspicious: {
    ensembleScore: 0.57,
    regions: IMAGE_REGIONS,
    heatmaps: [{ label: "mock-img-edits", url: SAMPLE_HEATMAP_URL }],
    models: [
      model("mock-img-generation", "Whole-image generation", "Signs that the entire image was generated", "authentic", 0.31),
      model("mock-img-edits", "Local edits", "Signs that parts of the image were altered", "suspicious", 0.74),
      model("mock-img-diffusion", "Diffusion patterns", "Patterns typical of diffusion image generators", "suspicious", 0.62),
    ],
  },
  artificial: {
    ensembleScore: 0.93,
    regions: IMAGE_REGIONS,
    heatmaps: [{ label: "mock-img-edits", url: SAMPLE_HEATMAP_URL }],
    models: [
      model("mock-img-generation", "Whole-image generation", "Signs that the entire image was generated", "artificial", 0.95),
      model("mock-img-edits", "Local edits", "Signs that parts of the image were altered", "artificial", 0.88),
      model("mock-img-diffusion", "Diffusion patterns", "Patterns typical of diffusion image generators", "artificial", 0.91),
    ],
  },
  not_applicable: {
    models: [
      model("mock-img-generation", "Whole-image generation", "Signs that the entire image was generated", "not_applicable"),
    ],
  },
  unable: { models: unableModels },
};

const audio: Record<Verdict, FixtureTemplate> = {
  authentic: {
    basisDurationSec: 48,
    ensembleScore: 0.12,
    language: "en",
    suitability: [
      { check: "duration", passed: true },
      { check: "single_speaker", passed: true },
      { check: "speech", passed: true },
      { check: "clarity", passed: true },
    ],
    segments: [],
    models: [
      model("mock-voice-synthesis", "Voice synthesis", "Speech produced by text-to-speech systems", "authentic", 0.09),
      model("mock-voice-clone", "Voice cloning", "A real person's voice copied by AI", "authentic", 0.14),
      model("mock-audio-edits", "Audio edits", "Sections spliced or replaced in the recording", "authentic", 0.12),
    ],
  },
  suspicious: {
    basisDurationSec: 48,
    ensembleScore: 0.64,
    language: "en",
    suitability: [
      { check: "duration", passed: true },
      { check: "single_speaker", passed: true },
      { check: "speech", passed: true },
      { check: "clarity", passed: true },
    ],
    segments: [
      { id: 1, startSec: 6, endSec: 14, strength: "strong" },
      { id: 2, startSec: 22, endSec: 27, strength: "some" },
      { id: 3, startSec: 35, endSec: 41, strength: "strong" },
    ],
    unflaggedAssessedAuthentic: true,
    models: [
      model("mock-voice-synthesis", "Voice synthesis", "Speech produced by text-to-speech systems", "suspicious", 0.71),
      model("mock-voice-clone", "Voice cloning", "A real person's voice copied by AI", "authentic", 0.38),
      model("mock-audio-edits", "Audio edits", "Sections spliced or replaced in the recording", "suspicious", 0.66),
    ],
  },
  artificial: {
    basisDurationSec: 48,
    ensembleScore: 0.91,
    language: "en",
    suitability: [
      { check: "duration", passed: true },
      { check: "single_speaker", passed: true },
      { check: "speech", passed: true },
      { check: "clarity", passed: true },
    ],
    segments: [
      { id: 1, startSec: 2, endSec: 19, strength: "strong" },
      { id: 2, startSec: 24, endSec: 46, strength: "strong" },
    ],
    unflaggedAssessedAuthentic: false,
    models: [
      model("mock-voice-synthesis", "Voice synthesis", "Speech produced by text-to-speech systems", "artificial", 0.94),
      model("mock-voice-clone", "Voice cloning", "A real person's voice copied by AI", "artificial", 0.87),
      model("mock-audio-edits", "Audio edits", "Sections spliced or replaced in the recording", "suspicious", 0.61),
    ],
  },
  not_applicable: {
    basisDurationSec: 48,
    language: "en",
    notApplicableReason: "cross-talk",
    suitability: [
      { check: "duration", passed: true },
      { check: "single_speaker", passed: false },
      { check: "speech", passed: true },
    ],
    models: [
      model("mock-voice-synthesis", "Voice synthesis", "Speech produced by text-to-speech systems", "not_applicable"),
    ],
  },
  unable: { models: unableModels },
};

const video: Record<Verdict, FixtureTemplate> = {
  authentic: {
    basisDurationSec: 18,
    ensembleScore: 0.15,
    sceneCuts: [6, 12],
    partial: { picture: "authentic", sound: "authentic" },
    segments: [],
    models: [
      model("mock-video-frames", "Generated frames", "Frames produced by video generators", "authentic", 0.12),
      model("mock-video-edits", "Visual edits", "Faces or objects altered in the picture", "authentic", 0.18),
      model("mock-voice-synthesis", "Voice synthesis", "Speech produced by text-to-speech systems", "authentic", 0.16),
    ],
  },
  suspicious: {
    basisDurationSec: 18,
    ensembleScore: 0.62,
    sceneCuts: [6, 12],
    partial: { picture: "authentic", sound: "suspicious" },
    segments: [
      { id: 1, startSec: 7.5, endSec: 10.5, strength: "some", lane: "sound" },
      { id: 2, startSec: 13, endSec: 15.5, strength: "strong", lane: "sound" },
    ],
    models: [
      model("mock-video-frames", "Generated frames", "Frames produced by video generators", "authentic", 0.22),
      model("mock-video-edits", "Visual edits", "Faces or objects altered in the picture", "authentic", 0.29),
      model("mock-voice-synthesis", "Voice synthesis", "Speech produced by text-to-speech systems", "suspicious", 0.73),
    ],
  },
  artificial: {
    basisDurationSec: 18,
    ensembleScore: 0.9,
    sceneCuts: [6, 12],
    partial: { picture: "artificial", sound: "suspicious" },
    segments: [
      { id: 1, startSec: 0.5, endSec: 5.5, strength: "strong", lane: "picture" },
      { id: 2, startSec: 6.5, endSec: 11, strength: "strong", lane: "picture" },
      { id: 3, startSec: 13, endSec: 16, strength: "some", lane: "sound" },
    ],
    models: [
      model("mock-video-frames", "Generated frames", "Frames produced by video generators", "artificial", 0.93),
      model("mock-video-edits", "Visual edits", "Faces or objects altered in the picture", "artificial", 0.86),
      model("mock-voice-synthesis", "Voice synthesis", "Speech produced by text-to-speech systems", "suspicious", 0.64),
    ],
  },
  not_applicable: {
    basisDurationSec: 18,
    models: [model("mock-video-frames", "Generated frames", "Frames produced by video generators", "not_applicable")],
  },
  unable: { models: unableModels },
};

const text: Record<Verdict, FixtureTemplate> = {
  authentic: {
    ensembleScore: 0.1,
    language: "en",
    textSpanPlan: [],
    models: [
      model("mock-text-llm", "Language-model text", "Writing produced by large language models", "authentic", 0.08),
      model("mock-text-paraphrase", "Paraphrasing tools", "Text rewritten by AI paraphrasers", "authentic", 0.13),
    ],
  },
  suspicious: {
    ensembleScore: 0.6,
    language: "en",
    textSpanPlan: [
      { sentence: 2, strength: "some" },
      { sentence: 4, strength: "strong" },
    ],
    models: [
      model("mock-text-llm", "Language-model text", "Writing produced by large language models", "suspicious", 0.67),
      model("mock-text-paraphrase", "Paraphrasing tools", "Text rewritten by AI paraphrasers", "authentic", 0.35),
    ],
  },
  artificial: {
    ensembleScore: 0.94,
    language: "en",
    textSpanPlan: [
      { sentence: 0, strength: "strong" },
      { sentence: 1, strength: "strong" },
      { sentence: 3, strength: "strong" },
      { sentence: 4, strength: "some" },
      { sentence: 6, strength: "strong" },
    ],
    models: [
      model("mock-text-llm", "Language-model text", "Writing produced by large language models", "artificial", 0.96),
      model("mock-text-paraphrase", "Paraphrasing tools", "Text rewritten by AI paraphrasers", "suspicious", 0.58),
    ],
  },
  not_applicable: {
    models: [model("mock-text-llm", "Language-model text", "Writing produced by large language models", "not_applicable")],
  },
  unable: { models: unableModels },
};

export const FIXTURES: Record<MediaType, Record<Verdict, FixtureTemplate>> = { image, audio, video, text };
