import { apiError, json, upstreamFailure } from "@/lib/api/respond";
import { toScanStatus } from "@/lib/rd/adapter";
import { rdClientFromEnv } from "@/lib/rd/client";
import type { ScanStatusResponse } from "@/lib/scan/api";
import { isRequestId } from "@/lib/scan/api-input";

/*
 * GET /api/scans/{requestId} → ScanStatusResponse
 *
 * Reads Reality Defender's current media detail and answers in Faike's
 * terms: processing, failed (post not retrievable) or complete with the
 * analysis. RD's raw response, account identifiers and storage links other
 * than usable heat maps never reach the browser.
 */

// Covers the RD client's worst case: three 8-second attempts plus back-off.
export const maxDuration = 30;

export async function GET(_request: Request, context: RouteContext<"/api/scans/[requestId]">) {
  const { requestId } = await context.params;
  if (!isRequestId(requestId)) return apiError("not_found");

  try {
    const detail = await rdClientFromEnv().getMediaDetail(requestId);
    return json<ScanStatusResponse>(toScanStatus(requestId, detail));
  } catch (error) {
    return upstreamFailure("media detail", error);
  }
}
