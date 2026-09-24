import { cx } from "@/lib/cx";
import { suitabilityFailure, suitabilityLabel } from "@/lib/scan/copy";
import type { ScanResult } from "@/lib/scan/types";
import { Icon } from "@/components/ui/Icon";

/*
 * HANDOFF §6.19. Only the checks RD reports are listed; unreported checks
 * are hidden, never shown as passed. `compact` is the sunk box used inside
 * the Not applicable state (05-states).
 */

type Checks = NonNullable<ScanResult["suitability"]>;

export function SuitabilityChecklist({
  checks,
  variant = "card",
  headingLevel = 2,
  className,
}: {
  checks: Checks;
  variant?: "card" | "compact";
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const compact = variant === "compact";
  const failed = checks.find((c) => !c.passed);
  const list = (
    <ul className={cx("flex flex-col", compact ? "gap-2" : "gap-0")}>
      {checks.map((c) => (
        <li
          key={c.check}
          className={cx(
            "flex min-h-7.5 items-center gap-2.5 font-medium",
            compact ? "text-small" : "text-ui",
            compact && !c.passed && "font-bold",
          )}
        >
          <Icon
            name={c.passed ? "check" : "cross"}
            size={compact ? 16 : 18}
            strokeWidth={2.6}
            className={cx("shrink-0", c.passed ? "text-verdict-authentic-fg" : "text-verdict-artificial-fg")}
          />
          <span>
            <span className="sr-only">{c.passed ? "Passed: " : "Didn't pass: "}</span>
            {suitabilityLabel(c.check, compact)}
          </span>
        </li>
      ))}
    </ul>
  );

  if (compact) return <div className={cx("rounded-row bg-surface-sunk p-3.5", className)}>{list}</div>;

  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className={cx("rounded-lg bg-surface p-6", className)}>
      <Heading className="mb-3 text-body font-bold">Was the recording good enough?</Heading>
      {list}
      <p className={cx("mt-2.5 text-small font-semibold", failed ? "text-ink" : "text-verdict-authentic-fg")}>
        {failed ? suitabilityFailure(failed.check) : "Yes, this sample was suitable."}
      </p>
    </section>
  );
}
