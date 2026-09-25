import { apiError, json, upstreamFailure } from "@/lib/api/respond";
import { audioRequestFor, toScanStatus } from "@/lib/rd/adapter";
import { aggregationShapeLoggingEnabled, describeShape, fetchAggregation } from "@/lib/rd/aggregation";
import { rdClientFromEnv, type RdClient } from "@/lib/rd/client";
import type { RdMediaDetail } from "@/lib/rd/types";
import type { ScanStatusResponse } from "@/lib/scan/api";
import { isRequestId } from "@/lib/scan/api-input";

/*
 * GET /api/scans/{requestId} → ScanStatusResponse
 *
 * Reads Reality Defender's current media detail and answers in Faike's
 * terms: processing, failed (post not retrievable) or complete with the
 * analysis. For a video whose sound RD checked separately, the audio
 * result is read too and reported beside the overall verdict. RD's raw
 * response, account identifiers and storage links other than usable heat
 * maps never reach the browser.
 */

// Covers the RD client's worst case: three 8-second attempts plus back-off.
export const maxDuration = 30;

export async function GET(_request: Request, context: RouteContext<"/api/scans/[requestId]">) {
  const { requestId } = await context.params;
  if (!isRequestId(requestId)) return apiError("not_found");

  try {
    const rd = rdClientFromEnv();
    const detail = await rd.getMediaDetail(requestId);
    let status = toScanStatus(requestId, detail);
    if (status.state === "complete") {
      const audioId = audioRequestFor(detail);
      if (audioId) {
        // Secondary detail: if the sound result cannot be read, the overall result still stands.
        const audio = await rd.getMediaDetail(audioId).catch(() => undefined);
        if (audio) status = toScanStatus(requestId, detail, audio);
      }
      if (aggregationShapeLoggingEnabled()) await logAggregationShapes(rd, detail);
    }
    return json<ScanStatusResponse>(status);
  } catch (error) {
    return upstreamFailure("media detail", error);
  }
}

/** Development aid (REALITY_DEFENDER_LOG_AGGREGATION_SHAPE=1): keys, types and ranges only, never values. */
async function logAggregationShapes(rd: RdClient, detail: RdMediaDetail) {
  const sources = [
    ["main", detail.modelMetadataUrl],
    ["audio", detail.audioModelMetadataUrl],
  ] as const;
  for (const [which, url] of sources) {
    if (!url) continue;
    try {
      const shape = describeShape(await fetchAggregation(url, { trustedOrigin: rd.origin }));
      console.info(`[rd] aggregation shape (${detail.mediaType ?? "unknown"}, ${which})`, JSON.stringify(shape));
    } catch (error) {
      console.info(`[rd] aggregation shape (${which}) unavailable`, { name: error instanceof Error ? error.name : typeof error });
    }
  }
}
