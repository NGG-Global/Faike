"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { TextSpan } from "@/lib/scan/types";
import { SignalLegend } from "@/components/ui/Tags";

/*
 * Text evidence (HANDOFF §7.5, derived). The submitted text at reading
 * width (70ch, 17px, line-height 1.6). Flagged spans use the highlighter:
 * strong on the strong region colour with a 2px underline, some on the
 * some region colour. Each span is focusable and names its strength. With
 * no span-level data, the text is shown without highlights.
 */

export function spanElementId(scanId: string, index: number) {
  return `passage-${scanId}-${index + 1}`;
}

export function TextEvidence({ scanId, text, spans }: { scanId: string; text: string; spans?: TextSpan[] }) {
  const ordered = [...(spans ?? [])].sort((a, b) => a.start - b.start);
  const nodes: ReactNode[] = [];
  let cursor = 0;
  ordered.forEach((span, index) => {
    if (span.start < cursor || span.end > text.length) return;
    if (span.start > cursor) nodes.push(text.slice(cursor, span.start));
    nodes.push(
      <mark
        key={span.start}
        id={spanElementId(scanId, index)}
        tabIndex={0}
        className={cx(
          "rounded-[3px] px-0.5 text-ink [box-decoration-break:clone]",
          span.strength === "strong"
            ? "bg-signal-strong-region underline decoration-signal-strong decoration-2 underline-offset-[5px]"
            : "bg-signal-some-region",
        )}
      >
        <span className="sr-only">
          Flagged passage {index + 1}, {span.strength === "strong" ? "strong" : "some"} signal:{" "}
        </span>
        {text.slice(span.start, span.end)}
      </mark>,
    );
    cursor = span.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));

  return (
    <section aria-label="Your text" className="rounded-md bg-surface p-5 sm:rounded-lg sm:p-7">
      {ordered.length ? <SignalLegend className="mb-4" /> : null}
      <div className="max-w-[70ch] text-body-lg leading-[1.6] break-words whitespace-pre-wrap text-ink">{nodes}</div>
      {spans && !spans.length ? (
        <p className="mt-4 text-small text-muted">Faike didn&apos;t flag any particular passage.</p>
      ) : null}
      {!spans ? (
        <p className="mt-4 text-small text-muted">This result covers the text as a whole, not individual passages.</p>
      ) : null}
    </section>
  );
}
