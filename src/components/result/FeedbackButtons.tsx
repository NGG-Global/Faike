"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { scanService } from "@/lib/scan/client";
import type { FeedbackAnswer, ScanJob } from "@/lib/scan/job";
import { Icon } from "@/components/ui/Icon";

/*
 * HANDOFF §6.15. "Does this seem right?" with 44px pills: Yes / No on the
 * result page (thumb icons), Yes / No / Not sure on details. After a choice
 * the pills give way to "Thanks, that helps." and the answer can be changed.
 * Sends the check id and answer only.
 */

const LABELS: Record<FeedbackAnswer, { text: string; aria: string }> = {
  yes: { text: "Yes", aria: "Yes, seems right" },
  no: { text: "No", aria: "No, seems wrong" },
  not_sure: { text: "Not sure", aria: "Not sure" },
};

export function FeedbackButtons({
  job,
  withNotSure = false,
  className,
}: {
  job: ScanJob;
  withNotSure?: boolean;
  className?: string;
}) {
  const promptId = useId();
  const [editing, setEditing] = useState(false);
  const [justAnswered, setJustAnswered] = useState(false);
  const changeRef = useRef<HTMLButtonElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const answer = job.feedback;
  const options: FeedbackAnswer[] = withNotSure ? ["yes", "no", "not_sure"] : ["yes", "no"];

  // Keep keyboard focus in place when the pills and the thanks swap.
  useEffect(() => {
    if (justAnswered) changeRef.current?.focus();
  }, [justAnswered]);

  function choose(option: FeedbackAnswer) {
    void scanService.sendFeedback(job.id, option);
    setEditing(false);
    setJustAnswered(true);
  }

  return (
    <div role="group" aria-labelledby={promptId} className={cx("flex flex-wrap items-center gap-2.5", className)}>
      <span id={promptId} className="text-small font-semibold text-muted">
        Does this seem right?
      </span>
      {answer && !editing ? (
        <>
          <span role="status" className="text-small font-semibold">
            Thanks, that helps.
          </span>
          <button
            ref={changeRef}
            type="button"
            onClick={() => {
              setEditing(true);
              setJustAnswered(false);
              requestAnimationFrame(() => firstRef.current?.focus());
            }}
            className="min-h-11 text-small font-semibold underline underline-offset-4 hover:text-verdict-authentic-fg"
          >
            Change answer
          </button>
        </>
      ) : (
        options.map((option, index) => (
          <button
            key={option}
            ref={index === 0 ? firstRef : undefined}
            type="button"
            aria-label={LABELS[option].aria}
            aria-pressed={answer === option}
            onClick={() => choose(option)}
            className={cx(
              "inline-flex h-11 items-center gap-2 rounded-pill border-[1.5px] px-4 text-small font-semibold transition-colors",
              answer === option ? "border-ink bg-ink text-surface" : "border-line-strong bg-surface text-ink hover:border-ink",
            )}
          >
            {!withNotSure && option !== "not_sure" ? (
              <Icon name={option === "yes" ? "thumb-up" : "thumb-down"} size={18} />
            ) : null}
            {LABELS[option].text}
          </button>
        ))
      )}
    </div>
  );
}
