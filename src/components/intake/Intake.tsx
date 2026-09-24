"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { FILE_INPUT_ACCEPT } from "@/config/media";
import { cx } from "@/lib/cx";
import { usePlan } from "@/lib/plan";
import { scanService } from "@/lib/scan/client";
import { classifyPaste, linkAllowed, mediaTypeForMime, validateFile, validateText, type ValidationIssue } from "@/lib/scan/input";
import type { InputSummary } from "@/lib/scan/job";
import { readMediaMeta } from "@/lib/scan/media-meta";
import type { StartInput } from "@/lib/scan/service";
import { scanStore } from "@/lib/scan/store";
import { useHomePreview } from "@/mocks/preview";
import { loadSampleFile, SAMPLES, sampleMedia, sampleSummary } from "@/mocks/samples";
import { DropZone, DropZoneReady, DropZoneSelected } from "./DropZone";
import { ExampleLinks } from "./ExampleLinks";
import { IssueCard } from "./IssueCard";
import { PasteField } from "./PasteField";

/*
 * The universal input (HANDOFF §6.3–§6.6): one drop zone for files, one
 * field for links and text, and example files. Validation and the Plus gate
 * run here, before anything is uploaded (§9.3). A cancelled check comes back
 * with its input still loaded (§7.3).
 */

type Phase =
  | { name: "ready" }
  | { name: "reading"; fileName: string }
  | { name: "selected"; file: File; summary: InputSummary; previewUrl?: string }
  | { name: "issue"; issue: ValidationIssue; summary?: InputSummary };

function initialState(): { phase: Phase; paste: string } {
  const draft = scanStore.getState().draft;
  if (draft?.kind === "file") {
    return {
      phase: { name: "selected", file: draft.file, summary: draft.summary, previewUrl: draft.previewUrl },
      paste: "",
    };
  }
  if (draft?.kind === "link") return { phase: { name: "ready" }, paste: draft.url };
  if (draft?.kind === "paste") return { phase: { name: "ready" }, paste: draft.text };
  return { phase: { name: "ready" }, paste: "" };
}

export function Intake({ className }: { className?: string }) {
  const router = useRouter();
  const plan = usePlan();
  const preview = useHomePreview();
  const [initial] = useState(initialState);
  const [phase, setPhase] = useState<Phase>(initial.phase);
  const [paste, setPaste] = useState(initial.paste);
  const [dragging, setDragging] = useState(false);
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [focusCheck, setFocusCheck] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const issueRef = useRef<HTMLDivElement>(null);

  const activePreview = previewDismissed ? null : preview;
  const shownPhase: Phase = activePreview?.issue ? { name: "issue", ...activePreview.issue } : phase;
  const showDragging = dragging || Boolean(activePreview?.dragging);

  // The draft has been taken over by this form.
  useEffect(() => {
    scanStore.setDraft(null);
  }, []);

  // Focus requested by the flow ("Upload a file", "Try another link").
  useEffect(() => {
    const target = scanStore.getState().intakeFocus;
    if (!target) return;
    scanStore.setIntakeFocus(null);
    if (target === "paste") pasteRef.current?.focus();
    else zoneRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, []);

  useEffect(() => {
    if (focusCheck && phase.name === "selected") checkRef.current?.focus();
  }, [focusCheck, phase]);

  useEffect(() => {
    if (shownPhase.name === "issue") issueRef.current?.focus();
  }, [shownPhase.name]);

  function leavePhase() {
    if (phase.name === "selected" && phase.previewUrl) URL.revokeObjectURL(phase.previewUrl);
    setPreviewDismissed(true);
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  function reset() {
    leavePhase();
    setPhase({ name: "ready" });
  }

  async function handleFile(file: File) {
    leavePhase();
    setFocusCheck(false);
    setPhase({ name: "reading", fileName: file.name });
    const mediaType = mediaTypeForMime(file.type);
    const meta = mediaType ? await readMediaMeta(file, mediaType) : {};
    const summary: InputSummary = {
      kind: "file",
      mediaType: mediaType ?? undefined,
      fileName: file.name,
      mime: file.type,
      sizeBytes: file.size,
      ...meta,
    };
    const result = validateFile({ name: file.name, mime: file.type, sizeBytes: file.size, durationSec: meta.durationSec }, plan);
    if (!result.ok) {
      setPhase({ name: "issue", issue: result.issue, summary });
      return;
    }
    const previewUrl = mediaType === "image" ? URL.createObjectURL(file) : undefined;
    setPhase({ name: "selected", file, summary, previewUrl });
    setFocusCheck(true);
    setAnnouncement(`${file.name} is ready to check.`);
  }

  function start(input: StartInput) {
    const id = scanService.start(input);
    router.push(`/check/${id}`);
  }

  function handleCheck() {
    if (phase.name !== "selected") return;
    start({
      kind: "file",
      file: phase.file,
      summary: phase.summary,
      media: phase.previewUrl ? { src: phase.previewUrl, persistent: false } : undefined,
    });
  }

  function handlePasteSubmit() {
    const input = classifyPaste(paste);
    if (input.kind === "empty") {
      pasteRef.current?.focus();
      return;
    }
    leavePhase();
    if (input.kind === "link") {
      if (!linkAllowed(plan)) {
        setPhase({ name: "issue", issue: { kind: "gated", subject: "link" }, summary: { kind: "link", url: input.url } });
        return;
      }
      start({ kind: "link", url: input.url, platformName: input.platform?.name, handle: input.handle });
      return;
    }
    const result = validateText(input.text, plan);
    if (!result.ok) {
      setPhase({ name: "issue", issue: result.issue, summary: { kind: "paste", mediaType: "text", text: input.text } });
      return;
    }
    start({ kind: "paste", text: input.text });
  }

  async function handleExample(sampleId: "photo" | "voice") {
    const sample = SAMPLES[sampleId];
    setBusy(true);
    try {
      const file = await loadSampleFile(sample);
      start({ kind: "file", file, summary: sampleSummary(sample), media: sampleMedia(sample) });
    } catch {
      setBusy(false);
      setAnnouncement("That example couldn't be loaded. Try again.");
    }
  }

  // Drag and drop anywhere on the page (HANDOFF §6.3), and pasted files (§6.5).
  const onDropFile = useEffectEvent((file: File) => void handleFile(file));
  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const over = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const file = event.dataTransfer?.files[0];
      if (file) onDropFile(file);
    };
    const paste = (event: ClipboardEvent) => {
      const file = event.clipboardData?.files[0];
      const hasText = Boolean(event.clipboardData?.getData("text/plain"));
      if (!file || (event.target === pasteRef.current && hasText)) return;
      event.preventDefault();
      onDropFile(file);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    document.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
      document.removeEventListener("paste", paste);
    };
  }, []);

  return (
    <div className={cx("w-full text-left", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      {shownPhase.name === "issue" ? (
        <div ref={issueRef} tabIndex={-1} className="mx-auto max-w-aside outline-none">
          <IssueCard
            issue={shownPhase.issue}
            summary={shownPhase.summary}
            onChooseFile={() => {
              reset();
              openPicker();
            }}
            onEditText={() => {
              reset();
              requestAnimationFrame(() => pasteRef.current?.focus());
            }}
          />
          {showDragging ? <p className="mt-4 text-center text-small text-muted">Let go to check it</p> : null}
        </div>
      ) : (
        <>
          <div ref={zoneRef}>
            <DropZone dragging={showDragging}>
              {shownPhase.name === "selected" ? (
                <DropZoneSelected
                  summary={shownPhase.summary}
                  previewUrl={shownPhase.previewUrl}
                  onCheck={handleCheck}
                  onBrowse={openPicker}
                  checkRef={checkRef}
                />
              ) : shownPhase.name === "reading" ? (
                <p className="text-body-lg text-muted" role="status">
                  Opening {shownPhase.fileName}…
                </p>
              ) : (
                <DropZoneReady plan={plan} onBrowse={openPicker} />
              )}
            </DropZone>
          </div>
          <PasteField
            value={paste}
            onChange={setPaste}
            onSubmit={handlePasteSubmit}
            inputRef={pasteRef}
            className="mt-4"
          />
          <ExampleLinks onExample={handleExample} busy={busy} className="mt-3.5 text-center" />
        </>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
