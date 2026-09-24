import { cx } from "@/lib/cx";

/** HANDOFF §6.23. 12px pill track with an ink fill. */
export function ProgressTrack({ value, label, className }: { value: number; label: string; className?: string }) {
  const percent = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cx("h-3 overflow-hidden rounded-pill bg-neutral-track", className)}
    >
      <div
        className="h-full rounded-pill bg-ink transition-[width] duration-(--dur-base) ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
