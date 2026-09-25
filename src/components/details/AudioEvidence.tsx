"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { resamplePeaks, useAudioPeaks } from "@/hooks/useAudioPeaks";
import { useElementWidth } from "@/hooks/useElementWidth";
import type { MediaPlayback } from "@/hooks/useMediaPlayback";
import { cx } from "@/lib/cx";
import { formatDuration } from "@/lib/format";
import type { Segment } from "@/lib/scan/types";
import { Icon } from "@/components/ui/Icon";
import { NumberBadge, SignalLegend } from "@/components/ui/Tags";

/*
 * HANDOFF §6.17. Player with a waveform decoded from the real audio.
 * Flagged regions are bands behind the bars with numbered badges; bars are
 * coloured by region, then played (ink) or unplayed. The waveform is a
 * slider: click or drag to seek, arrows ±5s, Home/End, Space plays.
 */

const STEP_SECONDS = 5;

export function AudioEvidence({
  src,
  name,
  segments,
  player,
}: {
  src: string;
  name: string;
  segments: Segment[];
  player: MediaPlayback;
}) {
  const waveRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const width = useElementWidth(waveRef);
  const peaks = useAudioPeaks(src);
  const { bind, toggle, seek, time, duration, playing } = player;
  const compact = width > 0 && width < 520;
  const barWidth = compact ? 3.5 : 5.6;
  const gap = compact ? 2 : 4;
  const count = Math.max(16, Math.floor((width + gap) / (barWidth + gap)));
  const bars = resamplePeaks(peaks ?? [], count);
  const current = segments.find((s) => time >= s.startSec && time < s.endSec);
  const percent = (seconds: number) => (duration ? (seconds / duration) * 100 : 0);

  function seekFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = {
      ArrowLeft: -STEP_SECONDS,
      ArrowDown: -STEP_SECONDS,
      ArrowRight: STEP_SECONDS,
      ArrowUp: STEP_SECONDS,
    };
    if (event.key in moves) seek(time + moves[event.key]);
    else if (event.key === "Home") seek(0);
    else if (event.key === "End") seek(duration);
    else if (event.key === " ") toggle();
    else return;
    event.preventDefault();
  }

  const valueText = `${formatDuration(time)} of ${formatDuration(duration)}${current ? `, inside flagged moment ${current.id}` : ""}`;

  return (
    <section aria-label="Audio player" className="rounded-md bg-surface p-4.5 sm:rounded-lg sm:p-7">
      <audio ref={bind} src={src} preload="metadata" />
      <div className="flex items-center gap-3 sm:gap-5">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          onClick={toggle}
          className="flex size-13 shrink-0 items-center justify-center rounded-full bg-highlight text-ink transition-[scale] duration-(--dur-fast) active:scale-[0.98] sm:size-16"
        >
          <Icon name={playing ? "pause" : "play"} size={24} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-ui font-bold sm:text-file-name">{name}</p>
          <p className="mt-0.5 text-caption text-muted tabular-nums sm:text-small">
            <span className="font-bold text-ink">{formatDuration(time)}</span> / {formatDuration(duration)}
          </p>
        </div>
        {/* The legend explains flagged moments; none are drawn without RD segment data. */}
        {segments.length ? (
          <div className="hidden sm:block">
            <SignalLegend />
          </div>
        ) : null}
      </div>

      <div
        ref={waveRef}
        role="slider"
        tabIndex={0}
        aria-label="Position in the recording"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={valueText}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          seekFromPointer(event);
        }}
        onPointerMove={(event) => dragging.current && seekFromPointer(event)}
        onPointerUp={() => {
          dragging.current = false;
        }}
        className="relative mt-4 h-[70px] cursor-pointer touch-none rounded-[8px] select-none sm:mt-7.5 sm:h-[120px] sm:rounded-region"
      >
        {segments.map((s) => (
          <div
            key={s.id}
            aria-hidden="true"
            className={cx(
              "absolute inset-y-0 rounded-[8px] sm:rounded-region",
              s.strength === "strong" ? "bg-signal-strong-region" : "bg-signal-some-region",
            )}
            style={{ left: `${percent(s.startSec)}%`, width: `${percent(s.endSec - s.startSec)}%` }}
          />
        ))}
        <div aria-hidden="true" className="absolute inset-0 flex items-center" style={{ gap }}>
          {bars.map((peak, index) => {
            const t = ((index + 0.5) / count) * duration;
            const segment = segments.find((s) => t >= s.startSec && t <= s.endSec);
            const tone = segment
              ? segment.strength === "strong"
                ? "bg-signal-strong"
                : "bg-signal-some"
              : t <= time
                ? "bg-ink"
                : "bg-waveform-unplayed";
            return (
              <span
                key={index}
                className={cx("shrink-0 rounded-[3px]", tone)}
                style={{ width: barWidth, height: `${Math.max(8, 12 + peak * 76)}%` }}
              />
            );
          })}
        </div>
        {segments.map((s) => (
          <span key={s.id} className="absolute top-1.5 hidden sm:block" style={{ left: `calc(${percent(s.startSec)}% + 6px)` }}>
            <NumberBadge n={s.id} size={26} />
          </span>
        ))}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-y-1 w-0.5 rounded-[2px] bg-ink sm:-inset-y-1.5 sm:w-[3px]"
          style={{ left: `${percent(time)}%` }}
        />
      </div>

      <Ruler duration={duration} />
    </section>
  );
}

/** Time ruler under the waveform (12px/600 muted); hidden on mobile as in 06-mobile-result. */
function Ruler({ duration }: { duration: number }) {
  if (!duration) return null;
  const step = duration > 120 ? 30 : duration > 40 ? 10 : duration > 12 ? 5 : 2;
  const ticks: number[] = [];
  for (let t = 0; t < duration - step * 0.4; t += step) ticks.push(t);
  ticks.push(duration);
  return (
    <div aria-hidden="true" className="relative mt-2.5 hidden h-4 text-micro font-semibold text-muted tabular-nums sm:block">
      {ticks.map((t, index) => (
        <span
          key={t}
          className="absolute top-0"
          style={{
            left: `${(t / duration) * 100}%`,
            transform: index === 0 ? "none" : index === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
          }}
        >
          {formatDuration(t)}
        </span>
      ))}
    </div>
  );
}
