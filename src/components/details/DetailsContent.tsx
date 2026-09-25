"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMediaPlayback } from "@/hooks/useMediaPlayback";
import { scanService } from "@/lib/scan/client";
import { cx } from "@/lib/cx";
import { formatDuration, plural } from "@/lib/format";
import { flaggedDescription, HEATMAP_COPY, LANE_LABEL, whyText } from "@/lib/scan/copy";
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
import type { HeatmapStatus } from "./HeatmapLayer";
import { ImageEvidence, type ImageView } from "./ImageEvidence";
import { spanElementId, TextEvidence } from "./TextEvidence";
import { TextExplanation } from "./TextExplanation";
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
  const settled = useLaterDetail(job.id);

  return (
    <div className="flex flex-col gap-5">
      {inline ? (
        <h2 id="details-heading" className="font-display text-h2-mobile font-extrabold">
          {detailsTitle(result)}
        </h2>
      ) : null}
      {result.mediaType === "audio" ? <AudioDetails job={job} result={result} level={level} /> : null}
      {result.mediaType === "video" ? <VideoDetails job={job} result={result} level={level} /> : null}
      {result.mediaType === "image" ? <ImageDetails job={job} result={result} level={level} settled={settled} /> : null}
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
          // Detector results and the score are secondary: collapsed, and left out when RD returned none.
          ...(models
            ? [
                {
                  id: "models",
                  title: "Model results",
                  caption: `For the curious · ${models} ${plural(models, "model")}`,
                  content: <ModelResults result={result} />,
                },
              ]
            : []),
          ...(result.ensembleScore !== undefined
            ? [{ id: "technical", title: "Technical details", caption: "Overall output score", content: <TechnicalDetails result={result} /> }]
            : []),
        ]}
      />
      <FeedbackButtons job={job} withNotSure />
    </div>
  );
}

/**
 * Detectors can finish after the overall result. While the details are
 * open, the check is re-read a few times until they do (scanService.refresh),
 * which fills in their rows and any heat maps they produce. The verdict never
 * changes. Resolves to true once that has finished.
 */
function useLaterDetail(id: string): boolean {
  const [settledFor, setSettledFor] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    void scanService
      .refresh(id)
      .catch(() => false)
      .then(() => {
        if (current) setSettledFor(id);
      });
    return () => {
      current = false;
    };
  }, [id]);
  return settledFor === id;
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

function ImageDetails({ job, result, level, settled }: { job: ScanJob; result: ScanResult; level: HeadingLevel; settled: boolean }) {
  const [choice, setChoice] = useState<ImageView | null>(null);
  const [overlay, setOverlay] = useState(70);
  const [zoom, setZoom] = useState<Region | null>(null);
  const [heatmapIndex, setHeatmapIndex] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, HeatmapStatus>>({});
  const evidenceRef = useRef<HTMLDivElement>(null);

  // A heat map that failed to load or marks nothing is left out of the picker.
  const heatmaps = (result.heatmaps ?? []).filter((heatmap) => statuses[heatmap.url] !== "failed" && statuses[heatmap.url] !== "empty");
  const regions = result.regions ?? [];
  const src = job.media?.src;
  // "Show me where" opens on the heat map when there is one (the person can switch back).
  const view: ImageView = choice ?? (heatmaps.length ? "heatmap" : "original");
  const note = heatmapNote(result, heatmaps.length, statuses, settled);

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
        setChoice("original");
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
              heatmaps={heatmaps.length ? heatmaps : undefined}
              heatmapIndex={heatmapIndex}
              onHeatmapIndexChange={setHeatmapIndex}
              onHeatmapStatus={(url, status) => setStatuses((known) => (known[url] === status ? known : { ...known, [url]: status }))}
              regions={regions}
              view={view}
              onViewChange={(next) => {
                setChoice(next);
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
          {src && note ? <p className="mt-2 text-small text-muted">{note}</p> : null}
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

/**
 * What to say when a photo that "Show me where" leads to has no heat map to
 * show: none came back, one is still expected, or the ones that came back
 * could not be drawn. Nothing when there is something to show.
 */
function heatmapNote(result: ScanResult, drawable: number, statuses: Record<string, HeatmapStatus>, settled: boolean): string | undefined {
  if (drawable || result.regions?.length) return undefined;
  const loaded = Object.values(statuses);
  if (result.heatmaps?.length) return loaded.includes("failed") ? HEATMAP_COPY.failed : loaded.length ? HEATMAP_COPY.empty : undefined;
  if (result.verdict !== "suspicious" && result.verdict !== "artificial") return undefined;
  return !settled && result.models.some((model) => model.pending) ? HEATMAP_COPY.pending : HEATMAP_COPY.none;
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
      evidence={
        <div className="flex flex-col gap-5">
          <TextEvidence scanId={result.scanId} text={text} spans={result.textSpans} />
          {result.hasExplainability && job.requestId ? <TextExplanation requestId={job.requestId} headingLevel={level} /> : null}
        </div>
      }
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
