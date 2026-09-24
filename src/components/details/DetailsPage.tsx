"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useEnsureScan } from "@/hooks/useEnsureScan";
import { isMeterVerdict } from "@/lib/scan/meter";
import { CardPage } from "@/components/layout/CardPage";
import { PageColumn } from "@/components/layout/PageColumn";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { NotFoundCard } from "@/components/flow/FlowCards";
import { Icon } from "@/components/ui/Icon";
import { VerdictTag } from "@/components/ui/Tags";
import { DetailsContent, detailsTitle } from "./DetailsContent";

/*
 * /check/:scanId/details (HANDOFF §7.5, 04-result-details-audio). Checks
 * that are not finished, or have no verdict, go back to the flow route.
 */

export function DetailsPage({ scanId }: { scanId: string }) {
  const router = useRouter();
  const job = useEnsureScan(scanId);
  const result = job?.stage.name === "done" ? job.stage.result : undefined;
  const hasDetails = result !== undefined && isMeterVerdict(result.verdict);

  useEffect(() => {
    if (job && !hasDetails) router.replace(`/check/${scanId}`);
  }, [job, hasDetails, router, scanId]);

  return (
    <>
      <SiteHeader variant="result" />
      <main id="main" className="flex flex-1 flex-col" aria-busy={job === undefined}>
        {job === null ? (
          <CardPage>
            <NotFoundCard />
          </CardPage>
        ) : job && result && hasDetails ? (
          <PageColumn width="result" className="pt-1 pb-12 sm:pt-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Link
                  href={`/check/${scanId}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-region text-ui font-semibold hover:text-verdict-authentic-fg"
                >
                  <Icon name="chevron-left" size={16} />
                  Back to result
                </Link>
                <h1 className="font-display text-balance text-h1-detail-mobile sm:text-h1-detail">{detailsTitle(result)}</h1>
              </div>
              <VerdictTag verdict={result.verdict} className="self-start sm:self-auto" />
            </div>
            <div className="mt-5">
              <DetailsContent job={job} result={result} />
            </div>
          </PageColumn>
        ) : null}
      </main>
    </>
  );
}
