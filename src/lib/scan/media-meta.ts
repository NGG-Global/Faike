import { MEDIA } from "@/config/media";
import type { MediaType } from "./types";

/*
 * Reads a local file's own metadata in the browser (HANDOFF §9.3: validate
 * size, type and duration before upload, where the browser can read them).
 * Nothing leaves the device. Anything unreadable is simply left out.
 */

export interface MediaMeta {
  durationSec?: number;
  width?: number;
  height?: number;
  text?: string;
}

const TIMEOUT_MS = 5000;

export async function readMediaMeta(file: File, mediaType: MediaType): Promise<MediaMeta> {
  try {
    if (mediaType === "text") {
      return file.size <= MEDIA.text.maxBytes ? { text: await file.text() } : {};
    }
    if (mediaType === "image") return await readImage(file);
    return await readTimed(file, mediaType);
  } catch {
    return {};
  }
}

async function readImage(file: File): Promise<MediaMeta> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const meta = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return meta;
  }
  return {};
}

function readTimed(file: File, mediaType: "audio" | "video"): Promise<MediaMeta> {
  return new Promise((resolve) => {
    const element = document.createElement(mediaType);
    const url = URL.createObjectURL(file);
    const done = (meta: MediaMeta) => {
      clearTimeout(timer);
      element.removeAttribute("src");
      element.load();
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    const timer = setTimeout(() => done({}), TIMEOUT_MS);
    element.preload = "metadata";
    element.muted = true;
    element.onloadedmetadata = () => {
      const meta: MediaMeta = {};
      if (Number.isFinite(element.duration) && element.duration > 0) meta.durationSec = element.duration;
      if (element instanceof HTMLVideoElement && element.videoWidth) {
        meta.width = element.videoWidth;
        meta.height = element.videoHeight;
      }
      done(meta);
    };
    element.onerror = () => done({});
    element.src = url;
  });
}
