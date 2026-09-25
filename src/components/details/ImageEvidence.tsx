"use client";

import { useId } from "react";
import { cx } from "@/lib/cx";
import { RD_MODEL_NAMES_PUBLIC } from "@/config/rd";
import { HEATMAP_COPY } from "@/lib/scan/copy";
import { heatmapLabel } from "@/lib/scan/detectors";
import type { Region } from "@/lib/scan/types";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { NumberBadge, SignalLegend } from "@/components/ui/Tags";
import { HeatmapLayer, type HeatmapStatus } from "./HeatmapLayer";

/*
 * Image evidence (HANDOFF §7.5, derived — first pass for design review).
 * Original / Side by side / Heat map. Heat maps are RD's, one per detector
 * that flagged the image; with several, a picker names the detector. They
 * are drawn in the signal colours (HeatmapLayer) with an "Overlay strength"
 * slider, which also fades the photo underneath to grey so the colours
 * read on any photo. Whether each heat map loaded is reported through
 * onHeatmapStatus. Regions, when present, get rounded outlines with
 * numbered badges and can be zoomed to.
 */

export type ImageView = "original" | "side" | "heatmap";

export function ImageEvidence({
  src,
  heatmaps,
  heatmapIndex,
  onHeatmapIndexChange,
  onHeatmapStatus,
  regions,
  view,
  onViewChange,
  overlay,
  onOverlayChange,
  zoom,
  onZoom,
}: {
  src: string;
  heatmaps?: { label: string; url: string }[];
  heatmapIndex: number;
  onHeatmapIndexChange: (index: number) => void;
  onHeatmapStatus: (url: string, status: HeatmapStatus) => void;
  regions: Region[];
  view: ImageView;
  onViewChange: (view: ImageView) => void;
  overlay: number;
  onOverlayChange: (value: number) => void;
  zoom: Region | null;
  onZoom: (region: Region | null) => void;
}) {
  const sliderId = useId();
  const pickerId = useId();
  const heatmap = heatmaps?.[heatmapIndex] ?? heatmaps?.[0];
  const heatmapUrl = heatmap?.url;
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
            <Frame src={src} heatmapUrl={heatmapUrl} overlay={overlay} onHeatmapStatus={onHeatmapStatus} />
            <figcaption className="mt-2 text-small font-semibold text-muted">Heat map</figcaption>
          </figure>
        </div>
      ) : (
        <Frame
          src={src}
          heatmapUrl={view === "heatmap" ? heatmapUrl : undefined}
          onHeatmapStatus={onHeatmapStatus}
          overlay={overlay}
          regions={view === "original" ? regions : []}
          zoom={view === "original" ? zoom : null}
          onZoom={onZoom}
        />
      )}

      {heatmaps && heatmap && view !== "original" ? (
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-small text-muted">
            {HEATMAP_COPY.caption}
            {heatmaps.length === 1 && RD_MODEL_NAMES_PUBLIC ? ` From ${heatmap.label}.` : ""}
          </p>
          {heatmaps.length > 1 ? (
            <div className="flex items-center gap-3">
              <label htmlFor={pickerId} className="text-small font-semibold whitespace-nowrap">
                {RD_MODEL_NAMES_PUBLIC ? "Heat map from" : "Heat map"}
              </label>
              <select
                id={pickerId}
                value={heatmaps.indexOf(heatmap)}
                onChange={(event) => onHeatmapIndexChange(Number(event.target.value))}
                className="h-11 min-w-0 flex-1 rounded-pill border-[1.5px] border-line-strong bg-surface px-4 text-small font-semibold lg:flex-none"
              >
                {heatmaps.map((item, index) => (
                  <option key={item.label} value={index}>
                    {heatmapLabel(item.label, index)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
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
  onHeatmapStatus,
  overlay = 70,
  regions = [],
  zoom = null,
  onZoom,
}: {
  src: string;
  heatmapUrl?: string;
  onHeatmapStatus?: (url: string, status: HeatmapStatus) => void;
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
        <img
          src={src}
          alt="The checked photo"
          className="block max-h-[70vh] max-w-full transition-[filter] duration-(--dur-base) ease-out"
          style={heatmapUrl ? { filter: `grayscale(${overlay}%)` } : undefined}
        />
        {heatmapUrl ? (
          <HeatmapLayer url={heatmapUrl} opacity={overlay / 100} onStatus={(status) => onHeatmapStatus?.(heatmapUrl, status)} />
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
