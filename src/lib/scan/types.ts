/**
 * Faike's normalised scan result (HANDOFF §9.1).
 *
 * This is the only shape the UI consumes. Reality Defender responses are
 * mapped into it by a single server-side adapter (not built yet); nothing
 * outside that adapter may read RD's raw response. Until then, results come
 * from the mock fixtures in src/mocks.
 *
 * Rules:
 * - Populate a field only when RD (or the file's own metadata) provides it.
 *   Every UI element tied to an optional field must hide when it is absent.
 *   An empty array means "RD checked and found none"; an absent field means
 *   "RD does not report this".
 * - `verdict` and `ensembleScore` come from RD's overall (ensemble) result,
 *   which is the primary result. Per-model entries are secondary detail.
 * - Model names are data from RD. Never hard-code them.
 *
 * Fields marked [Faike] extend §9.1 because the handoff's UI needs them;
 * each is optional and filled only when RD supplies the underlying data.
 */

export type MediaType = "image" | "audio" | "video" | "text";

export type Verdict = "authentic" | "suspicious" | "artificial" | "not_applicable" | "unable";

export type Strength = "strong" | "some";

export type Lane = "picture" | "sound";

export type SuitabilityCheck = "duration" | "single_speaker" | "speech" | "clarity";

export interface Segment {
  id: number;
  startSec: number;
  endSec: number;
  strength: Strength;
  lane?: Lane;
}

/** Coordinates normalised to 0..1 of the image's width and height. */
export interface Region {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  strength: Strength;
}

export interface TextSpan {
  /** UTF-16 offsets into the submitted text, end exclusive. */
  start: number;
  end: number;
  strength: Strength;
}

export interface ModelResult {
  name: string;
  friendlyName?: string;
  /** [Faike] What the model checks, only if RD describes it. */
  checks?: string;
  verdict?: Verdict;
  /** 0..1 model output score. Not a probability. */
  score?: number;
}

export interface ScanResult {
  scanId: string;
  mediaType: MediaType;
  source: {
    kind: "file" | "link" | "paste";
    fileName?: string;
    url?: string;
    platform?: string;
    /** [Faike] Account handle of a social post, e.g. "@citybeat". */
    handle?: string;
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
  /** BCP 47 language code, only if RD returns it. */
  language?: string;
  /** RD reason code; mapped to copy in the UI layer. */
  notApplicableReason?: string;
  suitability?: { check: SuitabilityCheck; passed: boolean }[];
  segments?: Segment[];
  /**
   * [Faike] True only when RD's segment data covers the whole recording and
   * the unflagged parts read as authentic (HANDOFF §6.18 footer line).
   */
  unflaggedAssessedAuthentic?: boolean;
  /** [Faike] Scene-cut times in seconds (video), only if RD provides them. */
  sceneCuts?: number[];
  regions?: Region[];
  heatmapUrl?: string;
  textSpans?: TextSpan[];
  partial?: {
    picture?: Verdict | "pending";
    sound?: Verdict | "pending";
  };
  models: ModelResult[];
}
