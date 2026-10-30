import { describe, expect, it } from "vitest";
import {
  dateRangeChipsForHud,
  datesInInclusiveRange,
  isAutoWeekLine,
  last5DaysRange,
  lastWeekRange,
  nextNDaysRange,
  matchDateRangePreset,
  mondayOfIsoWeek,
  normalizeDateRange,
  parseComposerDateRange,
  rangeWeekLine,
  thisWeekRange,
  tonightRange,
} from "./composerDateRange";

describe("composer date range", () => {
  it("uses Monday–Sunday ET weeks and last 5 inclusive days", () => {
    const now = new Date("2026-10-17T18:00:00-04:00");
    expect(mondayOfIsoWeek("2026-10-17")).toBe("2026-10-12");
    expect(mondayOfIsoWeek("2026-10-12")).toBe("2026-10-12");
    expect(mondayOfIsoWeek("2026-10-18")).toBe("2026-10-12");
    expect(thisWeekRange(now)).toEqual({
      from: "2026-10-12",
      to: "2026-10-18",
    });
    expect(lastWeekRange(now)).toEqual({
      from: "2026-10-05",
      to: "2026-10-11",
    });
    expect(last5DaysRange(now)).toEqual({
      from: "2026-10-13",
      to: "2026-10-17",
    });
    expect(nextNDaysRange(7, now)).toEqual({
      from: "2026-10-17",
      to: "2026-10-23",
    });
    expect(matchDateRangePreset("2026-10-12", "2026-10-18", now)).toBe(
      "this-week",
    );
    expect(matchDateRangePreset("2026-10-17", "2026-10-17", now)).toBe(
      "tonight",
    );
  });

  it("swaps inverted from/to and caps inclusive nights", () => {
    expect(normalizeDateRange("2026-10-18", "2026-10-12")).toEqual({
      from: "2026-10-12",
      to: "2026-10-18",
    });
    expect(datesInInclusiveRange("2026-10-12", "2026-10-14")).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
    ]);
    expect(datesInInclusiveRange("2026-10-01", "2026-11-30")).toHaveLength(21);
  });

  it("writes an editable week line and leaves custom text alone", () => {
    expect(rangeWeekLine("2026-10-13", "2026-10-19")).toBe(
      "OCT 13 – 19, 2026",
    );
    expect(rangeWeekLine("2026-09-28", "2026-10-04")).toBe(
      "SEP 28 – OCT 4, 2026",
    );
    expect(rangeWeekLine("2026-10-16", "2026-10-16")).toBe("OCT 16, 2026");
    expect(isAutoWeekLine("", "2026-10-13", "2026-10-19")).toBe(true);
    expect(
      isAutoWeekLine("OCT 13 – 19, 2026", "2026-10-13", "2026-10-19"),
    ).toBe(true);
    expect(
      isAutoWeekLine("MONSTER WEEK", "2026-10-13", "2026-10-19"),
    ).toBe(false);
  });

  it("puts This week first for TOTW and trims Simple chips", () => {
    expect(dateRangeChipsForHud("week", false).map((chip) => chip.id)).toEqual([
      "this-week",
      "last-week",
      "last-5",
      "tonight",
      "last-night",
    ]);
    expect(dateRangeChipsForHud("week", true).map((chip) => chip.id)).toEqual([
      "this-week",
      "last-week",
    ]);
    expect(dateRangeChipsForHud("night", true).map((chip) => chip.id)).toEqual([
      "tonight",
      "last-night",
    ]);
    expect(dateRangeChipsForHud("night", false)[0]?.id).toBe("tonight");
  });

  it("falls back to this week when storage is empty", () => {
    const now = new Date("2026-10-17T18:00:00-04:00");
    expect(parseComposerDateRange(null, now)).toEqual(thisWeekRange(now));
    expect(parseComposerDateRange(null, now, tonightRange(now))).toEqual(
      tonightRange(now),
    );
    expect(
      parseComposerDateRange({ from: "2026-10-10", to: "2026-10-12" }, now),
    ).toEqual({ from: "2026-10-10", to: "2026-10-12" });
  });
});
