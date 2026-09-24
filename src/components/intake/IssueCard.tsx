"use client";

import { MEDIA } from "@/config/media";
import { formatBytes, formatDuration } from "@/lib/format";
import type { ValidationIssue } from "@/lib/scan/input";
import type { InputSummary } from "@/lib/scan/job";
import { Button } from "@/components/ui/Button";
import { StateCard } from "@/components/ui/StateCard";

/*
 * Validation states shown before anything is uploaded (HANDOFF §8, §9.3):
 * too large and unsupported (derived), too long (derived from the video
 * duration limit) and the Plus gate (05-states).
 */

const LIMIT_SUBJECT = { image: "Photos", audio: "Audio files", video: "Videos", text: "Text" } as const;
const SHORTER = { image: "Try a smaller photo.", audio: "Try a shorter clip.", video: "Try a shorter clip.", text: "Try a shorter piece." } as const;

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

  switch (issue.kind) {
    case "too_large": {
      const subject = LIMIT_SUBJECT[issue.mediaType];
      const verb = issue.mediaType === "text" ? "This is" : "This one is";
      return (
        <StateCard label="File too big" title="That file is over the limit" actions={retry} className={className}>
          <p className="text-ui leading-[1.5] text-ink-soft">
            {subject} can be up to {formatBytes(issue.limitBytes)}. {verb} {formatBytes(issue.sizeBytes)}.{" "}
            {SHORTER[issue.mediaType]}
          </p>
        </StateCard>
      );
    }
    case "too_long":
      return (
        <StateCard label="File too long" title="That video is over the limit" actions={retry} className={className}>
          <p className="text-ui leading-[1.5] text-ink-soft">
            Videos can be up to {Math.round(issue.limitSec / 60)} minutes. This one is{" "}
            {Math.round(issue.durationSec / 60)} minutes. Try a shorter clip.
          </p>
        </StateCard>
      );
    case "unsupported":
      return (
        <StateCard label="Can't check this" title="Faike can't check this kind of file" actions={retry} className={className}>
          <p className="text-ui leading-[1.5] text-ink-soft">Try a photo, audio, video or text file.</p>
        </StateCard>
      );
    case "gated": {
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
  }
}
