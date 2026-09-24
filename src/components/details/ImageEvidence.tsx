"use client";

import { useId } from "react";
import { cx } from "@/lib/cx";
import type { Region } from "@/lib/scan/types";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { NumberBadge, SignalLegend } from "@/components/ui/Tags";

/*
 * Image evidence (HANDOFF §7.5, derived — first pass for design review).
 * Original / Side by side / Heat map. The heat map is RD's localisation
 * image, shown with an "Overlay strength" slider; regions get rounded
 * outlines with numbered badges and can be zoomed to. The legend says the
 * overlay shows where signs were picked up, not why.
 */

export type ImageView = "original" | "side" | "heatmap";

export function ImageEvidence({
  src,
  heatmapUrl,
  regions,
  view,
  onViewChange,
  overlay,
  onOverlayChange,
  zoom,
  onZoom,
}: {
  src: string;
  heatmapUrl?: string;
  regions: Region[];
  view: ImageView;
  onViewChange: (view: ImageView) => void;
  overlay: number;
  onOverlayChange: (value: number) => void;
  zoom: Region | null;
  onZoom: (region: Region | null) => void;
}) {
  const sliderId = useId();
  const options = heatmapUrl
    ? ([
        { value: "original", label: "Original" },
        { value: "side", label: "Side by side" },
        { value: "heatmap", label: "Heat map" },
      ] as const)
    : null;

  return (
    <section aria-label="Photo" className="rounded-md bg-surface p-4 sm:rounded-lg sm:p-7">
      {options || regions.length ? (
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 lg:flex-row lg:items-center lg:justify-between">
          {options ? (
            <SegmentedControl label="How to show the photo" options={options} value={view} onChange={onViewChange} className="w-full sm:w-auto" />
          ) : null}
          {/* The legend explains the region outlines. RD's heat map is a white
              intensity mask with its own caption, so it gets no legend. */}
          {regions.length ? <SignalLegend /> : null}
        </div>
      ) : null}

      {view === "side" && heatmapUrl ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <figure>
            <Frame src={src} />
            <figcaption className="mt-2 text-small font-semibold text-muted">Original</figcaption>
          </figure>
          <figure>
            <Frame src={src} heatmapUrl={heatmapUrl} overlay={overlay} />
            <figcaption className="mt-2 text-small font-semibold text-muted">Heat map</figcaption>
          </figure>
        </div>
      ) : (
        <Frame
          src={src}
          heatmapUrl={view === "heatmap" ? heatmapUrl : undefined}
          overlay={overlay}
          regions={view === "original" ? regions : []}
          zoom={view === "original" ? zoom : null}
          onZoom={onZoom}
        />
      )}

      {heatmapUrl && view !== "original" ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-small text-muted">The heat map shows where signs of AI were picked up, not why.</p>
          <div className="flex items-center gap-3">
            <label htmlFor={sliderId} className="text-small font-semibold whitespace-nowrap">
              Overlay strength
            </label>
            <input
              id={sliderId}
              type="range"
              min={0}
              max={100}
              step={5}
              value={overlay}
              onChange={(event) => onOverlayChange(Number(event.target.value))}
              className="h-11 w-full min-w-32 accent-ink sm:w-40"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Frame({
  src,
  heatmapUrl,
  overlay = 70,
  regions = [],
  zoom = null,
  onZoom,
}: {
  src: string;
  heatmapUrl?: string;
  overlay?: number;
  regions?: Region[];
  zoom?: Region | null;
  onZoom?: (region: Region | null) => void;
}) {
  const scale = zoom ? Math.min(3, 0.7 / Math.max(zoom.w, zoom.h)) : 1;
  const clamp = (v: number) => Math.min(0, Math.max(1 - scale, v));
  const tx = zoom ? clamp(0.5 - (zoom.x + zoom.w / 2) * scale) : 0;
  const ty = zoom ? clamp(0.5 - (zoom.y + zoom.h / 2) * scale) : 0;

  return (
    <div className="relative overflow-hidden rounded-md bg-bg text-center">
      <div
        className="relative inline-block max-w-full origin-top-left align-top transition-transform duration-(--dur-base) ease-out"
        style={{ transform: `translate(${tx * 100}%, ${ty * 100}%) scale(${scale})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local or bundled preview */}
        <img src={src} alt="The checked photo" className="block max-h-[70vh] max-w-full" />
        {heatmapUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- RD localisation image
          <img
            src={heatmapUrl}
            alt=""
            className="pointer-events-none absolute inset-0 size-full"
            style={{ opacity: overlay / 100 }}
          />
        ) : null}
        {regions.map((region) => (
          <button
            key={region.id}
            type="button"
            aria-label={`Area ${region.id}, ${region.strength === "strong" ? "strong" : "some"} signal. Zoom in.`}
            onClick={() => onZoom?.(zoom?.id === region.id ? null : region)}
            className={cx(
              // The ::before square keeps a 44px touch target on small screens.
              "absolute rounded-region border-[3px] before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-1/2 before:content-['']",
              region.strength === "strong" ? "border-signal-strong" : "border-signal-some",
            )}
            style={{
              left: `${region.x * 100}%`,
              top: `${region.y * 100}%`,
              width: `${region.w * 100}%`,
              height: `${region.h * 100}%`,
            }}
          >
            <NumberBadge n={region.id} size={26} className="absolute -top-3 -left-3" />
          </button>
        ))}
      </div>
      {zoom ? (
        <button
          type="button"
          onClick={() => onZoom?.(null)}
          className="absolute top-3 right-3 inline-flex h-11 items-center rounded-pill border-[1.5px] border-ink bg-surface px-4 text-small font-semibold hover:text-verdict-authentic-fg"
        >
          Show whole photo
        </button>
      ) : null}
    </div>
  );
}
