import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/*
 * HANDOFF §6.22. The pattern for every non-happy-path state: a small
 * uppercase label, a Bricolage title, one or two short paragraphs, an
 * optional visual, and one obvious primary action with at most one
 * secondary. Body content is passed as children.
 *
 * Use headingLevel 1 when the card is the whole page, 2 inside a page.
 * `plus` is the dark Plus-gate card from 05-states.
 */

export function StateCard({
  label,
  title,
  headingLevel = 2,
  tone = "neutral",
  actions,
  className,
  children,
}: {
  label: string;
  title: string;
  headingLevel?: 1 | 2;
  tone?: "neutral" | "plus";
  /** Primary action first, then at most one secondary. */
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <article
      className={cx(
        "flex flex-col gap-3.5 rounded-lg p-6",
        tone === "plus" ? "bg-ink text-surface" : "bg-surface",
        className,
      )}
    >
      <p className={cx("text-micro font-bold tracking-[0.06em] uppercase", tone === "plus" ? "text-highlight" : "text-muted")}>
        {label}
      </p>
      <Heading className="font-display text-balance text-state-title">{title}</Heading>
      {children}
      {actions ? <div className="mt-auto flex flex-col gap-2 pt-1">{actions}</div> : null}
    </article>
  );
}
