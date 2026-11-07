import { describe, expect, it } from "vitest";
import {
  defaultLeaderBarsDraft,
  normalizeLeaderBarsDraft,
  splitLeaderBarsTitle,
} from "./leaderBarsState";

describe("leader bars title", () => {
  it("splits PPG LEADERS onto two overlay lines, not four", () => {
    expect(splitLeaderBarsTitle("PPG LEADERS")).toEqual(["PPG", "LEADERS"]);
  });

  it("defaults team-color name plates on", () => {
    expect(defaultLeaderBarsDraft().namePlates).toBe(true);
    expect(normalizeLeaderBarsDraft({ namePlates: false }).namePlates).toBe(false);
  });
});
