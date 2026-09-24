"use client";

import { useRef } from "react";
import { resamplePeaks, useAudioPeaks } from "@/hooks/useAudioPeaks";
import { useElementWidth } from "@/hooks/useElementWidth";
import { useVideoFrames } from "@/hooks/useVideoFrames";
import { cx } from "@/lib/cx";
import { resultMeta, subjectName } from "@/lib/scan/facts";
import type { ScanJob } from "@/lib/scan/job";
import type { ScanResult } from "@/lib/scan/types";
import { FileTile } from "@/components/ui/FileTile";

/*
 * HANDOFF §6.13. A small preview of what was checked, its name and meta:
 * mini-waveform with flagged bars for audio, thumbnail for photos, poster
 * frame for video, first two lines for text; links show platform + handle.
 */

export function FileSummaryCard({ job, result, className }: { job: ScanJob; result: ScanResult; className?: string }) {
  return (
    <div className={cx("rounded-md bg-surface p-4.5", className)}>
      <Preview job={job} result={result} />
      <p className="mt-2.5 truncate text-ui font-bold">{subjectName(result, job.input)}</p>
      <p className="mt-0.5 text-caption text-muted">{resultMeta(result)}</p>
    </div>
  );
}

function Preview({ job, result }: { job: ScanJob; result: ScanResult }) {
  const { media } = job;
  if (result.mediaType === "text") {
    return <p className="line-clamp-2 text-small leading-[1.5] text-ink-soft">{job.input.text}</p>;
  }
  if (!media) return <FileTile mediaType={result.mediaType} />;
  if (result.mediaType === "audio") return <MiniWaveform src={media.src} result={result} />;
  if (result.mediaType === "video") return <Poster src={media.src} poster={media.posterSrc} />;
  // eslint-disable-next-line @next/next/no-img-element -- local or bundled preview
  return <img src={media.src} alt="" className="h-28 w-full rounded-tile object-cover" />;
}

function Poster({ src, poster }: { src: string; poster?: string }) {
  const frames = useVideoFrames(poster ? undefined : src, 1);
  const image = poster ?? frames?.[0];
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element -- local or bundled preview
    <img src={image} alt="" className="h-28 w-full rounded-tile object-cover" />
  ) : (
    <div className="h-28 w-full rounded-tile bg-bg" />
  );
}

/** 56px mini-waveform; bars inside flagged moments are coloured (03-result). */
export function MiniWaveform({ src, result }: { src: string; result: ScanResult }) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref);
  const peaks = useAudioPeaks(src);
  const count = Math.max(12, Math.floor((width + 2) / 6));
  const bars = resamplePeaks(peaks ?? [], count);
  const duration = result.file.durationSec ?? 0;

  return (
    <div ref={ref} aria-hidden="true" className="flex h-14 items-center gap-0.5">
      {bars.map((peak, index) => {
        const time = ((index + 0.5) / count) * duration;
        const segment = result.segments?.find((s) => time >= s.startSec && time <= s.endSec);
        return (
          <span
            key={index}
            className={cx(
              "w-1 shrink-0 rounded-[2px]",
              segment?.strength === "strong" ? "bg-signal-strong" : segment ? "bg-signal-some" : "bg-subtle",
            )}
            style={{ height: `${6 + peak * 40}px` }}
          />
        );
      })}
    </div>
  );
}
