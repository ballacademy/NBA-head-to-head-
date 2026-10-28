import { describe, expect, it } from "vitest";
import { splitLeaderBarsTitle } from "./leaderBarsState";

describe("leader bars title", () => {
  it("splits PPG LEADERS onto two overlay lines, not four", () => {
    expect(splitLeaderBarsTitle("PPG LEADERS")).toEqual(["PPG", "LEADERS"]);
  });
});
