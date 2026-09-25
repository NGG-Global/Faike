"use client";

import { MEDIA } from "@/config/media";
import { formatDuration } from "@/lib/format";
import { issueCopy } from "@/lib/scan/copy";
import type { ValidationIssue } from "@/lib/scan/input";
import type { InputSummary } from "@/lib/scan/job";
import { Button } from "@/components/ui/Button";
import { StateCard } from "@/components/ui/StateCard";

/*
 * Validation states shown before anything is uploaded (HANDOFF §8, §9.3):
 * too large, too long, unsupported and unavailable (derived; copy in
 * copy.ts, values from the media config) and the Plus gate (05-states).
 */

export function IssueCard({
  issue,
  summary,
  onChooseFile,
  onEditText,
  className,
}: {
  issue: ValidationIssue;
  summary?: InputSummary;
  onChooseFile: () => void;
  onEditText?: () => void;
  className?: string;
}) {
  const fromPaste = summary?.kind === "paste" || summary?.kind === "link";
  const retry = fromPaste && onEditText ? (
    <Button onClick={onEditText} className="w-full">
      Edit what you pasted
    </Button>
  ) : (
    <Button onClick={onChooseFile} className="w-full">
      Choose another file
    </Button>
  );

  if (issue.kind !== "gated") {
    const copy = issueCopy(issue, summary);
    return (
      <StateCard label={copy.label} title={copy.title} actions={retry} className={className}>
        <p className="text-ui leading-[1.5] text-ink-soft">{copy.body}</p>
      </StateCard>
    );
  }

  const what =
    issue.subject === "link"
      ? "You pasted a link"
      : summary?.kind === "paste"
        ? "You pasted some text"
        : `You dropped ${issue.subject === "text" ? "a text file" : `a ${MEDIA[issue.subject].noun}`}`;
  return (
    <StateCard
      tone="plus"
      label="Plus feature"
      title="Videos, text and links come with Faike Plus"
      className={className}
      actions={
        <>
          <Button href="/plus" variant="highlight" className="w-full">
            See Plus
          </Button>
          <Button variant="inverse" onClick={onChooseFile} className="w-full">
            Choose a photo or audio
          </Button>
        </>
      }
    >
      <p className="text-ui leading-[1.5] text-surface/85">
        The free version checks photos and audio. {what}, so this one needs Plus.
      </p>
      {summary?.kind === "file" && summary.fileName ? (
        <p className="truncate rounded-tile bg-surface/10 px-3.5 py-3 text-small font-semibold">
          {summary.fileName}
          {summary.durationSec !== undefined ? ` · ${formatDuration(summary.durationSec)}` : ""}
        </p>
      ) : null}
    </StateCard>
  );
}
