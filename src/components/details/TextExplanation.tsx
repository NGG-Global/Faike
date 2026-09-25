"use client";

import { Icon } from "@/components/ui/Icon";

/*
 * RD's own explanation of a text check (an HTML page). It is never inserted
 * into Faike's markup: the iframe loads it from RD's storage through
 * /api/scans/{requestId}/explainability, which redirects to a fresh
 * pre-signed link each time, and `sandbox=""` blocks scripts, forms and
 * pop-ups. The new-tab link opens the same page on RD's origin.
 */

export function TextExplanation({ requestId, headingLevel }: { requestId: string; headingLevel: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const src = `/api/scans/${encodeURIComponent(requestId)}/explainability`;
  return (
    <section className="rounded-md bg-surface p-4 sm:rounded-lg sm:p-7">
      <Heading className="text-body-lg font-bold">Detailed explanation</Heading>
      <p className="mt-1 text-small text-muted">
        The checking service&apos;s own write-up of this text, shown as it provides it. Faike&apos;s result above still applies.
      </p>
      <iframe
        src={src}
        title="Detailed explanation of the text check"
        sandbox=""
        referrerPolicy="no-referrer"
        loading="lazy"
        className="mt-4 block h-[60vh] max-h-[560px] min-h-80 w-full rounded-md border border-line bg-surface"
      />
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-ui font-semibold underline underline-offset-4 hover:text-verdict-authentic-fg"
      >
        Open the explanation in a new tab
        <Icon name="external" size={16} />
      </a>
    </section>
  );
}
