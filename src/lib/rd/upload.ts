import "server-only";
import { RD_UPLOAD_PROXY, UPLOAD_ID_PATTERN, type UploadProxy } from "@/config/upload";

const UPLOAD_ID = new RegExp(`^${UPLOAD_ID_PATTERN}$`);

/**
 * The address the browser uploads to. Normally RD's signed URL itself;
 * while the upload proxy is on, the same URL on Faike's own domain, so the
 * browser makes a same-origin request that next.config.ts forwards to RD.
 * Only a URL on the proxy's exact target, with a plain id, is converted;
 * anything else (a changed RD address, a local stub) is returned unchanged.
 */
export function browserUploadUrl(signedUrl: string, proxy: UploadProxy = RD_UPLOAD_PROXY): string {
  if (!proxy.enabled) return signedUrl;
  let url: URL;
  let target: URL;
  try {
    url = new URL(signedUrl);
    target = new URL(proxy.target);
  } catch {
    return signedUrl;
  }
  if (url.origin !== target.origin || url.username || url.password || url.hash) return signedUrl;
  const prefix = `${target.pathname.replace(/\/+$/, "")}/`;
  if (!url.pathname.startsWith(prefix)) return signedUrl;
  const id = url.pathname.slice(prefix.length);
  if (!UPLOAD_ID.test(id)) return signedUrl;
  return `${proxy.path}/${id}${url.search}`;
}
