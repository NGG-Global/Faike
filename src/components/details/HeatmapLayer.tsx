"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { HEATMAP_DRAWING } from "@/config/heatmap";
import { paintHeatmap, parseHexColor, type HeatmapPalette } from "@/lib/scan/heatmap";

/*
 * One of RD's heat maps drawn over the photo in the signal colours
 * (HANDOFF §7.5). The PNG comes from Faike's own origin
 * (GET /api/scans/{requestId}/heatmap, or a bundled sample for the mock), so
 * its pixels can be read and recoloured on a canvas. Colours are the
 * --signal-some and --signal-strong tokens, read from the page. The result of
 * each address is kept for the tab, so switching views never refetches.
 */

export type HeatmapStatus = "ready" | "empty" | "failed";

const painted = new Map<string, Promise<ImageData | null>>();
const RETRY_AFTER_MS = 1_500;

function loadPainted(url: string): Promise<ImageData | null> {
  let task = painted.get(url);
  if (!task) {
    task = paint(url);
    painted.set(url, task);
    // A failure is not remembered, so the next view tries again.
    task.catch(() => painted.delete(url));
  }
  return task;
}

async function paint(url: string): Promise<ImageData | null> {
  const blob = await fetchPng(url);
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, HEATMAP_DRAWING.maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("no canvas");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const image = context.getImageData(0, 0, width, height);
  return paintHeatmap(image.data, palette()) ? image : null;
}

/** One retry: the route reads RD afresh each time, so a passing hiccup does not cost the heat map. */
async function fetchPng(url: string): Promise<Blob> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { cache: "no-store" }).catch(() => undefined);
    if (response?.ok) return response.blob();
    if (attempt >= 1 || (response && response.status < 500)) throw new Error("heat map unavailable");
    await new Promise((resolve) => setTimeout(resolve, RETRY_AFTER_MS));
  }
}

function palette(): HeatmapPalette {
  const style = getComputedStyle(document.documentElement);
  const some = parseHexColor(style.getPropertyValue("--signal-some"));
  const strong = parseHexColor(style.getPropertyValue("--signal-strong"));
  if (!some || !strong) throw new Error("signal tokens missing");
  return { some, strong };
}

export function HeatmapLayer({ url, opacity, onStatus }: { url: string; opacity: number; onStatus: (status: HeatmapStatus) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const report = useEffectEvent(onStatus);

  useEffect(() => {
    let current = true;
    loadPainted(url).then(
      (image) => {
        const canvas = canvasRef.current;
        if (!current || !canvas) return;
        if (!image) return report("empty");
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.getContext("2d")?.putImageData(image, 0, 0);
        report("ready");
      },
      () => {
        if (current) report("failed");
      },
    );
    return () => {
      current = false;
    };
  }, [url]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full transition-opacity duration-(--dur-base) ease-out"
      style={{ opacity }}
    />
  );
}
