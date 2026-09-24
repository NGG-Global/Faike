/*
 * Signal meter thresholds (HANDOFF §9.2).
 *
 * PLACEHOLDERS. Reality Defender's calibrated thresholds are not known
 * (HANDOFF §12.2). Until they are confirmed, the bands are evenly spaced.
 * Change these values here only; components never hold thresholds.
 */

/**
 * Upper bounds of meter positions 0–3 (Likely real … Leaning AI). A score at
 * or above the last bound falls in position 4 (Likely AI).
 */
export const METER_BAND_BOUNDS_PLACEHOLDER = [0.2, 0.4, 0.6, 0.8] as const;

/**
 * Lower bounds of the "moderate" and "strong" signal-strength captions.
 * Scores below `moderate` read as "weak".
 */
export const SIGNAL_STRENGTH_BOUNDS_PLACEHOLDER = { moderate: 1 / 3, strong: 2 / 3 } as const;
