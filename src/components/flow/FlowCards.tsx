"use client";

import { formatUploadProgress } from "@/lib/format";
import { displayUrl } from "@/lib/scan/input";
import { inputName } from "@/lib/scan/facts";
import type { FailureKind, ScanJob } from "@/lib/scan/job";
import { Button } from "@/components/ui/Button";
import { FileTile } from "@/components/ui/FileTile";
import { ProgressTrack } from "@/components/ui/ProgressTrack";
import { StateCard } from "@/components/ui/StateCard";

/* Full-page system states of the flow (HANDOFF §8). */

const bodyText = "text-ui leading-[1.5] text-ink-soft";

/** "Uploading": milestones at 25/50/75/100% are announced politely (§11). */
export function UploadingCard({
  job,
  loaded,
  total,
  onCancel,
}: {
  job: ScanJob;
  loaded: number;
  total: number;
  onCancel: () => void;
}) {
  const percent = total > 0 ? (loaded / total) * 100 : 0;
  const milestone = Math.floor(percent / 25) * 25;
  return (
    <StateCard
      headingLevel={1}
      label="Uploading"
      title="Sending it over…"
      actions={
        <Button variant="secondary" onClick={onCancel} className="w-full">
          Cancel
        </Button>
      }
    >
      <div className="flex items-center gap-3 rounded-row bg-surface-sunk p-3.5">
        <FileTile mediaType={job.input.mediaType} size={44} />
        <div className="min-w-0">
          <p className="truncate text-ui font-bold">{inputName(job.input)}</p>
          <p className="text-caption text-muted">{formatUploadProgress(loaded, total)}</p>
        </div>
      </div>
      <ProgressTrack value={percent} label="Upload progress" />
      <p className={bodyText}>We&apos;ll start checking the moment it lands.</p>
      <p aria-live="polite" className="sr-only">
        {milestone > 0 ? `${milestone}% uploaded` : ""}
      </p>
    </StateCard>
  );
}

/** "Getting a link". The kind of post is unknown until it has been retrieved. */
export function RetrievingCard({ job }: { job: ScanJob }) {
  const noun = job.input.mediaType === "image" ? "photo" : job.input.mediaType === "video" ? "video" : "post";
  return (
    <StateCard headingLevel={1} label="Getting a link" title={`Grabbing the ${noun} from the link…`}>
      <div className="overflow-hidden rounded-row border-[1.5px] border-line" role="status">
        <div className="flex h-[110px] items-center justify-center bg-[repeating-linear-gradient(135deg,var(--color-neutral-track)_0_10px,var(--color-surface-sunk)_10px_20px)] text-caption font-semibold text-muted">
          Preview loading
        </div>
        <div className="px-3.5 py-3">
          <p className="truncate text-small font-bold">{job.input.url ? displayUrl(job.input.url) : "Link"}</p>
          <p className="mt-0.5 text-caption text-muted">{job.input.platformName ? `${job.input.platformName} post` : "Post"}</p>
        </div>
      </div>
      <p className={bodyText}>
        If the post is private or removed, we&apos;ll let you know and you can upload the file instead.
      </p>
    </StateCard>
  );
}

/** "We couldn't open that link" (derived). */
export function RetrievalFailedCard({ onUpload, onTryLink }: { onUpload: () => void; onTryLink: () => void }) {
  return (
    <StateCard
      headingLevel={1}
      label="Getting a link"
      title="We couldn't open that link"
      actions={
        <>
          <Button onClick={onUpload} className="w-full">
            Upload a file
          </Button>
          <Button variant="secondary" onClick={onTryLink} className="w-full">
            Try another link
          </Button>
        </>
      }
    >
      <p className={bodyText}>
        The post may be private, removed, or from a site Faike doesn&apos;t support yet. You can download it and upload
        the file instead.
      </p>
    </StateCard>
  );
}

/**
 * Network or API failure. Offline copy is the handoff's derived "Offline"
 * state; the unreachable-service and taking-too-long variants (derived)
 * follow the same pattern. "Try again" resumes waiting after a timeout.
 */
export function ConnectionCard({
  failure,
  kind,
  onRetry,
}: {
  failure: Exclude<FailureKind, "retrieval">;
  kind: ScanJob["input"]["kind"];
  onRetry: () => void;
}) {
  const noun = kind === "paste" ? "text" : kind === "link" ? "link" : "file";
  const title = failure === "offline" ? "You're offline" : failure === "timeout" ? "This is taking longer than usual" : "We couldn't connect";
  return (
    <StateCard
      headingLevel={1}
      label="Connection"
      title={title}
      actions={
        <Button onClick={onRetry} className="w-full">
          Try again
        </Button>
      }
    >
      {failure === "offline" ? (
        <p className={bodyText}>
          Faike needs a connection to check your {noun}. We&apos;ll keep it here until you&apos;re back.
        </p>
      ) : failure === "timeout" ? (
        <p className={bodyText}>
          The check hasn&apos;t finished yet. Try again to keep waiting for the result.
        </p>
      ) : (
        <p className={bodyText}>
          Faike couldn&apos;t reach the checking service. Your {noun} is still here, so you can try again.
        </p>
      )}
    </StateCard>
  );
}

export function NotFoundCard() {
  return (
    <StateCard
      headingLevel={1}
      label="Not found"
      title="We couldn't find that check"
      actions={
        <Button href="/" className="w-full">
          Check something
        </Button>
      }
    >
      <p className={bodyText}>It isn&apos;t available in this browser. You can start a new check from the home page.</p>
    </StateCard>
  );
}
