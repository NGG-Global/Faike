"use client";

import { MEDIA } from "@/config/media";
import { notApplicableCopy, VERDICT_HEADLINE, VERDICT_LABEL } from "@/lib/scan/copy";
import type { ScanJob } from "@/lib/scan/job";
import type { ScanResult } from "@/lib/scan/types";
import { Button } from "@/components/ui/Button";
import { StateCard } from "@/components/ui/StateCard";
import { SuitabilityChecklist } from "./SuitabilityChecklist";

/*
 * Results that are not verdicts about the content (HANDOFF §8). Neutral
 * white cards, no meter. Titles use the product wording (brief, 24 Sep 2026):
 * "Not enough suitable information" and "Unable to analyze".
 */

const bodyText = "text-ui leading-[1.5]";

export function NotApplicableCard({ result }: { result: ScanResult }) {
  const noun = MEDIA[result.mediaType].retryNoun;
  const { reason, fix, known } = notApplicableCopy(result.notApplicableReason);
  return (
    <StateCard
      headingLevel={1}
      label={VERDICT_LABEL.not_applicable}
      title={VERDICT_HEADLINE.not_applicable}
      actions={
        <Button href="/" className="w-full">
          {result.mediaType === "text" ? "Try different text" : `Try another ${noun}`}
        </Button>
      }
    >
      <p className={bodyText}>
        We couldn&apos;t confidently analyze this {noun} because {reason}.
      </p>
      {known && result.suitability?.length ? <SuitabilityChecklist checks={result.suitability} variant="compact" /> : null}
      {fix ? <p className="text-small leading-[1.5] text-ink-soft">{fix}</p> : null}
    </StateCard>
  );
}

export function UnableCard({ job, onRetry }: { job: ScanJob; onRetry: () => void }) {
  const kind = job.input.kind;
  const noun = kind === "paste" ? "text" : kind === "link" ? "link" : "file";
  // HANDOFF §8: after two failed retries, "Check a different file" leads.
  const swapped = job.retries >= 2;
  const otherLabel = kind === "file" ? "Check a different file" : "Check something else";
  const retry = (
    <Button key="retry" variant={swapped ? "secondary" : "primary"} onClick={onRetry} className="w-full">
      Try again
    </Button>
  );
  const other = (
    <Button key="other" href="/" variant={swapped ? "primary" : "secondary"} className="w-full">
      {otherLabel}
    </Button>
  );
  return (
    <StateCard
      headingLevel={1}
      label={VERDICT_LABEL.unable}
      title={VERDICT_HEADLINE.unable}
      actions={swapped ? [other, retry] : [retry, other]}
    >
      <p className={bodyText}>
        Something went wrong on our side while checking your {noun}. It&apos;s usually temporary.
      </p>
      <p className={`${bodyText} text-ink-soft`}>
        {kind === "file"
          ? "Your file is still here, so you can try again without re-uploading."
          : `Your ${noun} is still here, so you can try again.`}
      </p>
    </StateCard>
  );
}
