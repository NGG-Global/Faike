"use client";

import { useRef, useState, type ReactNode } from "react";
import { useMediaPlayback } from "@/hooks/useMediaPlayback";
import { cx } from "@/lib/cx";
import { formatDuration, plural } from "@/lib/format";
import { flaggedDescription, LANE_LABEL, whyText } from "@/lib/scan/copy";
import { flaggedHeading, subjectName } from "@/lib/scan/facts";
import type { ScanJob } from "@/lib/scan/job";
import type { Region, ScanResult } from "@/lib/scan/types";
import { Accordion } from "@/components/ui/Accordion";
import { FeedbackButtons } from "@/components/result/FeedbackButtons";
import { SuitabilityChecklist } from "@/components/result/SuitabilityChecklist";
import { ModelResults, TechnicalDetails } from "./AdvancedDetails";
import { FileDetails, LaneSummaryCard, SourceCard } from "./AsideCards";
import { AudioEvidence } from "./AudioEvidence";
import { FlaggedList, type FlaggedItem } from "./FlaggedList";
import { ImageEvidence, type ImageView } from "./ImageEvidence";
import { spanElementId, TextEvidence } from "./TextEvidence";
import { VideoEvidence } from "./VideoEvidence";

/*
 * Result details (HANDOFF §7.5): media-specific evidence, the flagged list
 * with an aside, the accordion and feedback. Rendered by the details page on
 * tablet and desktop, and inline below the result on mobile (§5).
 */

type HeadingLevel = 2 | 3;

/** H1 per media type (§7.5). Authentic results, with nothing flagged, use the "What …" form (derived). */
export function detailsTitle(result: ScanResult): string {
  const authentic = result.verdict === "authentic";
  switch (result.mediaType) {
    case "audio":
      return authentic ? "What Faike heard" : "Where Faike heard it";
    case "image":
      return authentic ? "What Faike saw" : "Where Faike saw it";
    case "video":
      return authentic ? "What Faike noticed" : "Where Faike noticed it";
    case "text":
      return "What Faike noticed";
  }
}

export function DetailsContent({ job, result, inline = false }: { job: ScanJob; result: ScanResult; inline?: boolean }) {
  const level: HeadingLevel = inline ? 3 : 2;
  const models = result.models.length;

  return (
    <div className="flex flex-col gap-5">
      {inline ? (
        <h2 id="details-heading" className="font-display text-h2-mobile font-extrabold">
          {detailsTitle(result)}
        </h2>
      ) : null}
      {result.mediaType === "audio" ? <AudioDetails job={job} result={result} level={level} /> : null}
      {result.mediaType === "video" ? <VideoDetails job={job} result={result} level={level} /> : null}
      {result.mediaType === "image" ? <ImageDetails job={job} result={result} level={level} /> : null}
      {result.mediaType === "text" ? <TextDetails job={job} result={result} level={level} /> : null}
      <Accordion
        headingLevel={level}
        sections={[
          {
            id: "why",
            title: "Why did Faike reach this result?",
            defaultOpen: true,
            content: <p className="max-w-[860px] text-body leading-[1.6] text-ink-soft">{whyText(result)}</p>,
          },
          {
            id: "models",
            title: "Model results",
            caption: `For the curious · ${models} ${plural(models, "model")}`,
            content: <ModelResults result={result} />,
          },
          {
            id: "technical",
            title: "Technical details",
            caption: "Metadata and check information",
            content: <TechnicalDetails result={result} />,
          },
        ]}
      />
      <FeedbackButtons job={job} withNotSure />
    </div>
  );
}

function Layout({ evidence, list, aside }: { evidence: ReactNode; list?: ReactNode; aside: ReactNode }) {
  return (
    <>
      {evidence}
      <div className={cx("flex flex-col gap-5", list ? "lg:flex-row lg:items-start" : null)}>
        {list ? <div className="min-w-0 flex-1">{list}</div> : null}
        <div className={list ? "flex flex-col gap-5 lg:w-(--width-aside) lg:shrink-0" : "grid items-start gap-5 sm:grid-cols-2"}>
          {aside}
        </div>
      </div>
    </>
  );
}

/** No preview: a post from a link is never copied to Faike; a local file's preview ends with a reload. */
function MediaUnavailable({ kind }: { kind: ScanJob["input"]["kind"] }) {
  return (
    <section className="rounded-lg bg-surface p-6 text-ui leading-[1.5] text-ink-soft">
      {kind === "link"
        ? "Faike doesn't keep a copy of posts from links, so the post isn't shown here. The result is unchanged."
        : "The preview isn't available after reloading the page. The result is unchanged."}
    </section>
  );
}

const range = (start: number, end: number) => `${formatDuration(start)} – ${formatDuration(end)}`;

function AudioDetails({ job, result, level }: { job: ScanJob; result: ScanResult; level: HeadingLevel }) {
  const player = useMediaPlayback(result.file.durationSec);
  const segments = result.segments ?? [];
  const src = job.media?.src;
  const items: FlaggedItem[] = segments.map((s) => ({
    id: s.id,
    primary: range(s.startSec, s.endSec),
    description: flaggedDescription("audio", s.strength),
    strength: s.strength,
    action: {
      label: "Play",
      ariaLabel: `Play moment ${s.id}, ${range(s.startSec, s.endSec)}`,
      onClick: () => player.playRange(s.startSec, s.endSec),
      disabled: !src,
    },
    active: player.playing && player.time >= s.startSec && player.time < s.endSec,
  }));

  return (
    <Layout
      evidence={
        src ? <AudioEvidence src={src} name={subjectName(result, job.input)} segments={segments} player={player} /> : <MediaUnavailable kind={job.input.kind} />
      }
      list={
        result.segments ? (
          <FlaggedList
            heading={flaggedHeading(result) ?? "Flagged moments"}
            items={items}
            emptyText="Faike didn't flag any moments in this recording."
            footer={result.unflaggedAssessedAuthentic ? "The rest of the recording sounded like a real person to Faike." : undefined}
            headingLevel={level}
          />
        ) : undefined
      }
      aside={
        <>
          {result.suitability?.length ? <SuitabilityChecklist checks={result.suitability} headingLevel={level} /> : null}
          <SourceCard result={result} headingLevel={level} />
          <FileDetails result={result} input={job.input} headingLevel={level} />
        </>
      }
    />
  );
}

function VideoDetails({ job, result, level }: { job: ScanJob; result: ScanResult; level: HeadingLevel }) {
  const player = useMediaPlayback(result.file.durationSec);
  const segments = result.segments ?? [];
  const src = job.media?.src;
  const items: FlaggedItem[] = segments.map((s) => ({
    id: s.id,
    primary: range(s.startSec, s.endSec),
    description: flaggedDescription("video", s.strength, s.lane),
    strength: s.strength,
    tag: s.lane ? LANE_LABEL[s.lane] : undefined,
    action: {
      label: "Play",
      ariaLabel: `Play moment ${s.id}, ${range(s.startSec, s.endSec)}${s.lane ? `, ${LANE_LABEL[s.lane].toLowerCase()}` : ""}`,
      onClick: () => player.playRange(s.startSec, s.endSec),
      disabled: !src,
    },
    active: player.playing && player.time >= s.startSec && player.time < s.endSec,
  }));

  return (
    <Layout
      evidence={
        src ? (
          <VideoEvidence src={src} poster={job.media?.posterSrc} segments={result.segments} sceneCuts={result.sceneCuts} player={player} />
        ) : (
          <MediaUnavailable kind={job.input.kind} />
        )
      }
      list={
        result.segments ? (
          <FlaggedList
            heading={flaggedHeading(result) ?? "Flagged moments"}
            items={items}
            emptyText="Faike didn't flag any moments in this video."
            headingLevel={level}
          />
        ) : undefined
      }
      aside={
        <>
          <LaneSummaryCard result={result} headingLevel={level} />
          <SourceCard result={result} headingLevel={level} />
          <FileDetails result={result} input={job.input} headingLevel={level} />
        </>
      }
    />
  );
}

function position(region: Region): string {
  const cx = region.x + region.w / 2;
  const cy = region.y + region.h / 2;
  const vertical = cy < 1 / 3 ? "Top" : cy < 2 / 3 ? "Middle" : "Bottom";
  const horizontal = cx < 1 / 3 ? "left" : cx < 2 / 3 ? "centre" : "right";
  return vertical === "Middle" && horizontal === "centre" ? "Centre" : `${vertical} ${horizontal}`;
}

function ImageDetails({ job, result, level }: { job: ScanJob; result: ScanResult; level: HeadingLevel }) {
  const [view, setView] = useState<ImageView>("original");
  const [overlay, setOverlay] = useState(70);
  const [zoom, setZoom] = useState<Region | null>(null);
  const evidenceRef = useRef<HTMLDivElement>(null);
  const regions = result.regions ?? [];
  const src = job.media?.src;

  const items: FlaggedItem[] = regions.map((region) => ({
    id: region.id,
    primary: `Area ${region.id} · ${position(region)}`,
    description: flaggedDescription("image", region.strength),
    strength: region.strength,
    action: {
      label: "Show",
      ariaLabel: `Show area ${region.id}, ${position(region).toLowerCase()}`,
      disabled: !src,
      onClick: () => {
        setView("original");
        setZoom(region);
        evidenceRef.current?.scrollIntoView({ block: "nearest" });
      },
    },
    active: zoom?.id === region.id,
  }));

  return (
    <Layout
      evidence={
        <div ref={evidenceRef}>
          {src ? (
            <ImageEvidence
              src={src}
              heatmapUrl={result.heatmapUrl}
              regions={regions}
              view={view}
              onViewChange={(next) => {
                setView(next);
                setZoom(null);
              }}
              overlay={overlay}
              onOverlayChange={setOverlay}
              zoom={zoom}
              onZoom={setZoom}
            />
          ) : (
            <MediaUnavailable kind={job.input.kind} />
          )}
        </div>
      }
      list={
        result.regions ? (
          <FlaggedList
            heading={flaggedHeading(result) ?? "Flagged areas"}
            items={items}
            emptyText="Faike didn't flag any particular area of this photo."
            headingLevel={level}
          />
        ) : undefined
      }
      aside={
        <>
          <SourceCard result={result} headingLevel={level} />
          <FileDetails result={result} input={job.input} headingLevel={level} />
        </>
      }
    />
  );
}

function TextDetails({ job, result, level }: { job: ScanJob; result: ScanResult; level: HeadingLevel }) {
  const text = job.input.text ?? "";
  const spans = [...(result.textSpans ?? [])].sort((a, b) => a.start - b.start);
  const items: FlaggedItem[] = spans.map((span, index) => {
    const passage = text.slice(span.start, span.end);
    const excerpt = passage.length > 64 ? `${passage.slice(0, 63)}…` : passage;
    return {
      id: index + 1,
      primary: `“${excerpt}”`,
      description: flaggedDescription("text", span.strength),
      strength: span.strength,
      action: {
        label: "Show",
        ariaLabel: `Show passage ${index + 1} in the text`,
        onClick: () => {
          const element = document.getElementById(spanElementId(result.scanId, index));
          element?.scrollIntoView({ block: "center" });
          element?.focus({ preventScroll: true });
        },
      },
    };
  });

  return (
    <Layout
      evidence={<TextEvidence scanId={result.scanId} text={text} spans={result.textSpans} />}
      list={
        result.textSpans ? (
          <FlaggedList
            heading={flaggedHeading(result) ?? "Flagged passages"}
            items={items}
            emptyText="Faike didn't flag any particular passage."
            headingLevel={level}
          />
        ) : undefined
      }
      aside={<FileDetails result={result} input={job.input} headingLevel={level} />}
    />
  );
}
