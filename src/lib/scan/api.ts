import type { MediaType, ModelResult, Verdict } from "./types";

/*
 * Contract of Faike's scan Route Handlers (src/app/api/scans). These are
 * the only shapes the browser receives; Reality Defender's own responses
 * never leave the server. Safe to import from client code (types,
 * constants and path helpers only, no secrets).
 *
 *   POST /api/scans/presign      PresignRequest → PresignResponse
 *   POST /api/scans/social       SocialRequest  → SocialResponse
 *   GET  /api/scans/{requestId}  → ScanStatusResponse
 *   GET  /api/scans/{requestId}/explainability → 302 to a fresh RD explanation page (text)
 *   GET  /api/scans/{requestId}/heatmap?model=… → the detector's heat map PNG, read fresh from RD (image)
 *
 * Every failure is an ApiErrorBody with one of the codes below.
 */

export interface PresignRequest {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

/** The browser PUTs the file body, and nothing else, to `uploadUrl` (absolute, or a same-origin path while the upload proxy is on). */
export interface PresignResponse {
  requestId: string;
  uploadUrl: string;
}

export interface SocialRequest {
  url: string;
}

export interface SocialResponse {
  requestId: string;
}

export type ScanStatusResponse =
  | {
      requestId: string;
      state: "processing";
      /** "retrieving" while RD downloads a social post. */
      stage: "retrieving" | "analysing";
      mediaType?: MediaType;
    }
  | {
      requestId: string;
      state: "failed";
      /** RD could not download the social post. */
      reason: "retrieval";
    }
  | {
      requestId: string;
      state: "complete";
      analysis: ScanAnalysis;
    };

/**
 * What Reality Defender reported, in Faike's terms. Optional fields are
 * present only when RD returned usable data for them.
 */
export interface ScanAnalysis {
  mediaType?: MediaType;
  /** From RD's ensemble (overall) result, the primary result. */
  verdict: Verdict;
  /** 0..1 ensemble model output score, not a probability. Only with a meter verdict. */
  ensembleScore?: number;
  /** BCP 47 code of the first detected language Faike recognises. */
  language?: string;
  /** RD reason codes, only with a not_applicable verdict. */
  notApplicableReasons?: string[];
  /** Per-model detail; secondary to the verdict. Names are RD's data. */
  models: ModelResult[];
  /**
   * Image heat maps from non-ensemble models that flagged the image, only
   * when the verdict is suspicious or artificial. `url` is Faike's own
   * address (heatmapPath), which always serves the current PNG; RD's
   * expiring storage links never reach the browser.
   */
  heatmaps?: { model: string; url: string }[];
  /** Text: RD returned an explanation page; the browser opens it through GET /api/scans/{requestId}/explainability. */
  hasExplainability?: true;
  /** Video with sound: the final verdict of RD's separate check of the extracted audio. */
  sound?: { verdict: Verdict };
  /** ISO 8601 time RD recorded the upload. */
  uploadedAt?: string;
}

export const API_ERROR_CODES = [
  "invalid_request",
  "unsupported",
  /** The kind of check is switched off for this deployment (src/config/capabilities.ts). */
  "disabled",
  "too_large",
  "not_found",
  "rejected",
  "rate_limited",
  "timeout",
  "unavailable",
  "upstream_error",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

/** Faike's same-origin address for one detector's heat map (GET /api/scans/{requestId}/heatmap). */
export function heatmapPath(requestId: string, model: string): string {
  return `/api/scans/${encodeURIComponent(requestId)}/heatmap?model=${encodeURIComponent(model)}`;
}
