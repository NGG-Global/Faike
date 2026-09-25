/*
 * Temporary upload route. Reality Defender's upload server grants browser
 * uploads (CORS) only to RD's own web app, so a browser on Faike's domain
 * cannot PUT to it directly (checked 24 and 25 Sep 2026; progress.md).
 *
 * While `enabled` is on, the presign route hands the browser the same
 * signed URL on Faike's own domain (`/rd-upload/{id}?token=…`), and the
 * rewrite in next.config.ts forwards the request unchanged to `target`.
 * On Vercel the rewrite is served by Vercel's network (an external
 * rewrite), not by a Faike function: the file is forwarded, never stored,
 * and the RD key is never involved. Vercel limits a forwarded request to
 * 120 seconds.
 *
 * Switch off once RD allows Faike's web addresses; the browser then uploads
 * straight to RD again. `target` is the upload address RD's live responses
 * use (RD documents no fixed form); a signed URL anywhere else is passed
 * through unchanged.
 */

export interface UploadProxy {
  enabled: boolean;
  /** Same-origin path the browser uploads to. */
  path: string;
  /** RD's upload endpoint; the only destination the rewrite forwards to. */
  target: string;
}

export const RD_UPLOAD_PROXY: UploadProxy = {
  enabled: true,
  path: "/rd-upload",
  target: "https://api.prd.realitydefender.xyz/api/files",
};

/** Upload ids the rewrite accepts; RD's are UUIDs. */
export const UPLOAD_ID_PATTERN = "[A-Za-z0-9_-]{1,128}";
