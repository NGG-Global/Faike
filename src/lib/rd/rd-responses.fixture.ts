/*
 * Reality Defender response bodies for unit tests, shaped after the
 * samples in RD's documentation (checked 24 Sep 2026). Model names are
 * invented and prefixed "mock-"; account ids, URLs and scores are
 * placeholders. Never used outside tests.
 */

export const REQUEST_ID = "3f2b8c1e-5d4a-4e7b-9c1f-0a2b3c4d5e6f";

/** A pre-signed URL with encoded characters that must survive untouched. */
export const SIGNED_URL =
  "https://mock-bucket.s3.amazonaws.com/uploads/abc.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=MOCK%2F20260924%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Signature=deadbeef";

export const PRESIGN_RESPONSE = {
  code: "ok",
  errno: 0,
  response: { signedUrl: SIGNED_URL },
  mediaId: "mock-media-id",
  requestId: REQUEST_ID,
};

export const SOCIAL_RESPONSE = { code: "ok", errno: 0, response: "Upload successful", requestId: REQUEST_ID };

export const HEATMAP_URL = "https://mock-bucket.s3.amazonaws.com/heatmaps/mock-img-a/heatmap.png?X-Amz-Expires=900";

/** A finished image check, including fields Faike must never pass on. */
export function imageDetail(overrides: Record<string, unknown> = {}) {
  return {
    filename: "rd-file-name",
    originalFileName: "holiday-photo-of-anna.jpg",
    requestId: REQUEST_ID,
    uploadedDate: "2026-09-24T10:15:00.000Z",
    mediaType: "IMAGE",
    userId: "mock-user-id-123",
    institutionId: "mock-institution-id-456",
    releaseVersion: "2.3.1",
    overallStatus: "FAKE",
    resultsSummary: {
      status: "FAKE",
      metadata: { finalScore: 87 },
    },
    models: [
      { name: "mock-img-a", data: { score: 0.91, decision: "ARTIFICIAL" }, status: "FAKE", predictionNumber: 0.91, normalizedPredictionNumber: 91, finalScore: 91, code: null },
      { name: "mock-img-b", data: { score: 0.2, decision: "AUTHENTIC" }, status: "AUTHENTIC", predictionNumber: 0.2, normalizedPredictionNumber: 20, finalScore: 20, code: null },
      { name: "mock-img-ensemble", data: null, status: "FAKE", predictionNumber: null, normalizedPredictionNumber: 87, finalScore: 87, code: null },
      { name: "mock-vid-a", data: null, status: "NOT_APPLICABLE", predictionNumber: null, normalizedPredictionNumber: null, finalScore: null, code: "not_applicable" },
    ],
    storageLocation: "https://mock-bucket.s3.amazonaws.com/original.jpg?X-Amz-Expires=900",
    thumbnail: "",
    aggregationResultUrl: "mock-institution-id-456/3f2b8c1e.jpg/aggregation.json",
    modelMetadataUrl: "https://mock-bucket.s3.amazonaws.com/aggregation.json?X-Amz-Expires=900",
    heatmaps: {
      "mock-img-a": HEATMAP_URL,
      "mock-img-b": "https://mock-bucket.s3.amazonaws.com/heatmaps/mock-img-b/heatmap.png",
      "mock-img-ensemble": "https://mock-bucket.s3.amazonaws.com/heatmaps/mock-img-ensemble/heatmap.png",
    },
    explainabilityUrl: "",
    ...overrides,
  };
}

/** A voice note RD found not applicable, with a documented reason. */
export function audioNotApplicableDetail() {
  return {
    requestId: REQUEST_ID,
    uploadedDate: "2026-09-24T10:15:00.000Z",
    mediaType: "AUDIO",
    userId: "mock-user-id-123",
    institutionId: "mock-institution-id-456",
    overallStatus: "NOT_APPLICABLE",
    resultsSummary: {
      status: "NOT_APPLICABLE",
      metadata: {
        languages: ["english"],
        finalScore: 50,
        reasons: [{ code: "cross-talk", message: "more than one speaker detected" }],
      },
    },
    models: [{ name: "mock-aud-a", status: "NOT_APPLICABLE", finalScore: null, code: "not_applicable", data: null }],
    heatmaps: {},
  };
}

/** A social post RD is still downloading. */
export function socialDownloadingDetail(overrides: Record<string, unknown> = {}) {
  return {
    requestId: REQUEST_ID,
    mediaType: "VIDEO",
    socialLink: "https://www.tiktok.com/@someone/video/1",
    socialLinkDownloaded: false,
    socialLinkDownloadFailed: false,
    userId: "mock-user-id-123",
    institutionId: "mock-institution-id-456",
    overallStatus: "DOWNLOADING",
    resultsSummary: null,
    models: [],
    ...overrides,
  };
}
