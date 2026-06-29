import { describe, expect, it } from "vitest";
import { getYesterdayDailyBestPreview } from "./dailyDraftPreview";
import { getDailyDateKey } from "./dailyDraft";

describe("dailyDraftPreview", () => {
  it("returns yesterday's best formatted result", () => {
    const preview = getYesterdayDailyBestPreview(getDailyDateKey(), { wins: 0 });

    expect(preview).not.toBeNull();
    expect(preview?.formattedResult.length).toBeGreaterThan(0);
    expect(preview?.title.length).toBeGreaterThan(0);
  });
});
