"use client";

import type { ReactNode, RefObject } from "react";
import { cx } from "@/lib/cx";
import { inputMeta } from "@/lib/scan/facts";
import type { InputSummary } from "@/lib/scan/job";
import type { Plan } from "@/lib/plan";
import { Button } from "@/components/ui/Button";
import { FileTile } from "@/components/ui/FileTile";
import { Icon } from "@/components/ui/Icon";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { TypeChips } from "./TypeChips";

/*
 * HANDOFF §6.3. White card with a dashed drop area. While a file is dragged
 * over the page the border turns solid ink on highlight-soft and the prompt
 * reads "Let go to check it". Fully operable without drag and drop: the add
 * button and "browse" open the native picker.
 *
 * The selected state (derived) shows the chosen file with "Check it", so the
 * person confirms before anything is sent; it is also where a cancelled check
 * leaves the file (HANDOFF §7.3).
 */

export function DropZone({
  dragging,
  children,
}: {
  dragging: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-label="Choose a file to check" className="rounded-xl bg-surface p-3.5 shadow-card">
      <div
        className={cx(
          "flex min-h-[250px] flex-col items-center justify-center gap-4 rounded-sm border-2 px-4 py-7 text-center",
          "transition-colors duration-(--dur-fast)",
          dragging ? "border-solid border-ink bg-highlight-soft" : "border-dashed border-line-dashed",
        )}
      >
        {dragging ? (
          <>
            <span aria-hidden="true" className="flex size-(--control-hero) items-center justify-center rounded-full bg-highlight">
              <Icon name="plus" size={34} />
            </span>
            <p className="font-display text-dropzone font-bold">Let go to check it</p>
          </>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

const browseLink =
  "relative underline decoration-2 underline-offset-4 hover:text-verdict-authentic-fg " +
  "after:absolute after:-inset-x-1 after:-inset-y-2 after:content-['']";

export function DropZoneReady({ plan, onBrowse }: { plan: Plan; onBrowse: () => void }) {
  return (
    <>
      <RoundIconButton label="Choose a file" icon="plus" size={84} onClick={onBrowse} />
      <p className="font-display text-dropzone font-bold text-balance">
        Drop your file here <span className="font-medium text-muted">or</span>{" "}
        <button type="button" onClick={onBrowse} className={browseLink}>
          browse
        </button>
      </p>
      <TypeChips plan={plan} />
    </>
  );
}

export function DropZoneSelected({
  summary,
  previewUrl,
  onCheck,
  onBrowse,
  checkRef,
}: {
  summary: InputSummary;
  previewUrl?: string;
  onCheck: () => void;
  onBrowse: () => void;
  checkRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
        <img src={previewUrl} alt="" className="h-24 max-w-[70%] rounded-tile object-cover" />
      ) : (
        <FileTile mediaType={summary.mediaType} />
      )}
      <div className="w-full min-w-0">
        <p className="truncate text-file-name font-bold">{summary.fileName}</p>
        <p className="mt-0.5 text-small text-muted">{inputMeta(summary)}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <Button ref={checkRef} onClick={onCheck} icon={<Icon name="arrow-right" />} iconPosition="end">
          Check it
        </Button>
        <Button variant="text" onClick={onBrowse}>
          Choose a different file
        </Button>
      </div>
    </div>
  );
}
