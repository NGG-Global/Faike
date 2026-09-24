"use client";

import { useRouter } from "next/navigation";
import { useEnsureScan } from "@/hooks/useEnsureScan";
import { scanService } from "@/lib/scan/client";
import { isMeterVerdict } from "@/lib/scan/meter";
import { scanStore } from "@/lib/scan/store";
import { CardPage } from "@/components/layout/CardPage";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { NotApplicableCard, UnableCard } from "@/components/result/NonVerdictCards";
import { ResultView } from "@/components/result/ResultView";
import { AnalysingView } from "./AnalysingView";
import { ConnectionCard, NotFoundCard, RetrievalFailedCard, RetrievingCard, UploadingCard } from "./FlowCards";

/*
 * /check/:scanId — one route, state-driven (HANDOFF §7.1): uploading or
 * retrieving → analysing → result, or a system state.
 */

export function ScanFlow({ scanId }: { scanId: string }) {
  const router = useRouter();
  const job = useEnsureScan(scanId);
  const done = job?.stage.name === "done";

  function cancel() {
    scanService.cancel(scanId);
    router.push("/");
  }

  function leaveForIntake(focus: "file" | "paste") {
    scanService.cancel(scanId);
    scanStore.setDraft(null);
    scanStore.setIntakeFocus(focus);
    router.push("/");
  }

  let content: React.ReactNode = null;
  if (job === null) {
    content = (
      <CardPage>
        <NotFoundCard />
      </CardPage>
    );
  } else if (job) {
    const { stage } = job;
    switch (stage.name) {
      case "uploading":
        content = (
          <CardPage>
            <UploadingCard job={job} loaded={stage.loadedBytes} total={stage.totalBytes} onCancel={cancel} />
          </CardPage>
        );
        break;
      case "retrieving":
        content = (
          <CardPage>
            <RetrievingCard job={job} />
          </CardPage>
        );
        break;
      case "analysing":
        content = (
          <AnalysingView job={job} step={stage.step} progress={stage.progress} partial={stage.partial} onCancel={cancel} />
        );
        break;
      case "failed":
        content = (
          <CardPage>
            {stage.failure === "retrieval" ? (
              <RetrievalFailedCard onUpload={() => leaveForIntake("file")} onTryLink={() => leaveForIntake("paste")} />
            ) : (
              <ConnectionCard failure={stage.failure} kind={job.input.kind} onRetry={() => scanService.retry(scanId)} />
            )}
          </CardPage>
        );
        break;
      case "done": {
        const { result } = stage;
        content = isMeterVerdict(result.verdict) ? (
          <ResultView job={job} result={result} verdict={result.verdict} />
        ) : (
          <CardPage>
            {result.verdict === "not_applicable" ? (
              <NotApplicableCard result={result} />
            ) : (
              <UnableCard job={job} onRetry={() => scanService.retry(scanId)} />
            )}
          </CardPage>
        );
        break;
      }
    }
  }

  return (
    <>
      <SiteHeader variant={done ? "result" : "flow"} />
      <main id="main" className="flex flex-1 flex-col" aria-busy={job === undefined}>
        {content}
      </main>
    </>
  );
}
