import { describe, expect, it } from "vitest";
import { paintHeatmap, parseHexColor, type HeatmapPalette } from "./heatmap";

const palette: HeatmapPalette = { some: [233, 169, 58], strong: [224, 138, 0] };

/** RGBA pixels from [r, g, b, a] tuples. */
function pixels(...values: [number, number, number, number][]) {
  return new Uint8ClampedArray(values.flat());
}

const at = (data: Uint8ClampedArray, index: number) => Array.from(data.slice(index * 4, index * 4 + 4));

describe("paintHeatmap", () => {
  it("draws RD's white mask in the signal colours, scaled to the map's strongest point", () => {
    // Like RD's live map: a faint haze, a fade and one hot spot, in transparency only.
    const data = pixels([255, 255, 255, 0], [255, 255, 255, 10], [255, 255, 255, 60], [255, 255, 255, 200]);
    expect(paintHeatmap(data, palette)).toBe(true);
    expect(at(data, 0)).toEqual([0, 0, 0, 0]);
    expect(at(data, 1)).toEqual([0, 0, 0, 0]); // haze under the floor stays clear
    const fade = at(data, 2);
    expect(fade[3]).toBeGreaterThan(90); // visible, unlike RD's raw 60/255
    expect(fade[3]).toBeLessThan(255);
    expect(fade.slice(0, 3)).not.toEqual([...palette.strong]);
    expect(at(data, 3)).toEqual([...palette.strong, 255]);
  });

  it("does not let a few stray pixels set the scale", () => {
    const values: [number, number, number, number][] = Array.from({ length: 2_000 }, () => [255, 255, 255, 100]);
    values.push([255, 255, 255, 255]);
    const data = pixels(...values);
    paintHeatmap(data, palette);
    expect(at(data, 0)).toEqual([...palette.strong, 255]);
  });

  it("reads plain greyscale maps too", () => {
    const data = pixels([0, 0, 0, 255], [200, 200, 200, 255]);
    expect(paintHeatmap(data, palette)).toBe(true);
    expect(at(data, 0)[3]).toBe(0);
    expect(at(data, 1)).toEqual([...palette.strong, 255]);
  });

  it("reports a map that marks nothing visible, and leaves it clear", () => {
    const data = pixels([255, 255, 255, 3], [255, 255, 255, 5], [255, 255, 255, 0]);
    expect(paintHeatmap(data, palette)).toBe(false);
    expect(Array.from(data).every((value) => value === 0)).toBe(true);
    expect(paintHeatmap(new Uint8ClampedArray(0), palette)).toBe(false);
  });
});

describe("parseHexColor", () => {
  it("reads the tokens' hex colours", () => {
    expect(parseHexColor("#E08A00")).toEqual([224, 138, 0]);
    expect(parseHexColor(" #e80 ")).toEqual([238, 136, 0]);
  });

  it("refuses anything else", () => {
    for (const value of ["", "E08A0", "#GGGGGG", "rgb(1, 2, 3)", "var(--x)"]) expect(parseHexColor(value), value).toBeUndefined();
  });
});
