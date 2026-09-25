import { apiError, upstreamFailure } from "@/lib/api/respond";
import { heatmapSources } from "@/lib/rd/adapter";
import { rdClientFromEnv } from "@/lib/rd/client";
import { RdError } from "@/lib/rd/errors";
import { fetchPresigned } from "@/lib/rd/presigned";
import { isRequestId } from "@/lib/scan/api-input";

/*
 * GET /api/scans/{requestId}/heatmap?model={name} → image/png
 *
 * One detector's heat map for an image check. RD stores heat maps behind
 * pre-signed links that expire after 15 minutes and do not allow the browser
 * to read their pixels, which Faike needs to draw them in its own colours.
 * Each request re-reads the media detail, takes that detector's current
 * link, fetches the PNG server-side (no RD key; see fetchPresigned) and
 * returns it from Faike's own origin. Only a heat map RD marks as usable,
 * for a suspicious or artificial result, is served (heatmapSources). The
 * link comes only from RD's response, never from the request. The PNG is
 * RD's output, not the person's photo, and nothing is stored.
 */

export const maxDuration = 30;

/** Below Vercel's 4.5 MB response limit. RD's heat maps are mostly transparent PNGs (tens of KB). */
const MAX_BYTES = 4_000_000;
const MAX_MODEL_NAME = 200;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export async function GET(request: Request, context: RouteContext<"/api/scans/[requestId]/heatmap">) {
  const { requestId } = await context.params;
  const model = new URL(request.url).searchParams.get("model");
  if (!isRequestId(requestId) || !model || model.length > MAX_MODEL_NAME) return apiError("not_found");

  try {
    const rd = rdClientFromEnv();
    const source = heatmapSources(await rd.getMediaDetail(requestId)).find((heatmap) => heatmap.model === model);
    if (!source) return apiError("not_found", "There is no heat map for this check.");

    const { bytes } = await fetchPresigned(source.url, { trustedOrigin: rd.origin, maxBytes: MAX_BYTES });
    if (!PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) throw new RdError("bad_response");
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    return upstreamFailure("heatmap", error);
  }
}
