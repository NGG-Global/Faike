import { HEATMAP_DRAWING } from "@/config/heatmap";

/*
 * Draws one of RD's heat maps in Faike's signal colours (HANDOFF §7.5), in
 * place on RGBA pixel data. The intensity of a pixel is its opacity times its
 * brightness, so RD's white-on-transparent masks and plain greyscale maps
 * both work. Each map is scaled to its own strongest point: the overlay
 * shows where that detector reacted most in this photo, relative to the
 * rest of it. It says nothing about how strong the overall result is; the
 * verdict does that.
 */

export type Rgb = readonly [number, number, number];

export interface HeatmapPalette {
  some: Rgb;
  strong: Rgb;
}

type Drawing = { readonly [K in keyof typeof HEATMAP_DRAWING]: number };

/** Returns false, leaving every pixel clear, when the map marks nothing visible. */
export function paintHeatmap(pixels: Uint8ClampedArray, palette: HeatmapPalette, drawing: Drawing = HEATMAP_DRAWING): boolean {
  const peak = strongestPoint(pixels, drawing.peakPercentile);
  if (peak < drawing.minPeak) {
    pixels.fill(0);
    return false;
  }
  const { some, strong } = palette;
  for (let i = 0; i < pixels.length; i += 4) {
    const t = Math.min(1, intensity(pixels, i) / peak);
    if (t < drawing.floor) {
      pixels[i] = pixels[i + 1] = pixels[i + 2] = pixels[i + 3] = 0;
      continue;
    }
    const mix = Math.min(1, (t - drawing.floor) / (drawing.strongFrom - drawing.floor));
    const reach = (t - drawing.floor) / (1 - drawing.floor);
    pixels[i] = some[0] + (strong[0] - some[0]) * mix;
    pixels[i + 1] = some[1] + (strong[1] - some[1]) * mix;
    pixels[i + 2] = some[2] + (strong[2] - some[2]) * mix;
    pixels[i + 3] = 255 * (drawing.minAlpha + (1 - drawing.minAlpha) * reach);
  }
  return true;
}

function intensity(pixels: Uint8ClampedArray, i: number): number {
  return (pixels[i + 3] * (pixels[i] + pixels[i + 1] + pixels[i + 2])) / 765;
}

/** The intensity at the given percentile of marked (non-zero) pixels, 0–255. */
function strongestPoint(pixels: Uint8ClampedArray, percentile: number): number {
  const histogram = new Uint32Array(256);
  let marked = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const value = Math.round(intensity(pixels, i));
    if (value === 0) continue;
    histogram[value]++;
    marked++;
  }
  if (!marked) return 0;
  const target = Math.ceil(marked * percentile);
  let seen = 0;
  for (let value = 1; value < 256; value++) {
    seen += histogram[value];
    if (seen >= target) return value;
  }
  return 255;
}

/** "#E08A00" or "#E80" → [224, 138, 0]; undefined for anything else. */
export function parseHexColor(value: string): Rgb | undefined {
  const hex = value.trim().replace(/^#/, "");
  const full = /^[0-9a-f]{3}$/i.test(hex) ? [...hex].map((digit) => digit + digit).join("") : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return undefined;
  const channel = (start: number) => parseInt(full.slice(start, start + 2), 16);
  return [channel(0), channel(2), channel(4)];
}
