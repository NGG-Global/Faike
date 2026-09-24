import { METER_BAND_BOUNDS_PLACEHOLDER, SIGNAL_STRENGTH_BOUNDS_PLACEHOLDER } from "@/config/meter";
import type { Verdict } from "./types";

/*
 * Signal meter position (HANDOFF §9.2), the handoff's most important logic
 * rule: the meter must never contradict the verdict. The verdict comes from
 * RD's ensemble result; the score only refines where inside that verdict
 * the file sits.
 */

export const METER_POSITIONS = ["Likely real", "Leaning real", "Unclear", "Leaning AI", "Likely AI"] as const;

export type MeterVerdict = Extract<Verdict, "authentic" | "suspicious" | "artificial">;

const ALLOWED_POSITIONS: Record<MeterVerdict, readonly number[]> = {
  authentic: [0, 1],
  suspicious: [1, 2, 3],
  artificial: [3, 4],
};

const CENTRE = 2;

export function isMeterVerdict(verdict: Verdict): verdict is MeterVerdict {
  return verdict in ALLOWED_POSITIONS;
}

/** A usable score in 0..1, or undefined when missing or not a number. */
export function normaliseScore(score: unknown): number | undefined {
  if (typeof score !== "number" || !Number.isFinite(score)) return undefined;
  return Math.min(1, Math.max(0, score));
}

export function bandFor(score: number, bounds: readonly number[] = METER_BAND_BOUNDS_PLACEHOLDER): number {
  let position = 0;
  while (position < bounds.length && score >= bounds[position]) position += 1;
  return position;
}

/**
 * Meter position 0–4, or null when the meter is hidden (not applicable,
 * unable). Without a score, the marker sits on the allowed position closest
 * to the centre, so a missing score never overstates the result.
 */
export function meterPosition(verdict: Verdict, score?: number): number | null {
  if (!isMeterVerdict(verdict)) return null;
  const allowed = ALLOWED_POSITIONS[verdict];
  const min = allowed[0];
  const max = allowed[allowed.length - 1];
  const value = normaliseScore(score);
  if (value === undefined) {
    return allowed.reduce((best, p) => (Math.abs(p - CENTRE) < Math.abs(best - CENTRE) ? p : best));
  }
  return Math.min(max, Math.max(min, bandFor(value)));
}

export type SignalStrength = "weak" | "moderate" | "strong";

/** Caption value; null (caption hidden) when there is no score. */
export function signalStrength(score?: number): SignalStrength | null {
  const value = normaliseScore(score);
  if (value === undefined) return null;
  if (value >= SIGNAL_STRENGTH_BOUNDS_PLACEHOLDER.strong) return "strong";
  if (value >= SIGNAL_STRENGTH_BOUNDS_PLACEHOLDER.moderate) return "moderate";
  return "weak";
}

const ORDINALS = ["first", "second", "third", "fourth", "fifth"];

/** Accessible description of the meter (HANDOFF §6.11). */
export function meterDescription(position: number): string {
  return `Signal meter: this file lands on ${METER_POSITIONS[position]}, the ${ORDINALS[position]} of five positions from Likely real to Likely AI.`;
}
