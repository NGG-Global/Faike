"use client";

import { useEffect, useId, useRef } from "react";
import { cx } from "@/lib/cx";
import { STATUS_CHIP, VERDICT_CAUTION, VERDICT_HEADLINE, verdictExplanation } from "@/lib/scan/copy";
import { buildFacts } from "@/lib/scan/facts";
import type { ScanJob } from "@/lib/scan/job";
import type { MeterVerdict } from "@/lib/scan/meter";
import type { ScanResult } from "@/lib/scan/types";
import { Icon, type IconName } from "@/components/ui/Icon";
import { VERDICT_TONE } from "@/components/ui/Tags";
import { FileSummaryCard } from "./FileSummaryCard";
import { SignalMeter } from "./SignalMeter";

/*
 * HANDOFF §6.10, 03-result. The hero of the result page: status chip,
 * verdict headline, a plain explanation, the file summary, the signal meter
 * and the fact pills. On mobile (06-mobile-result) the file summary and chip
 * icon drop out and the card bleeds to 14px from the screen edge.
 */

const CHIP_ICON: Record<MeterVerdict, IconName> = { authentic: "check", suspicious: "alert", artificial: "alert" };

export function VerdictCard({
  job,
  result,
  verdict,
  focusOnMount,
}: {
  job: ScanJob;
  result: ScanResult;
  verdict: MeterVerdict;
  focusOnMount: boolean;
}) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const tone = VERDICT_TONE[verdict];
  const explanation = verdictExplanation(result);
  const caution = VERDICT_CAUTION[verdict];
  const facts = buildFacts(result, job.input);
  const bodyTone = verdict === "suspicious" ? "text-verdict-suspicious-body" : "text-ink-soft";

  // HANDOFF §11: result arrival moves focus to the verdict headline.
  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus();
  }, [focusOnMount]);

  return (
    <section
      aria-labelledby={headingId}
      className={cx(
        "-mx-1.5 rounded-lg px-5 pt-6 pb-5 max-[359px]:px-4 sm:mx-0 sm:rounded-hero sm:px-10 sm:pt-10 sm:pb-9 lg:px-12 lg:pt-11 lg:pb-10",
        tone.tint,
      )}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:justify-between lg:gap-10">
        <div className="lg:max-w-[620px]">
          <p
            className={cx(
              "inline-flex h-7.5 items-center gap-2 rounded-pill bg-surface px-3 text-caption font-bold sm:h-8.5 sm:px-3.5 sm:text-small",
              tone.fg,
            )}
          >
            <Icon name={CHIP_ICON[verdict]} size={16} strokeWidth={2.4} className="hidden sm:block" />
            {STATUS_CHIP[verdict]}
          </p>
          <h1
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="mt-3 font-display text-balance text-verdict-mobile outline-none sm:mt-4 sm:text-verdict"
          >
            {VERDICT_HEADLINE[verdict]}
          </h1>
          <p className={cx("mt-2.5 text-body leading-[1.45] sm:mt-4 sm:text-lead", bodyTone)}>
            {explanation.lead}
            {explanation.more ? <span className="hidden sm:inline"> {explanation.more}</span> : null}
          </p>
        </div>
        <FileSummaryCard job={job} result={result} className="hidden shrink-0 sm:block sm:w-[260px] lg:self-start" />
      </div>

      <SignalMeter verdict={verdict} score={result.ensembleScore} className="mt-5 sm:mt-9" />

      {facts.length ? (
        <ul aria-label="About this file" className="mt-3.5 flex flex-wrap gap-1.5 sm:mt-5 sm:gap-2.5">
          {facts.map((fact) => (
            <li
              key={fact.label}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-pill bg-surface px-3 text-ui font-semibold sm:h-10 sm:gap-2 sm:px-4"
            >
              {fact.flagged ? <span aria-hidden="true" className="size-2.5 rounded-full bg-signal-strong" /> : null}
              {fact.short ? (
                <>
                  <span className="sm:hidden">{fact.short}</span>
                  <span className="hidden sm:inline">{fact.label}</span>
                </>
              ) : (
                fact.label
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {caution ? <p className={cx("mt-4 text-small leading-[1.5] sm:mt-5", bodyTone)}>{caution}</p> : null}
    </section>
  );
}
