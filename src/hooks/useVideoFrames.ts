"use client";

import { useEffect, useState } from "react";

/*
 * Poster frames sampled from a local or bundled video for the analysing
 * filmstrip (HANDOFF §7.3). Frames stay in the browser; cached per source.
 */

const FRAME_WIDTH = 192;
const TIMEOUT_MS = 8000;
const cache = new Map<string, string[]>();

function waitFor(video: HTMLVideoElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS);
    const onEvent = () => {
      clearTimeout(timer);
      resolve();
    };
    const onError = () => {
      clearTimeout(timer);
      reject(new Error("error"));
    };
    video.addEventListener(event, onEvent, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

async function sampleFrames(src: string, count: number): Promise<string[]> {
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "auto";
  video.playsInline = true;
  video.src = src;
  await waitFor(video, "loadeddata");
  if (!Number.isFinite(video.duration) || !video.videoWidth) return [];
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_WIDTH;
  canvas.height = Math.round((FRAME_WIDTH * video.videoHeight) / video.videoWidth);
  const context = canvas.getContext("2d");
  if (!context) return [];
  const frames: string[] = [];
  for (let i = 0; i < count; i += 1) {
    video.currentTime = ((i + 0.5) / count) * video.duration;
    await waitFor(video, "seeked");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push(canvas.toDataURL("image/jpeg", 0.7));
  }
  video.removeAttribute("src");
  video.load();
  return frames;
}

/** Frame data URLs, null while sampling, empty when the video can't be read. */
export function useVideoFrames(src: string | undefined, count: number): string[] | null {
  const key = src && count > 0 ? `${src}|${count}` : undefined;
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (!key || !src || cache.has(key)) return;
    let active = true;
    sampleFrames(src, count)
      .catch(() => [])
      .then((frames) => {
        cache.set(key, frames);
        if (active) setVersion((v) => v + 1);
      });
    return () => {
      active = false;
    };
  }, [key, src, count]);
  return key ? (cache.get(key) ?? null) : [];
}
