import { describe, expect, it } from "vitest";
import {
  getDailyDraftScoringTwistCopy,
  formatDailyDraftModeLabel,
} from "./dailyDraftMode";

describe("dailyDraftMode", () => {
  it("spells the Basic vs Advanced scoring twist", () => {
    expect(getDailyDraftScoringTwistCopy("basic")).toMatch(/per-game/i);
    expect(getDailyDraftScoringTwistCopy("advanced")).toMatch(/per-minute/i);
    expect(formatDailyDraftModeLabel("basic")).toBe("Basic");
    expect(formatDailyDraftModeLabel("advanced")).toBe("Advanced");
  });
});
