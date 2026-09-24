import { apiError, json, readJsonBody, upstreamFailure } from "@/lib/api/respond";
import { rdClientFromEnv } from "@/lib/rd/client";
import type { SocialResponse } from "@/lib/scan/api";
import { parseSocialRequest } from "@/lib/scan/api-input";

/*
 * POST /api/scans/social
 * { url } → { requestId }
 *
 * Submits a link from a supported platform to Reality Defender, which
 * downloads the post itself. Faike never fetches or re-hosts the media.
 */

// Covers the RD client's worst case: three 8-second attempts plus back-off.
export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const input = parseSocialRequest(body.value);
  if (!input.ok) return apiError(input.code, input.message);

  try {
    const submission = await rdClientFromEnv().submitSocialLink(input.value.url);
    return json<SocialResponse>({ requestId: submission.requestId });
  } catch (error) {
    return upstreamFailure("social", error);
  }
}
