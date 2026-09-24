import { describe, expect, it } from "vitest";
import { RdError } from "./errors";
import { parseMediaDetail, parsePresignedUploadResponse, parseSocialUploadResponse } from "./parse";
import { imageDetail, PRESIGN_RESPONSE, REQUEST_ID, SIGNED_URL, SOCIAL_RESPONSE } from "./rd-responses.fixture";

function badResponse(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return error instanceof RdError && error.kind === "bad_response";
  }
  return false;
}

describe("parsePresignedUploadResponse", () => {
  it("reads the verified envelope: signedUrl under response, requestId at the top", () => {
    expect(parsePresignedUploadResponse(PRESIGN_RESPONSE)).toEqual({
      response: { signedUrl: SIGNED_URL },
      requestId: REQUEST_ID,
    });
  });

  it("keeps the signed URL byte-for-byte", () => {
    expect(parsePresignedUploadResponse(PRESIGN_RESPONSE).response.signedUrl).toBe(SIGNED_URL);
  });

  it("does not guess other envelopes", () => {
    const { requestId, response } = PRESIGN_RESPONSE;
    expect(badResponse(() => parsePresignedUploadResponse({ response: { signedUrl: SIGNED_URL, requestId } }))).toBe(true);
    expect(badResponse(() => parsePresignedUploadResponse({ signedUrl: SIGNED_URL, requestId }))).toBe(true);
    expect(badResponse(() => parsePresignedUploadResponse({ response }))).toBe(true);
    expect(badResponse(() => parsePresignedUploadResponse({ data: PRESIGN_RESPONSE }))).toBe(true);
  });

  it("refuses unsafe or malformed values", () => {
    const cases = [
      null,
      "text",
      [],
      { ...PRESIGN_RESPONSE, requestId: "../other" },
      { ...PRESIGN_RESPONSE, requestId: 12 },
      { ...PRESIGN_RESPONSE, response: { signedUrl: "http://mock-bucket.s3.amazonaws.com/a" } },
      { ...PRESIGN_RESPONSE, response: { signedUrl: "not a url" } },
      { ...PRESIGN_RESPONSE, response: null },
    ];
    for (const json of cases) expect(badResponse(() => parsePresignedUploadResponse(json)), JSON.stringify(json)).toBe(true);
  });
});

describe("parseSocialUploadResponse", () => {
  it("reads the top-level requestId", () => {
    expect(parseSocialUploadResponse(SOCIAL_RESPONSE)).toEqual({ requestId: REQUEST_ID });
  });

  it("refuses a response without a usable requestId", () => {
    for (const json of [{}, { requestId: null }, { response: { requestId: REQUEST_ID } }, null]) {
      expect(badResponse(() => parseSocialUploadResponse(json))).toBe(true);
    }
  });
});

describe("parseMediaDetail", () => {
  it("keeps only the fields Faike uses", () => {
    const detail = parseMediaDetail(imageDetail());
    expect(detail).toMatchObject({
      requestId: REQUEST_ID,
      mediaType: "IMAGE",
      overallStatus: "FAKE",
      uploadedDate: "2026-09-24T10:15:00.000Z",
      resultsSummary: { status: "FAKE", metadata: { finalScore: 87 } },
    });
    expect(detail.models.map((model) => model.name)).toEqual(["mock-img-a", "mock-img-b", "mock-img-ensemble", "mock-vid-a"]);
    const text = JSON.stringify(detail);
    for (const secret of ["mock-user-id-123", "mock-institution-id-456", "holiday-photo-of-anna", "original.jpg", "aggregation.json"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("treats null, missing and wrongly typed fields as absent", () => {
    const detail = parseMediaDetail({
      requestId: REQUEST_ID,
      mediaType: 7,
      overallStatus: null,
      uploadedDate: "yesterday",
      socialLinkDownloadFailed: "true",
      resultsSummary: { status: ["FAKE"], metadata: { finalScore: "87", languages: "english", reasons: [{ message: "no code" }, "x"] } },
      models: [{ status: "FAKE" }, { name: "" }, null, { name: "mock-ok", finalScore: Number.NaN, status: 3 }],
      heatmaps: { "mock-img-a": "http://insecure.example/h.png", "": "https://mock.example/h.png" },
    });
    expect(detail).toEqual({
      requestId: REQUEST_ID,
      mediaType: undefined,
      overallStatus: undefined,
      uploadedDate: undefined,
      socialLinkDownloaded: undefined,
      socialLinkDownloadFailed: undefined,
      resultsSummary: { status: undefined, metadata: { finalScore: undefined, languages: undefined, reasons: [] }, error: undefined },
      models: [{ name: "mock-ok", status: undefined, finalScore: undefined, code: undefined }],
      heatmaps: undefined,
    });
  });

  it("accepts a result that is still in progress", () => {
    const detail = parseMediaDetail({ requestId: REQUEST_ID, overallStatus: "analyzing", resultsSummary: null, models: "none" });
    expect(detail.overallStatus).toBe("ANALYZING");
    expect(detail.resultsSummary).toBeUndefined();
    expect(detail.models).toEqual([]);
  });

  it("refuses a body that is not an object", () => {
    for (const json of [null, "ok", [imageDetail()], 5]) expect(badResponse(() => parseMediaDetail(json))).toBe(true);
  });
});
