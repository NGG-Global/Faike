import type { Verdict } from "@/lib/scan/types";

/*
 * Reality Defender's verdict concepts and their mapping to Faike verdicts.
 *
 * RD's Media Detail documentation (checked 24 Sep 2026) lists these five
 * values for `resultsSummary.status` (the ensemble result) and
 * `overallStatus`. Pure mapping with no secrets, so the mock and the server
 * adapter (src/lib/rd/adapter.ts) share it.
 */

export const RD_VERDICTS = [
  "AUTHENTIC",
  "FAKE",
  "SUSPICIOUS",
  "NOT_APPLICABLE",
  "UNABLE_TO_EVALUATE",
] as const;

export type RdVerdict = (typeof RD_VERDICTS)[number];

const RD_TO_FAIKE: Record<RdVerdict, Verdict> = {
  AUTHENTIC: "authentic",
  FAKE: "artificial",
  SUSPICIOUS: "suspicious",
  NOT_APPLICABLE: "not_applicable",
  UNABLE_TO_EVALUATE: "unable",
};

export function isRdVerdict(value: unknown): value is RdVerdict {
  return typeof value === "string" && (RD_VERDICTS as readonly string[]).includes(value);
}

/**
 * Defensive mapping: anything missing or unrecognised becomes "unable",
 * never a verdict about the content.
 */
export function verdictFromRd(value: unknown): Verdict {
  if (typeof value !== "string") return "unable";
  const key = value.trim().toUpperCase();
  return isRdVerdict(key) ? RD_TO_FAIKE[key] : "unable";
}
