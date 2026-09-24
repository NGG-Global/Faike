"use client";

import { useRef } from "react";
import { resamplePeaks, useAudioPeaks } from "@/hooks/useAudioPeaks";
import { useElementWidth } from "@/hooks/useElementWidth";
import { useVideoFrames } from "@/hooks/useVideoFrames";
import { cx } from "@/lib/cx";
import type { MediaRef } from "@/lib/scan/job";
import type { MediaType } from "@/lib/scan/types";
import { Icon } from "@/components/ui/Icon";

/*
 * The 96px visual inside the analysis card (HANDOFF §6.8, §7.3): the
 * highlighter sweep over a picture of what is being checked. With real
 * progress the band grows to the percentage with a 3px ink playhead; with
 * status only, a 30%-wide band loops (static under reduced motion). No
 * percentage is ever invented.
 */

export function AnalysisVisual({
  mediaType,
  media,
  text,
  progress,
}: {
  mediaType: MediaType;
  media?: MediaRef;
  text?: string;
  progress: number | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref);

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-label="Check progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress ?? undefined}
      aria-valuetext={progress === null ? "Still checking" : `${progress}%`}
      className="relative h-24 overflow-hidden rounded-region"
    >
      {mediaType === "audio" ? (
        <>
          <Sweep progress={progress} />
          <AudioBars src={media?.src} width={width} progress={progress} />
        </>
      ) : mediaType === "image" ? (
        <>
          {media ? (
            // eslint-disable-next-line @next/next/no-img-element -- local or bundled preview
            <img src={media.src} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <Placeholder />
          )}
          <Sweep progress={progress} overMedia />
        </>
      ) : mediaType === "video" ? (
        <>
          <Filmstrip media={media} width={width} />
          <Sweep progress={progress} overMedia />
        </>
      ) : (
        <>
          <Sweep progress={progress} />
          <p className="relative line-clamp-3 px-1 py-1.5 text-body-lg leading-[1.6] text-ink-soft">{text}</p>
        </>
      )}
      <Playhead progress={progress} />
    </div>
  );
}

function Sweep({ progress, overMedia = false }: { progress: number | null; overMedia?: boolean }) {
  const tone = overMedia ? "inset-y-0 bg-highlight/45 mix-blend-multiply" : "inset-y-2.5 bg-highlight-soft";
  if (progress === null) {
    return <div aria-hidden="true" className={cx("sweep-loop absolute left-0 w-[30%] rounded-region", tone)} />;
  }
  return (
    <div
      aria-hidden="true"
      className={cx("absolute left-0 rounded-region transition-[width] duration-(--dur-base) ease-out", tone)}
      style={{ width: `${progress}%` }}
    />
  );
}

function Playhead({ progress }: { progress: number | null }) {
  if (progress === null) return null;
  return (
    <div
      aria-hidden="true"
      className="absolute inset-y-0 w-[3px] rounded-[2px] bg-ink transition-[left] duration-(--dur-base) ease-out"
      style={{ left: `calc(${progress}% - 1.5px)` }}
    />
  );
}

function AudioBars({ src, width, progress }: { src?: string; width: number; progress: number | null }) {
  const peaks = useAudioPeaks(src);
  const count = Math.max(8, Math.floor((width - 12) / 9));
  const bars = resamplePeaks(peaks ?? [], count);
  return (
    <div aria-hidden="true" className="absolute inset-0 flex items-center gap-[3px] px-1.5">
      {bars.map((peak, index) => {
        const done = progress !== null && ((index + 0.5) / count) * 100 <= progress;
        return (
          <span
            key={index}
            className={cx("w-1.5 shrink-0 rounded-[3px]", done ? "bg-ink" : "bg-line-dashed")}
            style={{ height: `${10 + peak * 72}px` }}
          />
        );
      })}
    </div>
  );
}

function Filmstrip({ media, width }: { media?: MediaRef; width: number }) {
  const count = Math.min(6, Math.max(2, Math.ceil(width / 171)));
  const frames = useVideoFrames(media?.src, width ? count : 0);
  return (
    <div aria-hidden="true" className="absolute inset-0 flex gap-1">
      {Array.from({ length: count }, (_, index) => {
        const src = frames?.[index] ?? media?.posterSrc;
        return src ? (
          // eslint-disable-next-line @next/next/no-img-element -- frames sampled in the browser
          <img key={index} src={src} alt="" className="h-full min-w-0 flex-1 object-cover" />
        ) : (
          <div key={index} className="h-full flex-1 bg-bg" />
        );
      })}
    </div>
  );
}

function Placeholder() {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-bg text-muted">
      <Icon name="image" size={28} />
    </div>
  );
}
