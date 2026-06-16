import { describe, expect, it } from "vitest";
import { lookupJerseyNumber } from "./jerseyNumbers";

describe("jerseyNumbers", () => {
  it("returns roster numbers when available", () => {
    expect(lookupJerseyNumber("duranke01", "duranke01-hou", "HOU")).toBe(7);
  });

  it("falls back to a stable jersey number when missing", () => {
    const first = lookupJerseyNumber(undefined, "missing-player-id", "LAL");
    const second = lookupJerseyNumber(undefined, "missing-player-id", "LAL");

    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(100);
    expect(second).toBe(first);
  });
});
