import { describe, expect, it } from "vitest";
import type { UploadProxy } from "@/config/upload";
import { browserUploadUrl } from "./upload";

const proxy: UploadProxy = { enabled: true, path: "/rd-upload", target: "https://api.prd.realitydefender.xyz/api/files" };
const ID = "3f8a1c2e-9b7d-4e5f-a6b1-c2d3e4f5a6b7";
const RD_URL = `https://api.prd.realitydefender.xyz/api/files/${ID}?token=abc.def-ghi`;

describe("browserUploadUrl", () => {
  it("moves RD's upload URL onto Faike's domain, keeping the token", () => {
    expect(browserUploadUrl(RD_URL, proxy)).toBe(`/rd-upload/${ID}?token=abc.def-ghi`);
  });

  it("leaves the URL alone when the proxy is off", () => {
    expect(browserUploadUrl(RD_URL, { ...proxy, enabled: false })).toBe(RD_URL);
  });

  it("converts only the exact target, with a plain id", () => {
    for (const url of [
      `https://mock-bucket.s3.amazonaws.com/uploads/${ID}?X-Amz-Signature=x`,
      `http://api.prd.realitydefender.xyz/api/files/${ID}?token=x`,
      `https://api.prd.realitydefender.xyz/api/media/${ID}?token=x`,
      `https://api.prd.realitydefender.xyz/api/files/a/b?token=x`,
      `https://api.prd.realitydefender.xyz/api/files/..%2Fmedia?token=x`,
      `https://api.prd.realitydefender.xyz/api/files/?token=x`,
      `https://user:pw@api.prd.realitydefender.xyz/api/files/${ID}?token=x`,
      `https://api.prd.realitydefender.xyz/api/files/${ID}?token=x#frag`,
      "not a url",
    ]) {
      expect(browserUploadUrl(url, proxy), url).toBe(url);
    }
  });
});
