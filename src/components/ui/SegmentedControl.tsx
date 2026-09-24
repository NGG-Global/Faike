"use client";

import { useRef, type KeyboardEvent } from "react";
import { cx } from "@/lib/cx";

/*
 * HANDOFF §7.5 image view switch: 44px segments, ink fill for the selected
 * one. A radio group, so arrow keys move the selection.
 */

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx("inline-flex rounded-pill bg-bg p-1", className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cx(
              "min-h-11 flex-1 rounded-pill px-2 text-center text-small leading-tight font-semibold transition-colors sm:px-4 sm:whitespace-nowrap",
              selected ? "bg-ink text-surface" : "text-ink hover:text-verdict-authentic-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
