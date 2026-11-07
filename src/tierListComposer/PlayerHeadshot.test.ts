import { describe, expect, it } from "vitest";
import { coverSourceRect } from "./PlayerHeadshot";

describe("coverSourceRect", () => {
  it("crops a square headshot into a portrait cell without changing dest aspect", () => {
    const crop = coverSourceRect(500, 500, 100, 140);
    expect(crop.sw / crop.sh).toBeCloseTo(100 / 140);
    expect(crop.sh).toBe(500);
    expect(crop.sw).toBeLessThan(500);
    expect(crop.sx).toBeGreaterThan(0);
    expect(crop.sy).toBe(0);
  });

  it("crops a square headshot into a landscape cell from the top focus", () => {
    const crop = coverSourceRect(500, 500, 140, 100, 0.18);
    expect(crop.sw / crop.sh).toBeCloseTo(140 / 100);
    expect(crop.sw).toBe(500);
    expect(crop.sh).toBeLessThan(500);
    expect(crop.sx).toBe(0);
    expect(crop.sy).toBeGreaterThan(0);
  });
});
