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

/**
 * Shaped after the live image check of 24 Sep 2026 (names replaced): the
 * ensemble has finished while several models are still ANALYZING, and the
 * social-link fields are present with neutral values on a file upload.
 */
export function liveImageDetail(overrides: Record<string, unknown> = {}) {
  return {
    requestId: REQUEST_ID,
    uploadedDate: "2026-09-24T23:02:50.908Z",
    mediaType: "IMAGE",
    socialLink: null,
    socialLinkDownloaded: false,
    socialLinkDownloadFailed: false,
    userId: "mock-user-id-123",
    institutionId: "mock-institution-id-456",
    overallStatus: "FAKE",
    resultsSummary: { status: "FAKE", metadata: { finalScore: 92 } },
    models: [
      { name: "mock-context-img", status: "AUTHENTIC", finalScore: 45, predictionNumber: 0.45, code: null, data: {} },
      { name: "mock-img-ensemble", status: "FAKE", finalScore: 92, code: null, data: null },
      { name: "mock-a-img", status: "ANALYZING", finalScore: null, predictionNumber: null, code: null, data: null },
      { name: "mock-full-a-img", status: "FAKE", finalScore: 99, predictionNumber: 0.99, code: null, data: {} },
      { name: "mock-full-b-img", status: "FAKE", finalScore: 80, predictionNumber: 0.8, code: null, data: {} },
      { name: "mock-b-img", status: "ANALYZING", finalScore: null, predictionNumber: null, code: null, data: null },
    ],
    heatmaps: {
      "mock-full-a-img": "https://mock-bucket.s3.us-east-1.amazonaws.com/heatmaps/a.png?X-Amz-Expires=900",
      "mock-full-b-img": "https://mock-bucket.s3.us-east-1.amazonaws.com/heatmaps/b.png?X-Amz-Expires=900",
      "mock-img-ensemble": "https://mock-bucket.s3.us-east-1.amazonaws.com/heatmaps/e.png?X-Amz-Expires=900",
    },
    ...overrides,
  };
}

export const AUDIO_REQUEST_ID = "7c1d2e3f-4a5b-4c6d-8e9f-a0b1c2d3e4f5";
const PRESIGNED = "https://mock-bucket.s3.us-east-1.amazonaws.com";

/** A voice note RD found authentic, with a detected language and an aggregation link. */
export function audioDetail(overrides: Record<string, unknown> = {}) {
  return {
    requestId: REQUEST_ID,
    uploadedDate: "2026-09-25T09:00:00.000Z",
    mediaType: "AUDIO",
    userId: "mock-user-id-123",
    institutionId: "mock-institution-id-456",
    overallStatus: "AUTHENTIC",
    resultsSummary: { status: "AUTHENTIC", metadata: { finalScore: 12, languages: ["english"] } },
    models: [
      { name: "mock-aud-a", status: "AUTHENTIC", finalScore: 10 },
      { name: "mock-aud-ensemble", status: "AUTHENTIC", finalScore: 12 },
    ],
    modelMetadataUrl: `${PRESIGNED}/aggregation.json?X-Amz-Expires=900`,
    explainabilityUrl: "",
    ...overrides,
  };
}

/** A video whose sound RD checked as a separate request. */
export function videoWithSoundDetail(overrides: Record<string, unknown> = {}) {
  return {
    requestId: REQUEST_ID,
    uploadedDate: "2026-09-25T09:00:00.000Z",
    mediaType: "VIDEO",
    userId: "mock-user-id-123",
    institutionId: "mock-institution-id-456",
    overallStatus: "SUSPICIOUS",
    resultsSummary: { status: "SUSPICIOUS", metadata: { finalScore: 55 } },
    showAudioResult: "True",
    audioRequestId: AUDIO_REQUEST_ID,
    models: [
      { name: "mock-vid-a", status: "SUSPICIOUS", finalScore: 60 },
      { name: "mock-vid-b", status: "ANALYZING", finalScore: null },
    ],
    thumbnail: `${PRESIGNED}/thumb.jpg?X-Amz-Expires=900`,
    modelMetadataUrl: `${PRESIGNED}/video/aggregation.json?X-Amz-Expires=900`,
    audioModelMetadataUrl: `${PRESIGNED}/audio/aggregation.json?X-Amz-Expires=900`,
    explainabilityUrl: "",
    ...overrides,
  };
}

/** The separate check of that video's sound. */
export function soundDetail(status = "FAKE") {
  return {
    requestId: AUDIO_REQUEST_ID,
    mediaType: "AUDIO",
    overallStatus: status,
    resultsSummary: status === "ANALYZING" ? null : { status, metadata: { finalScore: 81 } },
    models: [],
  };
}

/** A text check with RD's explanation page. */
export function textDetail(overrides: Record<string, unknown> = {}) {
  return {
    requestId: REQUEST_ID,
    uploadedDate: "2026-09-25T09:00:00.000Z",
    mediaType: "TEXT",
    userId: "mock-user-id-123",
    institutionId: "mock-institution-id-456",
    overallStatus: "FAKE",
    resultsSummary: { status: "FAKE", metadata: { finalScore: 88 } },
    models: [{ name: "mock-llm-txt", status: "FAKE", finalScore: 88 }],
    explainabilityUrl: `${PRESIGNED}/explainability-mock-txt.html?X-Amz-Expires=900`,
    ...overrides,
  };
}

/** A finished result carrying nothing optional at all. */
export function minimalDetail(mediaType: string, status = "AUTHENTIC") {
  return { requestId: REQUEST_ID, mediaType, overallStatus: status };
}
