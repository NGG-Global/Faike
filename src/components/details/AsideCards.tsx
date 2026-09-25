import { LANE_LABEL, laneVerdictLabel } from "@/lib/scan/copy";
import { fileDetailRows } from "@/lib/scan/facts";
import type { InputSummary } from "@/lib/scan/job";
import type { Lane, ScanResult } from "@/lib/scan/types";
import { cx } from "@/lib/cx";
import { Icon } from "@/components/ui/Icon";
import { VERDICT_TONE } from "@/components/ui/Tags";

/* Aside cards of the details view (HANDOFF §6.20, §7.5). */

type HeadingLevel = 2 | 3;

function CardHeading({ level, children }: { level: HeadingLevel; children: string }) {
  const Heading = level === 2 ? "h2" : "h3";
  return <Heading className="mb-3 text-body font-bold">{children}</Heading>;
}

/** HANDOFF §6.20. Consumer-facing rows only, and only those with data (fileDetailRows). */
export function FileDetails({
  result,
  input,
  headingLevel = 2,
}: {
  result: ScanResult;
  input: InputSummary;
  headingLevel?: HeadingLevel;
}) {
  return (
    <section className="rounded-lg bg-surface p-6">
      <CardHeading level={headingLevel}>File details</CardHeading>
      <dl>
        {fileDetailRows(result, input).map(([label, value]) => (
          <div key={label} className="mb-3.5 last:mb-0">
            <dt className="text-caption text-muted">{label}</dt>
            <dd className="mt-0.5 text-ui font-semibold break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** HANDOFF §7.5 social link "Source" card. Links out; never re-hosts. */
export function SourceCard({ result, headingLevel = 2 }: { result: ScanResult; headingLevel?: HeadingLevel }) {
  const { source } = result;
  if (source.kind !== "link" || !source.url) return null;
  return (
    <section className="rounded-lg bg-surface p-6">
      <CardHeading level={headingLevel}>Source</CardHeading>
      <dl>
        {source.platform ? (
          <div className="mb-3.5">
            <dt className="text-caption text-muted">Platform</dt>
            <dd className="mt-0.5 text-ui font-semibold">{source.platform}</dd>
          </div>
        ) : null}
        {source.handle ? (
          <div className="mb-3.5">
            <dt className="text-caption text-muted">Account</dt>
            <dd className="mt-0.5 text-ui font-semibold">{source.handle}</dd>
          </div>
        ) : null}
      </dl>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-1.5 text-ui font-semibold underline underline-offset-4 hover:text-verdict-authentic-fg"
      >
        Open the original post
        <Icon name="external" size={16} />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </section>
  );
}

/**
 * HANDOFF §7.5 video: picture vs sound ("Picture: looks real · Sound: some
 * signals"). With real data RD reports the sound as its own check beside
 * the overall result, so the card may show the sound alone.
 */
export function LaneSummaryCard({ result, headingLevel = 2 }: { result: ScanResult; headingLevel?: HeadingLevel }) {
  const lanes = (["picture", "sound"] as Lane[]).filter((lane) => result.partial?.[lane]);
  if (!lanes.length) return null;
  const soundOnly = lanes.length === 1 && lanes[0] === "sound";
  return (
    <section className="rounded-lg bg-surface p-6">
      <CardHeading level={headingLevel}>{lanes.length === 2 ? "Picture and sound" : soundOnly ? "Sound check" : LANE_LABEL[lanes[0]]}</CardHeading>
      {soundOnly ? <p className="-mt-1.5 mb-3 text-small text-muted">Checked separately, beside the overall result.</p> : null}
      <ul className="flex flex-col gap-2.5">
        {lanes.map((lane) => {
          const value = result.partial![lane]!;
          return (
            <li key={lane} className="flex items-center justify-between gap-3 rounded-tile bg-surface-sunk px-3.5 py-3">
              <span className="text-ui font-bold">{LANE_LABEL[lane]}</span>
              <span
                className={cx(
                  "rounded-pill px-2.5 py-1 text-caption font-bold",
                  value === "pending" ? "text-muted" : cx(VERDICT_TONE[value].tint, VERDICT_TONE[value].fg),
                )}
              >
                {laneVerdictLabel(value)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
