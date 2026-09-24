import type { Verdict } from "@/lib/scan/types";

/*
 * Reality Defender's verdict concepts and their mapping to Faike verdicts.
 *
 * The concept names come from the product brief. The exact field that
 * carries them in RD's response must be confirmed (HANDOFF §12.1) before the
 * server adapter uses this. Pure mapping with no secrets, so the mock and the
 * future server adapter share it.
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
