import { apiError, upstreamFailure } from "@/lib/api/respond";
import { rdClientFromEnv } from "@/lib/rd/client";
import { isRequestId } from "@/lib/scan/api-input";

/*
 * GET /api/scans/{requestId}/explainability → 302 to RD's explanation page
 *
 * RD returns text explanations as a pre-signed HTML page that expires
 * after 15 minutes. Each request re-reads the media detail and redirects to
 * a fresh URL, so an open result never points at an expired page. The page
 * is never copied or inserted into Faike's own HTML: the browser opens it
 * on RD's storage origin, in a sandboxed iframe (no scripts) or a new tab.
 * The redirect target comes only from RD's response, never from the
 * request, so this is not an open redirect.
 */

export const maxDuration = 30;

export async function GET(_request: Request, context: RouteContext<"/api/scans/[requestId]/explainability">) {
  const { requestId } = await context.params;
  if (!isRequestId(requestId)) return apiError("not_found");

  try {
    const detail = await rdClientFromEnv().getMediaDetail(requestId);
    if (detail.mediaType !== "TEXT" || !detail.explainabilityUrl) {
      return apiError("not_found", "There is no explanation for this check.");
    }
    return new Response(null, {
      status: 302,
      headers: { Location: detail.explainabilityUrl, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch (error) {
    return upstreamFailure("explainability", error);
  }
}
