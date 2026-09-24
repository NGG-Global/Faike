"use client";

import { useEffect, useState } from "react";

/*
 * Waveform peaks decoded from the real audio (HANDOFF §6.17: never a
 * decorative pattern). Decoding happens in the browser; results are cached
 * per source for the session.
 */

const BUCKETS = 800;
const cache = new Map<string, number[]>();

async function decodePeaks(src: string): Promise<number[]> {
  const response = await fetch(src);
  const data = await response.arrayBuffer();
  const context = new OfflineAudioContext(1, 1, 44_100);
  const buffer = await context.decodeAudioData(data);
  const samples = buffer.getChannelData(0);
  const size = Math.max(1, Math.floor(samples.length / BUCKETS));
  const peaks: number[] = [];
  let max = 0;
  for (let i = 0; i < BUCKETS; i += 1) {
    let peak = 0;
    const end = Math.min(samples.length, (i + 1) * size);
    for (let j = i * size; j < end; j += 1) peak = Math.max(peak, Math.abs(samples[j]));
    peaks.push(peak);
    max = Math.max(max, peak);
  }
  return max > 0 ? peaks.map((p) => Math.pow(p / max, 0.8)) : peaks;
}

/**
 * Normalised peaks (0..1), null while decoding, or an empty array when the
 * audio can't be decoded (callers then draw a flat placeholder).
 */
export function useAudioPeaks(src?: string): number[] | null {
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (!src || cache.has(src)) return;
    let active = true;
    decodePeaks(src)
      .catch(() => [])
      .then((peaks) => {
        cache.set(src, peaks);
        if (active) setVersion((v) => v + 1);
      });
    return () => {
      active = false;
    };
  }, [src]);
  return src ? (cache.get(src) ?? null) : [];
}

/** Resamples peaks to `count` bars (max of each group). */
export function resamplePeaks(peaks: number[], count: number): number[] {
  if (count <= 0) return [];
  if (!peaks.length) return Array.from({ length: count }, () => 0);
  return Array.from({ length: count }, (_, i) => {
    const start = Math.floor((i * peaks.length) / count);
    const end = Math.max(start + 1, Math.floor(((i + 1) * peaks.length) / count));
    let max = 0;
    for (let j = start; j < end; j += 1) max = Math.max(max, peaks[j]);
    return max;
  });
}
