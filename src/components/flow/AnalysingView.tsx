"use client";

import { cx } from "@/lib/cx";
import { ANALYSING_COPY, laneVerdictLabel, receivedLabel } from "@/lib/scan/copy";
import { inputMeta, inputName } from "@/lib/scan/facts";
import type { ScanJob } from "@/lib/scan/job";
import type { ScanResult, Verdict } from "@/lib/scan/types";
import { Button } from "@/components/ui/Button";
import { FileTile } from "@/components/ui/FileTile";
import { Icon } from "@/components/ui/Icon";
import { PageColumn } from "@/components/layout/PageColumn";
import { VERDICT_TONE } from "@/components/ui/Tags";
import { AnalysisVisual } from "./AnalysisVisual";

/* Analysing (HANDOFF §7.3, 02-analyzing). */

export function AnalysingView({
  job,
  step,
  progress,
  partial,
  onCancel,
}: {
  job: ScanJob;
  step: "checking" | "writing";
  progress: number | null;
  partial?: ScanResult["partial"];
  onCancel: () => void;
}) {
  const mediaType = job.input.mediaType ?? "video";
  const copy = ANALYSING_COPY[mediaType];

  return (
    <PageColumn className="flex flex-col items-center pt-8 pb-12 text-center sm:pt-13">
      <h1 className="font-display text-balance text-hero-mobile sm:text-h1">{copy.title}</h1>
      <p className="mt-3.5 text-intro text-muted">{copy.subtitle}</p>

      <section
        aria-label="What Faike is checking"
        className="mt-8 w-full rounded-xl bg-surface p-5 text-left shadow-card sm:mt-10 sm:px-9 sm:py-8"
      >
        <div className="flex items-center gap-4">
          <FileTile mediaType={mediaType} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-file-name font-bold">{inputName(job.input)}</p>
            <p className="mt-0.5 truncate text-small text-muted">{inputMeta(job.input)}</p>
          </div>
          {progress !== null ? (
            <span aria-hidden="true" className="text-ui font-bold tabular-nums">
              {progress}%
            </span>
          ) : (
            <span className="hidden text-small text-muted motion-reduce:inline">Still checking…</span>
          )}
        </div>
        <div className="mt-7">
          <AnalysisVisual mediaType={mediaType} media={job.media} text={job.input.text} progress={progress} />
        </div>
      </section>

      {partial?.picture && partial.sound ? <PartialStatus picture={partial.picture} sound={partial.sound} /> : null}

      <StepPills
        received={receivedLabel(job.input.kind)}
        checking={copy.checking}
        step={step}
        className="mt-7"
      />

      <Button variant="text" onClick={onCancel} className="mt-7 sm:mt-9">
        Cancel
      </Button>
    </PageColumn>
  );
}

type PillState = "done" | "active" | "pending";

/** HANDOFF §6.9. The row is a polite live region so stage changes are announced. */
function StepPills({
  received,
  checking,
  step,
  className,
}: {
  received: string;
  checking: string;
  step: "checking" | "writing";
  className?: string;
}) {
  const pills: { label: string; state: PillState }[] = [
    { label: received, state: "done" },
    { label: checking, state: step === "checking" ? "active" : "done" },
    { label: "Writing your answer", state: step === "writing" ? "active" : "pending" },
  ];
  const stateText: Record<PillState, string> = { done: "Done: ", active: "Now: ", pending: "Next: " };

  return (
    <ol
      aria-live="polite"
      aria-label="Progress"
      className={cx("flex w-full flex-col gap-2.5 text-left sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3", className)}
    >
      {pills.map((pill) => (
        <li
          key={pill.label}
          className={cx(
            "flex h-14 items-center gap-3 rounded-pill px-5 text-body font-semibold",
            pill.state === "done" && "bg-surface",
            pill.state === "active" && "bg-ink text-surface",
            pill.state === "pending" && "border-[1.5px] border-dashed border-line-dashed text-muted",
          )}
        >
          {pill.state === "done" ? (
            <Icon name="check" size={20} className="shrink-0 text-verdict-authentic-fg" />
          ) : pill.state === "active" ? (
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-highlight" />
          ) : null}
          <span>
            <span className="sr-only">{stateText[pill.state]}</span>
            {pill.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** HANDOFF §8 "Partly done": the picture reports before the sound. */
function PartialStatus({ picture, sound }: { picture: Verdict | "pending"; sound: Verdict | "pending" }) {
  const title =
    picture !== "pending" && sound === "pending"
      ? "The picture's checked. Still listening to the sound."
      : picture === "pending" && sound !== "pending"
        ? "The sound's checked. Still watching the picture."
        : "The picture and the sound are checked.";
  const rows = [
    { label: "Video", value: picture },
    { label: "Audio", value: sound },
  ];

  return (
    <section aria-live="polite" className="mt-5 w-full rounded-lg bg-surface p-5 text-left sm:p-6">
      <p className="text-micro font-bold tracking-[0.06em] text-muted uppercase">Partly done</p>
      <h2 className="mt-2 font-display text-h2-mobile font-bold sm:text-h2">{title}</h2>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 rounded-tile bg-surface-sunk px-3.5 py-3">
            <span className="text-ui font-bold">{row.label}</span>
            {row.value === "pending" ? (
              <span className="text-caption font-semibold text-muted">{laneVerdictLabel("pending")}</span>
            ) : (
              <span
                className={cx(
                  "rounded-pill px-2.5 py-1 text-caption font-bold",
                  VERDICT_TONE[row.value].tint,
                  VERDICT_TONE[row.value].fg,
                )}
              >
                {laneVerdictLabel(row.value)}
              </span>
            )}
          </li>
        ))}
      </ul>
      {sound === "pending" || picture === "pending" ? (
        <p className="mt-3 text-ui leading-[1.5] text-ink-soft">
          Your final answer might change once the {sound === "pending" ? "audio" : "video"} is done.
        </p>
      ) : null}
    </section>
  );
}
