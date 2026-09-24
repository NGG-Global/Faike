"use client";

import type { PointerEvent } from "react";
import type { MediaPlayback } from "@/hooks/useMediaPlayback";
import { cx } from "@/lib/cx";
import { formatDuration } from "@/lib/format";
import { LANE_LABEL } from "@/lib/scan/copy";
import type { Lane, Segment } from "@/lib/scan/types";
import { NumberBadge, SignalLegend } from "@/components/ui/Tags";

/*
 * Video evidence (HANDOFF §7.5, derived — first pass for design review).
 * The native player provides accessible, frame-accurate scrubbing. Below
 * it, two lanes, "Picture" and "Sound", show flagged segments as bands with
 * numbered badges, scene cuts as ticks (only if RD provides them) and the
 * playhead. The lanes are a pointer shortcut; the moments list and the
 * player offer the same by keyboard.
 */

const LANES: Lane[] = ["picture", "sound"];

export function VideoEvidence({
  src,
  poster,
  segments,
  sceneCuts,
  player,
}: {
  src: string;
  poster?: string;
  segments: Segment[];
  sceneCuts?: number[];
  player: MediaPlayback;
}) {
  const { bind, seek, duration, time } = player;
  const percent = (seconds: number) => (duration ? Math.min(100, (seconds / duration) * 100) : 0);

  function seekFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    seek(((event.clientX - rect.left) / rect.width) * duration);
  }

  return (
    <section aria-label="Video" className="rounded-md bg-surface p-4 sm:rounded-lg sm:p-7">
      <video
        ref={bind}
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        className="block max-h-[60vh] w-full rounded-md bg-ink"
      />

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-small font-semibold">Where Faike reacted</p>
        <SignalLegend />
      </div>

      <div className="mt-3 flex gap-3" aria-hidden="true">
        <div className="flex w-17 shrink-0 flex-col gap-2 pt-4 sm:w-20">
          {LANES.map((lane) => (
            <span key={lane} className="flex h-9 items-center text-caption font-semibold text-muted">
              {LANE_LABEL[lane]}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="relative h-2">
            {sceneCuts?.map((cut) => (
              <span key={cut} className="absolute top-0 h-2 w-px bg-muted" style={{ left: `${percent(cut)}%` }} />
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {LANES.map((lane) => (
              <LaneTrack
                key={lane}
                segments={segments.filter((s) => (s.lane ?? "picture") === lane)}
                percent={percent}
                onPointerDown={seekFromPointer}
              />
            ))}
          </div>
          <div className="relative mt-2 h-4 text-micro font-semibold text-muted tabular-nums">
            <span className="absolute left-0">0:00</span>
            <span className="absolute right-0">{formatDuration(duration)}</span>
          </div>
          <div
            className="pointer-events-none absolute top-3 h-[88px] w-0.5 rounded-[2px] bg-ink"
            style={{ left: `${percent(time)}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function LaneTrack({
  segments,
  percent,
  onPointerDown,
}: {
  segments: Segment[];
  percent: (seconds: number) => number;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="relative h-9 cursor-pointer touch-none rounded-row bg-neutral-track" onPointerDown={onPointerDown}>
      {segments.map((s) => (
        <div
          key={s.id}
          className={cx(
            "absolute inset-y-0 flex items-center overflow-hidden rounded-row pl-1",
            s.strength === "strong" ? "bg-signal-strong" : "bg-signal-some-legend",
          )}
          style={{ left: `${percent(s.startSec)}%`, width: `${percent(s.endSec - s.startSec)}%` }}
        >
          <NumberBadge n={s.id} size={26} />
        </div>
      ))}
    </div>
  );
}
