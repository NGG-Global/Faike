"use client";

import { cx } from "@/lib/cx";
import { STRENGTH_PHRASE } from "@/lib/scan/copy";
import type { Strength } from "@/lib/scan/types";
import { Icon } from "@/components/ui/Icon";
import { NumberBadge, StrengthTag } from "@/components/ui/Tags";

/*
 * Flagged moments, areas or passages (HANDOFF §6.18 row pattern). Desktop:
 * rows inside a card with description, strength tag and a labelled action.
 * Mobile (06-mobile-result): separate white rows, strength in words and a
 * 44px round action button.
 */

export interface FlaggedItem {
  id: number;
  primary: string;
  description: string;
  strength: Strength;
  /** Extra tag, e.g. "Picture" / "Sound" for video. */
  tag?: string;
  action: { label: "Play" | "Show"; ariaLabel: string; onClick: () => void; disabled?: boolean };
  active?: boolean;
}

export function FlaggedList({
  heading,
  items,
  emptyText,
  footer,
  headingLevel = 2,
}: {
  heading: string;
  items: FlaggedItem[];
  emptyText: string;
  footer?: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className="sm:rounded-lg sm:bg-surface sm:p-7">
      <Heading
        className={cx(
          "font-display text-h2-mobile font-bold sm:mb-4 sm:text-h2",
          items.length ? "sr-only sm:not-sr-only" : "mb-3",
        )}
      >
        {heading}
      </Heading>
      {items.length ? (
        <ul className="flex flex-col gap-2 sm:gap-2.5">
          {items.map((item) => (
            <li
              key={item.id}
              className={cx(
                "flex items-center gap-3 rounded-row bg-surface px-3.5 py-3 sm:gap-4 sm:bg-surface-sunk sm:px-4.5 sm:py-4",
                item.active && "outline-2 outline-ink",
              )}
            >
              <span className="sm:hidden">
                <NumberBadge n={item.id} size={28} />
              </span>
              <span className="hidden sm:block">
                <NumberBadge n={item.id} size={34} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-ui font-bold sm:text-body-lg">{item.primary}</p>
                <p className="mt-0.5 text-caption font-semibold text-verdict-suspicious-fg sm:hidden">
                  {STRENGTH_PHRASE[item.strength]}
                  {item.tag ? ` · ${item.tag}` : ""}
                </p>
                <p className="mt-0.5 hidden text-small text-muted sm:block">{item.description}</p>
              </div>
              {item.tag ? (
                <span className="hidden h-7 shrink-0 items-center rounded-pill bg-bg px-3 text-caption font-bold sm:inline-flex">
                  {item.tag}
                </span>
              ) : null}
              <span className="hidden shrink-0 sm:block">
                <StrengthTag strength={item.strength} />
              </span>
              <button
                type="button"
                aria-label={item.action.ariaLabel}
                disabled={item.action.disabled}
                onClick={item.action.onClick}
                className={cx(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-pill border-[1.5px] border-ink bg-surface text-small font-semibold",
                  "hover:text-verdict-authentic-fg disabled:opacity-40 sm:w-auto sm:px-4",
                )}
              >
                <Icon name={item.action.label === "Play" ? "play" : "arrow-right"} size={14} />
                <span className="hidden sm:inline">{item.action.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-row bg-surface px-4 py-3.5 text-ui text-ink-soft sm:bg-surface-sunk">{emptyText}</p>
      )}
      {footer && items.length ? <p className="mt-4 text-small text-muted">{footer}</p> : null}
    </section>
  );
}
