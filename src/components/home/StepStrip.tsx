import { cx } from "@/lib/cx";

/*
 * HANDOFF §6.7. Three steps pinned near the bottom of the home page.
 * Numerals are justified because the content is a genuine sequence; the
 * list conveys the order to assistive technology, so the drawn numerals
 * and arrows are hidden from it.
 *
 * The handoff stacks the steps (arrows hidden) on mobile and does not
 * specify tablet. The row needs ~790px, more than the 720px tablet column,
 * so the steps stay stacked until the desktop breakpoint.
 */

const steps = ["Drop it in", "Faike checks it", "You get a clear answer, and the why"];

export function StepStrip({ className }: { className?: string }) {
  return (
    <ol
      aria-label="How Faike works"
      className={cx("flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-12", className)}
    >
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-12">
          <span className="flex items-center gap-3 text-ui font-medium lg:whitespace-nowrap">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-surface font-display text-small font-bold"
            >
              {index + 1}
            </span>
            {step}
          </span>
          {index < steps.length - 1 ? <StepArrow /> : null}
        </li>
      ))}
    </ol>
  );
}

function StepArrow() {
  return (
    <svg
      width="28"
      height="10"
      viewBox="0 0 28 10"
      aria-hidden="true"
      focusable="false"
      className="hidden shrink-0 text-subtle lg:block"
    >
      <path d="M0 5h26M22 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
