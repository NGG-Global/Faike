import "server-only";

/*
 * Reality Defender response shapes: only the parts Faike uses, after
 * runtime validation (src/lib/rd/parse.ts). Sources, checked 24 Sep 2026:
 *
 * - docs.realitydefender.com: API Quickstart, AWS Presigned URL, Social
 *   Media URL Upload, Media Detail, Create User Feedback.
 * - RD's official TypeScript SDK, @realitydefender/realitydefender 0.1.19,
 *   for the presigned-upload envelope, which the REST pages show only in
 *   part: `signedUrl` is nested under `response`; `requestId` is top level.
 * - A live image check through Faike's routes (24 Sep 2026) confirmed that
 *   envelope and the media-detail fields below.
 *
 * Fields RD returns but Faike does not need are not typed and never read,
 * including account identifiers (userId, institutionId), storage keys and
 * file names. Status values stay strings: RD may add new ones, and unknown
 * values are handled by the adapter, not the type.
 */

/** POST /api/files/aws-presigned, body { fileName }. */
export interface RdPresignedUploadResponse {
  response: {
    /**
     * Where the file body is PUT. The docs call it an AWS pre-signed URL; in
     * live responses it is RD's own API (`/api/files/{requestId}?token=…`).
     * The token authorises the upload: never log the query.
     */
    signedUrl: string;
  };
  requestId: string;
}

/** POST /api/files/social, body { socialLink }. */
export interface RdSocialUploadResponse {
  requestId: string;
}

/** GET /api/media/users/{requestId}. */
export interface RdMediaDetail {
  requestId?: string;
  /** "IMAGE" | "VIDEO" | "AUDIO" | "TEXT" */
  mediaType?: string;
  /** Overall media status. Also "ANALYZING" or "DOWNLOADING" while in progress (SDK). */
  overallStatus?: string;
  /** ISO 8601. */
  uploadedDate?: string;
  /** The submitted link; present only for social submissions. Faike reads its presence, never passes it on. */
  socialLink?: string;
  /** Meaningful only for social submissions. */
  socialLinkDownloaded?: boolean;
  /** Meaningful only for social submissions. */
  socialLinkDownloadFailed?: boolean;
  /** Ensemble result. Null or absent while a post downloads or models run (SDK). */
  resultsSummary?: RdResultsSummary;
  models: RdModelResult[];
  /** Model name → pre-signed PNG URL. Meaningful only for images; see the adapter. */
  heatmaps?: Record<string, string>;
}

export interface RdResultsSummary {
  /** "AUTHENTIC" | "FAKE" | "SUSPICIOUS" | "NOT_APPLICABLE" | "UNABLE_TO_EVALUATE" */
  status?: string;
  metadata?: RdSummaryMetadata;
  /** Present with UNABLE_TO_EVALUATE, e.g. { code: "model-error" }. */
  error?: { code?: string };
}

export interface RdSummaryMetadata {
  /** 0–100, exclusive at both ends when present. */
  finalScore?: number;
  /** Lower-case English names, e.g. "english". */
  languages?: string[];
  /** NOT_APPLICABLE reasons. RD's `message` text is deliberately not kept: it is not written for people. */
  reasons?: { code: string }[];
}

export interface RdModelResult {
  /** Data, never a constant: RD says names change over time. */
  name: string;
  /** Same values as the summary, plus "ANALYZING". */
  status?: string;
  /** 0–100, exclusive at both ends when present. */
  finalScore?: number;
  /** e.g. "not_applicable". */
  code?: string;
}
