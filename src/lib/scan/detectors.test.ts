import { describe, expect, it } from "vitest";
import { detectorTable, heatmapLabel } from "./detectors";

describe("detectorTable", () => {
  it("shows RD's detector names, results and scores", () => {
    const table = detectorTable(
      [
        { name: "mock-a", verdict: "artificial", score: 0.99 },
        { name: "mock-b", pending: true },
        { name: "mock-c" },
      ],
      true,
    );
    expect(table.rows.map((row) => [row.label, row.result, row.score])).toEqual([
      ["mock-a", "Artificial", 0.99],
      ["mock-b", "Still running", undefined],
      ["mock-c", "No result", undefined],
    ]);
    expect(table).toMatchObject({ showScores: true, showChecks: false });
  });

  it("stays useful when RD returns no per-detector scores", () => {
    const table = detectorTable([{ name: "mock-a", verdict: "authentic" }, { name: "mock-b", verdict: "suspicious" }], true);
    expect(table.showScores).toBe(false);
    expect(table.rows.map((row) => row.result)).toEqual(["Authentic", "Suspicious"]);
  });

  it("labels by position when names must not be shown", () => {
    const table = detectorTable([{ name: "mock-a", friendlyName: "Edits", verdict: "artificial" }], false);
    expect(table.rows[0]).toMatchObject({ label: "Model 1" });
    expect(table.rows[0].name).toBeUndefined();
    expect(heatmapLabel("mock-a", 1, false)).toBe("Heat map 2");
    expect(heatmapLabel("mock-a", 1, true)).toBe("mock-a");
  });
});
