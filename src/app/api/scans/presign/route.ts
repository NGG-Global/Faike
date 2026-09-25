import { apiError, json, readJsonBody, upstreamFailure } from "@/lib/api/respond";
import { rdClientFromEnv } from "@/lib/rd/client";
import { browserUploadUrl } from "@/lib/rd/upload";
import type { PresignResponse } from "@/lib/scan/api";
import { parsePresignRequest } from "@/lib/scan/api-input";

/*
 * POST /api/scans/presign
 * { fileName, mimeType, sizeBytes } → { requestId, uploadUrl }
 *
 * Asks Reality Defender for a pre-signed upload URL. The browser PUTs the
 * file to that URL (through the temporary same-origin rewrite while RD's
 * CORS excludes Faike; src/config/upload.ts), so media never passes through
 * Faike's functions, then polls GET /api/scans/{requestId}.
 */

// Covers the RD client's worst case: three 8-second attempts plus back-off.
export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const input = parsePresignRequest(body.value);
  if (!input.ok) return apiError(input.code, input.message);

  try {
    // RD needs only the extension. A random name keeps the person's own
    // file name out of RD's records.
    const upload = await rdClientFromEnv().requestPresignedUpload(`${crypto.randomUUID()}.${input.value.extension}`);
    return json<PresignResponse>({ requestId: upload.requestId, uploadUrl: browserUploadUrl(upload.response.signedUrl) });
  } catch (error) {
    return upstreamFailure("presign", error);
  }
}
