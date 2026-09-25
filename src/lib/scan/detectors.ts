import { RD_MODEL_NAMES_PUBLIC } from "@/config/rd";
import { VERDICT_LABEL } from "./copy";
import type { ModelResult } from "./types";

/*
 * Rows for "Model results": the individual detectors behind the overall
 * result, secondary to it. Built only from what RD returned. The status is
 * the main column; scores and descriptions appear only when at least one
 * detector has them, so the table stays useful if RD stops sending
 * per-detector scores. Names come from the response, never from code.
 */

export interface DetectorRow {
  key: string;
  label: string;
  /** RD's own name under a friendly label, when both exist. */
  name?: string;
  result: string;
  score?: number;
  checks?: string;
}

export function detectorTable(
  models: ModelResult[],
  namesPublic: boolean = RD_MODEL_NAMES_PUBLIC,
): { rows: DetectorRow[]; showScores: boolean; showChecks: boolean } {
  const rows = models.map((model, index) => ({
    key: `${index}:${model.name}`,
    label: namesPublic ? (model.friendlyName ?? model.name) : `Model ${index + 1}`,
    name: namesPublic && model.friendlyName ? model.name : undefined,
    result: model.pending ? "Still running" : model.verdict ? VERDICT_LABEL[model.verdict] : "No result",
    score: model.score,
    checks: model.checks,
  }));
  return {
    rows,
    showScores: rows.some((row) => row.score !== undefined),
    showChecks: rows.some((row) => row.checks !== undefined),
  };
}

/** Label for a heat map in the picker: RD's detector name when names may be shown, else a plain number. */
export function heatmapLabel(label: string, index: number, namesPublic: boolean = RD_MODEL_NAMES_PUBLIC): string {
  return namesPublic ? label : `Heat map ${index + 1}`;
}
