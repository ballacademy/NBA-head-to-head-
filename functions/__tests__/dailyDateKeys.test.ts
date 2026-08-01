import { describe, expect, it } from "vitest";
import {
  getEasternDateKey,
  isAllowedDailySubmissionDateKey,
  subtractDaysFromDateKey,
} from "../lib/dailyDateKeys";

describe("dailyDateKeys", () => {
  it("allows today and yesterday Eastern keys only", () => {
    const today = getEasternDateKey(new Date("2026-07-31T18:00:00.000Z"));
    const yesterday = subtractDaysFromDateKey(today, 1);
    const tomorrow = subtractDaysFromDateKey(today, -1);

    expect(isAllowedDailySubmissionDateKey(today, new Date("2026-07-31T18:00:00.000Z"))).toBe(
      true,
    );
    expect(
      isAllowedDailySubmissionDateKey(yesterday, new Date("2026-07-31T18:00:00.000Z")),
    ).toBe(true);
    expect(
      isAllowedDailySubmissionDateKey(tomorrow, new Date("2026-07-31T18:00:00.000Z")),
    ).toBe(false);
    expect(
      isAllowedDailySubmissionDateKey("2020-01-01", new Date("2026-07-31T18:00:00.000Z")),
    ).toBe(false);
  });
});
