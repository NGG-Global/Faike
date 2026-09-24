"use client";

import { useId, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

/*
 * HANDOFF §6.21. Stacked sections in one white card, divided by hairlines.
 * Headers are real buttons with aria-expanded / aria-controls; panels expand
 * over --dur-base and are inert while collapsed.
 */

export interface AccordionSection {
  id: string;
  title: string;
  caption?: string;
  defaultOpen?: boolean;
  content: ReactNode;
}

export function Accordion({
  sections,
  headingLevel = 2,
  className,
}: {
  sections: AccordionSection[];
  headingLevel?: 2 | 3;
  className?: string;
}) {
  return (
    <div className={cx("rounded-lg bg-surface px-5 py-2 sm:px-7", className)}>
      {sections.map((section, index) => (
        <Section key={section.id} section={section} divider={index > 0} headingLevel={headingLevel} />
      ))}
    </div>
  );
}

function Section({
  section,
  divider,
  headingLevel,
}: {
  section: AccordionSection;
  divider: boolean;
  headingLevel: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const [open, setOpen] = useState(section.defaultOpen ?? false);
  const uid = useId();
  const buttonId = `${uid}-button`;
  const panelId = `${uid}-panel`;

  return (
    <div className={cx(divider && "border-t border-line")}>
      <Heading>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-16 w-full items-center gap-3 py-2 text-left text-body-lg font-bold"
        >
          <span className="flex flex-1 flex-wrap items-baseline gap-x-2">
            {section.title}
            {section.caption ? <span className="text-ui font-medium text-muted">{section.caption}</span> : null}
          </span>
          <Icon
            name="chevron-down"
            className={cx("shrink-0 transition-transform duration-(--dur-base)", open && "rotate-180")}
          />
        </button>
      </Heading>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        inert={!open}
        className={cx(
          "grid transition-[grid-template-rows] duration-(--dur-base) ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-5">{section.content}</div>
        </div>
      </div>
    </div>
  );
}
