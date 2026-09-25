import { formatScore } from "@/lib/format";
import { detectorTable } from "@/lib/scan/detectors";
import type { ScanResult } from "@/lib/scan/types";

/*
 * Collapsed sections of the accordion (HANDOFF §6.21): model results and
 * technical details. The only place technical vocabulary appears. Scores
 * are labelled as model output scores, not probabilities. Detector names
 * are RD data (RD_MODEL_NAMES_PUBLIC). Both sections are left out when RD
 * returned nothing for them.
 */

const SCORE_NOTE = "Scores are model output scores from 0 to 1. They are not probabilities.";

/** The detectors behind the overall result (detectorTable). Rendered only when RD returned some. */
export function ModelResults({ result }: { result: ScanResult }) {
  const { rows, showScores, showChecks } = detectorTable(result.models);
  return (
    <div>
      <p className="mb-4 text-small text-muted">
        The overall result combines these checks. Individual checks can disagree with it and with each other.
        {showScores ? ` ${SCORE_NOTE}` : ""}
      </p>

      <table className="hidden w-full border-collapse text-left text-ui sm:table">
        <thead>
          <tr className="border-b border-line text-caption text-muted">
            <th scope="col" className="py-2 pr-4 font-semibold">Model</th>
            {showChecks ? <th scope="col" className="py-2 pr-4 font-semibold">What it checks</th> : null}
            <th scope="col" className="py-2 pr-4 font-semibold">Result</th>
            {showScores ? <th scope="col" className="py-2 text-right font-semibold">Output score</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-line last:border-0">
              <th scope="row" className="py-3 pr-4 align-top font-semibold break-all">
                {row.label}
                {row.name ? <span className="block text-caption font-normal text-muted">{row.name}</span> : null}
              </th>
              {showChecks ? <td className="py-3 pr-4 align-top text-ink-soft">{row.checks ?? "Not described"}</td> : null}
              <td className="py-3 pr-4 align-top">{row.result}</td>
              {showScores ? (
                <td className="py-3 text-right align-top tabular-nums">{row.score !== undefined ? formatScore(row.score) : "Not given"}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-2.5 sm:hidden">
        {rows.map((row) => (
          <li key={row.key} className="rounded-row bg-surface-sunk p-4">
            <p className="text-ui font-semibold break-all">{row.label}</p>
            {row.name ? <p className="text-caption text-muted">{row.name}</p> : null}
            {row.checks ? <p className="mt-1.5 text-small text-ink-soft">{row.checks}</p> : null}
            <dl className="mt-2 flex gap-6 text-small">
              <div>
                <dt className="text-muted">Result</dt>
                <dd className="font-semibold">{row.result}</dd>
              </div>
              {row.score !== undefined ? (
                <div>
                  <dt className="text-muted">Output score</dt>
                  <dd className="font-semibold tabular-nums">{formatScore(row.score)}</dd>
                </div>
              ) : null}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The overall output score, the only number shown for a result, and only
 * when RD returned a valid one (the section is left out otherwise).
 */
export function TechnicalDetails({ result }: { result: ScanResult }) {
  if (result.ensembleScore === undefined) return null;
  return (
    <dl>
      <dt className="text-caption text-muted">Overall output score</dt>
      <dd className="mt-0.5 text-ui font-semibold tabular-nums">{formatScore(result.ensembleScore)}</dd>
      <dd className="mt-2 max-w-[640px] text-small text-muted">
        From 0 to 1, for the combined checks. It is a model output score, not a probability, and not proof.
      </dd>
    </dl>
  );
}
