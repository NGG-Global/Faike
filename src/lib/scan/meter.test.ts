import { describe, expect, it } from "vitest";
import { bandFor, meterDescription, meterPosition, normaliseScore, signalStrength } from "./meter";
import type { Verdict } from "./types";

describe("bandFor (placeholder bands)", () => {
  it("maps scores to five evenly spaced bands", () => {
    expect(bandFor(0)).toBe(0);
    expect(bandFor(0.19)).toBe(0);
    expect(bandFor(0.2)).toBe(1);
    expect(bandFor(0.5)).toBe(2);
    expect(bandFor(0.79)).toBe(3);
    expect(bandFor(0.8)).toBe(4);
    expect(bandFor(1)).toBe(4);
  });
});

describe("meterPosition (HANDOFF §9.2)", () => {
  const allowed: Record<"authentic" | "suspicious" | "artificial", number[]> = {
    authentic: [0, 1],
    suspicious: [1, 2, 3],
    artificial: [3, 4],
  };

  it("never contradicts the verdict for any score", () => {
    for (const verdict of Object.keys(allowed) as (keyof typeof allowed)[]) {
      for (let i = 0; i <= 100; i += 1) {
        expect(allowed[verdict]).toContain(meterPosition(verdict, i / 100));
      }
    }
  });

  it("clamps into the verdict's range", () => {
    expect(meterPosition("authentic", 0.95)).toBe(1);
    expect(meterPosition("artificial", 0.05)).toBe(3);
    expect(meterPosition("suspicious", 0.01)).toBe(1);
    expect(meterPosition("suspicious", 0.99)).toBe(3);
  });

  it("uses the score within the range", () => {
    expect(meterPosition("authentic", 0.1)).toBe(0);
    expect(meterPosition("suspicious", 0.64)).toBe(3);
    expect(meterPosition("artificial", 0.92)).toBe(4);
  });

  it("places a missing or invalid score on the least extreme allowed position", () => {
    expect(meterPosition("authentic")).toBe(1);
    expect(meterPosition("suspicious")).toBe(2);
    expect(meterPosition("artificial")).toBe(3);
    expect(meterPosition("artificial", Number.NaN)).toBe(3);
  });

  it("hides the meter for non-verdict results", () => {
    for (const verdict of ["not_applicable", "unable"] as Verdict[]) {
      expect(meterPosition(verdict, 0.5)).toBeNull();
    }
  });
});

describe("normaliseScore and signalStrength", () => {
  it("rejects non-numbers and clamps out-of-range values", () => {
    expect(normaliseScore("0.4")).toBeUndefined();
    expect(normaliseScore(Infinity)).toBeUndefined();
    expect(normaliseScore(-1)).toBe(0);
    expect(normaliseScore(3)).toBe(1);
  });

  it("derives the caption from the score and hides it without one", () => {
    expect(signalStrength(undefined)).toBeNull();
    expect(signalStrength(0.1)).toBe("weak");
    expect(signalStrength(0.64)).toBe("moderate");
    expect(signalStrength(0.9)).toBe("strong");
  });

  it("describes the position in words", () => {
    expect(meterDescription(3)).toBe(
      "Signal meter: this file lands on Leaning AI, the fourth of five positions from Likely real to Likely AI.",
    );
  });
});
