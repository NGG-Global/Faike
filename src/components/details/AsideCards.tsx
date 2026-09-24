import { MEDIA } from "@/config/media";
import { countWords, formatBytes, formatDateTime, languageName, plural } from "@/lib/format";
import { LANE_LABEL, laneVerdictLabel } from "@/lib/scan/copy";
import { subjectName } from "@/lib/scan/facts";
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

/** HANDOFF §6.20. Only rows with data are shown. */
export function FileDetails({
  result,
  input,
  headingLevel = 2,
}: {
  result: ScanResult;
  input: InputSummary;
  headingLevel?: HeadingLevel;
}) {
  const { file } = result;
  const type = [MEDIA[result.mediaType].typeLabel, file.format, file.sizeBytes !== undefined ? formatBytes(file.sizeBytes) : undefined]
    .filter(Boolean)
    .join(" · ");
  const rows: [string, string][] = [
    ["File", result.source.kind === "file" ? subjectName(result, input) : result.source.kind === "paste" ? "Pasted text" : "From a link"],
    ["Type", type],
  ];
  if (file.width && file.height) rows.push(["Dimensions", `${file.width} × ${file.height} pixels`]);
  if (result.mediaType === "text" && input.text) {
    const words = countWords(input.text);
    rows.push(["Length", `${words.toLocaleString("en")} ${plural(words, "word")}`]);
  }
  if (result.language) rows.push(["Language", `${languageName(result.language)} (detected)`]);
  if (result.source.kind === "link" && result.source.platform) rows.push(["Source", result.source.platform]);
  rows.push(["Checked", formatDateTime(result.checkedAt)]);

  return (
    <section className="rounded-lg bg-surface p-6">
      <CardHeading level={headingLevel}>File details</CardHeading>
      <dl>
        {rows.map(([label, value]) => (
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

/** HANDOFF §7.5 video: picture vs sound ("Picture: looks real · Sound: some signals"). */
export function LaneSummaryCard({ result, headingLevel = 2 }: { result: ScanResult; headingLevel?: HeadingLevel }) {
  const lanes = (["picture", "sound"] as Lane[]).filter((lane) => result.partial?.[lane]);
  if (!lanes.length) return null;
  return (
    <section className="rounded-lg bg-surface p-6">
      <CardHeading level={headingLevel}>Picture and sound</CardHeading>
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
