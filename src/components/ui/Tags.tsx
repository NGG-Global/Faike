import type { CSSProperties } from "react";
import { cx } from "@/lib/cx";
import { STRENGTH_TAG, VERDICT_HEADLINE } from "@/lib/scan/copy";
import type { Strength, Verdict } from "@/lib/scan/types";

/* Small labelled markers shared by the result and details screens. */

/** "Strong" / "Some" (HANDOFF §6.18), always on its region colour with a word. */
export function StrengthTag({ strength, className }: { strength: Strength; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-7 shrink-0 items-center rounded-pill px-3 text-caption font-bold text-verdict-suspicious-fg",
        strength === "strong" ? "bg-signal-strong-region" : "bg-signal-some-region",
        className,
      )}
    >
      {STRENGTH_TAG[strength]}
    </span>
  );
}

/** Numbered ink marker matching a flagged item to its place in the media. */
export function NumberBadge({
  n,
  size = 34,
  className,
  style,
}: {
  n: number;
  size?: 26 | 28 | 34;
  className?: string;
  style?: CSSProperties;
}) {
  const sizes = { 26: "size-6.5 text-caption", 28: "size-7 text-caption", 34: "size-8.5 text-ui" };
  return (
    <span
      aria-hidden="true"
      style={style}
      className={cx(
        "flex shrink-0 items-center justify-center rounded-full bg-ink font-display font-bold text-surface",
        sizes[size],
        className,
      )}
    >
      {n}
    </span>
  );
}

export const VERDICT_TONE: Record<Verdict, { tint: string; fg: string }> = {
  authentic: { tint: "bg-verdict-authentic-tint", fg: "text-verdict-authentic-fg" },
  suspicious: { tint: "bg-verdict-suspicious-tint", fg: "text-verdict-suspicious-fg" },
  artificial: { tint: "bg-verdict-artificial-tint", fg: "text-verdict-artificial-fg" },
  not_applicable: { tint: "bg-surface", fg: "text-ink" },
  unable: { tint: "bg-surface", fg: "text-ink" },
};

/** 36px verdict pill on the details header (HANDOFF §7.5). */
export function VerdictTag({ verdict, className }: { verdict: Verdict; className?: string }) {
  const tone = VERDICT_TONE[verdict];
  return (
    <span
      className={cx(
        "inline-flex min-h-9 items-center rounded-pill px-4 py-1.5 text-small font-bold",
        tone.tint,
        tone.fg,
        className,
      )}
    >
      {VERDICT_HEADLINE[verdict]}
    </span>
  );
}

/** Colour key with words (HANDOFF §6.17 legend). */
export function SignalLegend({ className }: { className?: string }) {
  return (
    <ul className={cx("flex flex-wrap gap-x-4 gap-y-1 text-caption font-semibold text-muted", className)}>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-3 rounded-[3px] bg-signal-strong" />
        Strong signal
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-3 rounded-[3px] bg-signal-some-legend" />
        Some signal
      </li>
    </ul>
  );
}
