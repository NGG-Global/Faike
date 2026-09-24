import { cx } from "@/lib/cx";
import { METER_POSITIONS, meterDescription, meterPosition, signalStrength, type MeterVerdict } from "@/lib/scan/meter";

/*
 * HANDOFF §6.11. Where the file lands on five positions. The position comes
 * from meterPosition(), which never contradicts the verdict (§9.2). The
 * visual is one image for assistive technology; the verdict headline states
 * the result in words. Settles in over 600ms (§10), end state under reduced
 * motion.
 */

const IDLE_TONES = [
  "bg-meter-real-strong",
  "bg-meter-real-soft",
  "bg-neutral-track",
  "bg-meter-ai-lean-soft",
  "bg-meter-ai-soft",
];

const ACTIVE_TONE: Record<MeterVerdict, string> = {
  authentic: "bg-verdict-authentic-fg",
  suspicious: "bg-meter-suspicious-active",
  artificial: "bg-meter-ai-strong",
};

export function SignalMeter({ verdict, score, className }: { verdict: MeterVerdict; score?: number; className?: string }) {
  const position = meterPosition(verdict, score) ?? 2;
  const strength = signalStrength(score);
  // The floating tag needs room when it sits under the title or the caption.
  const edge = position === 0 || position === 4;

  return (
    <div
      className={cx(
        "rounded-row bg-surface px-3.5 pt-8 pb-3 [--meter-idle-height:16px] max-[359px]:px-2.5 sm:rounded-md sm:px-6.5 sm:pt-5.5 sm:pb-4.5 sm:[--meter-idle-height:22px]",
        className,
      )}
    >
      <div className="hidden items-baseline justify-between gap-4 sm:flex">
        <p className="text-ui font-bold">Where this lands</p>
        {strength ? <p className="text-small text-muted">Signal strength: {strength}</p> : null}
      </div>
      <div
        role="img"
        aria-label={`${meterDescription(position)}${strength ? ` Signal strength: ${strength}.` : ""}`}
        className={cx(edge ? "sm:mt-12" : "sm:mt-4")}
      >
        <div aria-hidden="true" className="grid grid-cols-5 items-end gap-1.25 sm:gap-2">
          {IDLE_TONES.map((tone, index) =>
            index === position ? (
              <div key={index} className="relative">
                <span className="meter-tag absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-pill bg-ink px-2 py-0.5 text-badge font-bold whitespace-nowrap text-surface sm:mb-3 sm:px-2.25 sm:py-0.75 sm:text-micro">
                  This file
                </span>
                <div
                  className={cx(
                    "meter-active h-7 rounded-pill shadow-[0_0_0_3px_var(--color-ink)] sm:h-9",
                    ACTIVE_TONE[verdict],
                  )}
                />
              </div>
            ) : (
              <div key={index} className={cx("meter-idle h-(--meter-idle-height) rounded-pill", tone)} />
            ),
          )}
        </div>
        <div aria-hidden="true" className="mt-2 grid grid-cols-5 gap-1.25 sm:mt-2.5 sm:gap-2">
          {METER_POSITIONS.map((label, index) => (
            <span
              key={label}
              className={cx(
                "text-center text-badge leading-[1.2] font-bold sm:text-caption sm:font-semibold",
                index === position ? "text-ink" : "text-muted",
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
