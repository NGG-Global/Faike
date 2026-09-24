import { MEDIA } from "@/config/media";
import { formatDuration, formatScore } from "@/lib/format";
import { VERDICT_LABEL } from "@/lib/scan/copy";
import type { ScanResult } from "@/lib/scan/types";

/*
 * Collapsed sections of the accordion (HANDOFF §6.21): model results and
 * technical details. The only place technical vocabulary appears. Scores
 * are labelled as model output scores, not probabilities. Model names are
 * RD data (display subject to RD's permission, §12.12).
 */

const SCORE_NOTE = "Scores are model output scores from 0 to 1. They are not probabilities.";

export function ModelResults({ result }: { result: ScanResult }) {
  if (!result.models.length) {
    return <p className="text-body leading-[1.6] text-ink-soft">No individual model results were returned for this check.</p>;
  }
  return (
    <div>
      <p className="mb-4 text-small text-muted">{SCORE_NOTE}</p>

      <table className="hidden w-full border-collapse text-left text-ui sm:table">
        <thead>
          <tr className="border-b border-line text-caption text-muted">
            <th scope="col" className="py-2 pr-4 font-semibold">Model</th>
            <th scope="col" className="py-2 pr-4 font-semibold">What it checks</th>
            <th scope="col" className="py-2 pr-4 font-semibold">Result</th>
            <th scope="col" className="py-2 text-right font-semibold">Output score</th>
          </tr>
        </thead>
        <tbody>
          {result.models.map((model) => (
            <tr key={model.name} className="border-b border-line last:border-0">
              <th scope="row" className="py-3 pr-4 align-top font-semibold">
                {model.friendlyName ?? model.name}
                {model.friendlyName ? <span className="block text-caption font-normal text-muted">{model.name}</span> : null}
              </th>
              <td className="py-3 pr-4 align-top text-ink-soft">{model.checks ?? "—"}</td>
              <td className="py-3 pr-4 align-top">{model.verdict ? VERDICT_LABEL[model.verdict] : "—"}</td>
              <td className="py-3 text-right align-top tabular-nums">{model.score !== undefined ? formatScore(model.score) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-2.5 sm:hidden">
        {result.models.map((model) => (
          <li key={model.name} className="rounded-row bg-surface-sunk p-4">
            <p className="text-ui font-semibold">{model.friendlyName ?? model.name}</p>
            {model.friendlyName ? <p className="text-caption text-muted">{model.name}</p> : null}
            {model.checks ? <p className="mt-1.5 text-small text-ink-soft">{model.checks}</p> : null}
            <dl className="mt-2 flex gap-6 text-small">
              <div>
                <dt className="text-muted">Result</dt>
                <dd className="font-semibold">{model.verdict ? VERDICT_LABEL[model.verdict] : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Output score</dt>
                <dd className="font-semibold tabular-nums">{model.score !== undefined ? formatScore(model.score) : "—"}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TechnicalDetails({ result }: { result: ScanResult }) {
  const { file } = result;
  const rows: [string, string][] = [
    ["Check ID", result.scanId],
    ["Checked at", result.checkedAt],
    ["Media type", `${MEDIA[result.mediaType].typeLabel} (${result.mediaType})`],
    ["Input", result.source.kind === "paste" ? "Pasted text" : result.source.kind === "link" ? "Social link" : "File upload"],
  ];
  if (file.format) rows.push(["Format", file.format]);
  if (file.sizeBytes !== undefined) rows.push(["Size", `${file.sizeBytes.toLocaleString("en")} bytes`]);
  if (file.durationSec !== undefined) rows.push(["Duration", `${formatDuration(file.durationSec)} (${file.durationSec.toFixed(1)} s)`]);
  if (file.width && file.height) rows.push(["Dimensions", `${file.width} × ${file.height} px`]);
  if (result.language) rows.push(["Language code", result.language]);
  if (result.ensembleScore !== undefined) {
    rows.push(["Overall output score", `${formatScore(result.ensembleScore)} (ensemble; not a probability)`]);
  }
  rows.push(["Models reporting", String(result.models.length)]);
  if (result.source.url) rows.push(["Link", result.source.url]);

  return (
    <dl className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-caption text-muted">{label}</dt>
          <dd className="mt-0.5 text-ui font-semibold break-all">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
