/*
 * How RD's heat maps are drawn (src/lib/scan/heatmap.ts). RD's PNG is a
 * white mask whose transparency says how strongly one detector reacted; it
 * documents no scale. In a live check (24 Sep 2026) the map marked one
 * concentrated spot with a long, very faint fade: 90% of marked pixels were
 * under 7% intensity, so drawn as-is it disappears over a bright photo.
 *
 * Faike therefore scales each map to its own strongest point and draws it in
 * the signal palette (HANDOFF §7.5). The values below were tuned on that
 * live map; they are presentation choices, not RD values. Revisit with more
 * real maps or when RD documents the scale.
 */
export const HEATMAP_DRAWING = {
  /** The map's "strongest point": this share of its marked pixels is at or below it, so single stray pixels don't set the scale. */
  peakPercentile: 0.999,
  /** A map whose strongest point is below this (0–255) marks nothing visible and is reported as empty. */
  minPeak: 8,
  /** Below this share of the strongest point a pixel stays clear (RD's faint haze). */
  floor: 0.12,
  /** From this share of the strongest point the colour is fully `--signal-strong`; below it blends from `--signal-some`. */
  strongFrom: 0.55,
  /** Opacity of the faintest drawn pixel, so the edge of a marked area stays visible (0–1). */
  minAlpha: 0.35,
  /** Longest side the map is processed at; it is drawn stretched over the photo. */
  maxSide: 1600,
} as const;
