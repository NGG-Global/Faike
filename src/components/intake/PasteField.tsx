"use client";

import { useId, useLayoutEffect, useState, type KeyboardEvent, type RefObject } from "react";
import { cx } from "@/lib/cx";
import { RoundIconButton } from "@/components/ui/RoundIconButton";

/*
 * HANDOFF §6.5. 64px pill on the sage background with a visually hidden
 * label and a 48px ink "Check it" button. Enter submits (Shift+Enter adds a
 * line); multi-line text grows the field up to six lines with the button
 * pinned bottom-right. The visible placeholder is drawn separately so it can
 * truncate on narrow screens instead of wrapping.
 */

const LINE_HEIGHT = 24;
const MAX_LINES = 6;
const PLACEHOLDER = "…or paste a link or some text";

export function PasteField({
  value,
  onChange,
  onSubmit,
  inputRef,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  className?: string;
}) {
  const id = useId();
  const [multiline, setMultiline] = useState(false);

  useLayoutEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    const content = field.scrollHeight;
    const max = LINE_HEIGHT * MAX_LINES + 24;
    field.style.height = `${Math.min(content, max)}px`;
    field.style.overflowY = content > max ? "auto" : "hidden";
    setMultiline(content > LINE_HEIGHT + 24 + 2);
  }, [value, inputRef]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className={cx(
        "flex items-end gap-2 border-[1.5px] border-line bg-surface py-2 pr-2 pl-5 sm:pl-6.5",
        "has-[textarea:focus-visible]:[box-shadow:var(--focus-ring)]",
        multiline ? "rounded-lg" : "rounded-pill",
        className,
      )}
    >
      <label htmlFor={id} className="sr-only">
        Paste a link or some text
      </label>
      <div className="relative min-w-0 flex-1">
        {value ? null : (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-3 truncate text-body-lg leading-6 text-muted"
          >
            {PLACEHOLDER}
          </span>
        )}
        <textarea
          ref={inputRef}
          id={id}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          enterKeyHint="go"
          autoComplete="off"
          className="block w-full resize-none bg-transparent py-3 text-body-lg leading-6 text-ink outline-none focus-visible:shadow-none"
        />
      </div>
      <RoundIconButton type="submit" label="Check it" icon="arrow-right" size={48} tone="ink" />
    </form>
  );
}
