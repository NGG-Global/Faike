/**
 * Faike's normalised scan result (HANDOFF §9.1).
 *
 * This is the only shape the UI consumes. Reality Defender responses are
 * mapped into it by a single server-side adapter (not built yet); nothing
 * outside that adapter may read RD's raw response.
 *
 * Rules:
 * - Populate a field only when RD (or the file's own metadata) provides it.
 *   Every UI element tied to an optional field must hide when it is absent.
 * - `verdict` and `ensembleScore` come from RD's overall (ensemble) result,
 *   which is the primary result. Per-model entries are secondary detail.
 * - Model names are data from RD. Never hard-code them.
 */

export type MediaType = "image" | "audio" | "video" | "text";

export type Verdict =
  | "authentic"
  | "suspicious"
  | "artificial"
  | "not_applicable"
  | "unable";

export type Strength = "strong" | "some";

export interface ScanResult {
  scanId: string;
  mediaType: MediaType;
  source: {
    kind: "file" | "link" | "paste";
    fileName?: string;
    url?: string;
    platform?: string;
  };
  file: {
    sizeBytes?: number;
    format?: string;
    durationSec?: number;
    width?: number;
    height?: number;
  };
  /** ISO 8601. */
  checkedAt: string;
  verdict: Verdict;
  /** 0..1, RD's overall score. A model output score, not a probability. */
  ensembleScore?: number;
  /** Only if RD returns it. */
  language?: string;
  /** RD reason code; mapped to copy in the UI layer. */
  notApplicableReason?: string;
  suitability?: {
    check: "duration" | "single_speaker" | "speech" | "clarity";
    passed: boolean;
  }[];
  segments?: {
    id: number;
    startSec: number;
    endSec: number;
    strength: Strength;
    lane?: "picture" | "sound";
  }[];
  /** Coordinates normalised to 0..1. */
  regions?: {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    strength: Strength;
  }[];
  heatmapUrl?: string;
  textSpans?: { start: number; end: number; strength: Strength }[];
  partial?: {
    picture?: Verdict | "pending";
    sound?: Verdict | "pending";
  };
  models: {
    name: string;
    friendlyName?: string;
    verdict?: Verdict;
    score?: number;
  }[];
}
