"use client";

import { MOBILE_QUERY, useMediaQuery } from "@/hooks/useMediaQuery";
import { primaryActionLabel } from "@/lib/scan/copy";
import type { ScanJob } from "@/lib/scan/job";
import type { MeterVerdict } from "@/lib/scan/meter";
import type { ScanResult } from "@/lib/scan/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageColumn } from "@/components/layout/PageColumn";
import { DetailsContent } from "@/components/details/DetailsContent";
import { EvidenceNote } from "./EvidenceNote";
import { FeedbackButtons } from "./FeedbackButtons";
import { ShareButton } from "./ShareButton";
import { VerdictCard } from "./VerdictCard";

/*
 * Result (HANDOFF §7.4, 03-result): verdict card → actions → evidence note.
 * On mobile (06-mobile-result) the actions stack, "Show me where" jumps to
 * the details rendered on the same page, and feedback moves to their end.
 */

export function ResultView({ job, result, verdict }: { job: ScanJob; result: ScanResult; verdict: MeterVerdict }) {
  const mobile = useMediaQuery(MOBILE_QUERY);

  return (
    <PageColumn width="result" className="pt-1 pb-12 sm:pt-5">
      <VerdictCard job={job} result={result} verdict={verdict} focusOnMount={job.live} />

      <div className="mt-4 flex flex-col gap-2.5 sm:mt-6 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
          <Button
            href={mobile ? "#details" : `/check/${job.id}/details`}
            size="action"
            icon={<Icon name="chevron-down" className="hidden sm:block" />}
            iconPosition="end"
            className="w-full sm:w-auto"
          >
            {primaryActionLabel(verdict)}
          </Button>
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:gap-3">
            <Button href="/" variant="secondary" size="action">
              <span className="sm:hidden">New check</span>
              <span className="hidden sm:inline">Check something else</span>
            </Button>
            <ShareButton result={result} />
          </div>
        </div>
        {mobile ? null : <FeedbackButtons job={job} />}
      </div>

      <EvidenceNote className="mt-4 sm:mt-6.5" />

      {mobile ? (
        <section id="details" aria-labelledby="details-heading" className="mt-7 scroll-mt-4">
          <DetailsContent job={job} result={result} inline />
        </section>
      ) : null}
    </PageColumn>
  );
}
