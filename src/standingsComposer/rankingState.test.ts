import { describe, expect, it } from "vitest";
import { isStandingsComposerRoute } from "./isStandingsComposerRoute";
import {
  assignTeam,
  clearSlot,
  createEmptySlots,
  insertRankingSlots,
  DEFAULT_TITLE,
  exportFilename,
  EXPORT_HEIGHT,
  EXPORT_WIDTH,
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  SLOT_COUNT,
  STANDINGS_BOARD_BG,
  STANDINGS_TITLE_SIZE,
  formatStandingRecord,
  splitStandingsTitle,
  standingsSubtitleLabel,
  lastWeekDelta,
  lastWeekMark,
  LAST_WEEK_STORAGE_KEYS,
  conferenceFromSubtitle,
  standingRecordForTeam,
  formatStandingLast10,
  usedTeamIds,
} from "./rankingState";

describe("ranking slots", () => {
  it("starts with 15 empty slots", () => {
    const slots = createEmptySlots();
    expect(slots).toHaveLength(SLOT_COUNT);
    expect(slots.every((slot) => slot === null)).toBe(true);
  });

  it("fills, replaces, moves, and clears teams", () => {
    let slots = assignTeam(createEmptySlots(), 0, "BOS");
    expect(slots[0]).toBe("BOS");
    slots = assignTeam(slots, 0, "NYK");
    expect(slots[0]).toBe("NYK");
    slots = assignTeam(slots, 4, "BOS");
    expect(slots[4]).toBe("BOS");
    slots = assignTeam(slots, 1, "BOS");
    expect(slots[4]).toBeNull();
    expect(slots[1]).toBe("BOS");
    expect([...usedTeamIds(slots)].sort()).toEqual(["BOS", "NYK"]);
    slots = clearSlot(slots, 0);
    expect(slots[0]).toBeNull();
    expect(slots[1]).toBe("BOS");
  });

  it("inserts a dragged team and shifts the ranks between", () => {
    let slots = assignTeam(createEmptySlots(), 0, "BOS");
    slots = assignTeam(slots, 1, "NYK");
    slots = assignTeam(slots, 2, "MIA");
    const down = insertRankingSlots(slots, 0, 2);
    expect(down.slice(0, 3)).toEqual(["NYK", "MIA", "BOS"]);
    expect(lastWeekDelta(down, slots, 2)).toBe(-2);
    expect(lastWeekMark(lastWeekDelta(down, slots, 2))?.text).toBe("▼2");
    expect(lastWeekDelta(down, slots, 0)).toBe(1);
    const up = insertRankingSlots(slots, 2, 0);
    expect(up.slice(0, 3)).toEqual(["MIA", "BOS", "NYK"]);
    expect(insertRankingSlots(slots, 1, 1)).toEqual(slots);
  });

  it("hides last-week arrows when missing, unchanged, or new", () => {
    const now = assignTeam(assignTeam(createEmptySlots(), 0, "BOS"), 1, "NYK");
    const last = assignTeam(assignTeam(createEmptySlots(), 0, "NYK"), 2, "BOS");
    expect(lastWeekDelta(now, last, 0)).toBe(2);
    expect(lastWeekDelta(now, last, 1)).toBe(-1);
    expect(lastWeekDelta(now, now, 0)).toBe(0);
    expect(lastWeekDelta(now, null, 0)).toBeNull();
    expect(lastWeekMark(2)?.text).toBe("▲2");
    expect(lastWeekMark(-1)?.text).toBe("▼1");
    expect(lastWeekMark(0)?.text).toBe("=");
    expect(lastWeekMark(null)).toBeNull();
    const missingLast = assignTeam(createEmptySlots(), 0, "BOS");
    expect(lastWeekDelta(now, missingLast, 1)).toBeNull();
  });

  it("compares East to last-week East and West to last-week West", () => {
    expect(conferenceFromSubtitle("EASTERN CONFERENCE")).toBe("East");
    expect(conferenceFromSubtitle("Western Conference")).toBe("West");
    expect(LAST_WEEK_STORAGE_KEYS.East).toContain("last-week:east");
    expect(LAST_WEEK_STORAGE_KEYS.West).toContain("last-week:west");
    expect(LAST_WEEK_STORAGE_KEYS.East).not.toBe(LAST_WEEK_STORAGE_KEYS.West);
    const eastNow = assignTeam(assignTeam(createEmptySlots(), 0, "BOS"), 1, "NYK");
    const lastEast = assignTeam(assignTeam(createEmptySlots(), 0, "NYK"), 1, "BOS");
    const lastWest = assignTeam(assignTeam(createEmptySlots(), 0, "OKC"), 1, "DEN");
    expect(lastWeekDelta(eastNow, lastEast, 0)).toBe(1);
    expect(lastWeekDelta(eastNow, lastWest, 0)).toBeNull();
  });

  it("keeps W–L and last-10 on the team after a drag, not the rank", () => {
    const records = {
      ATL: { wins: 2, losses: 0, last10: "2-0" },
      NYK: { wins: 0, losses: 2, last10: "0-2" },
    };
    let slots = assignTeam(createEmptySlots(), 0, "ATL");
    slots = assignTeam(slots, 1, "NYK");
    const moved = insertRankingSlots(slots, 0, 1);
    expect(moved.slice(0, 2)).toEqual(["NYK", "ATL"]);
    expect(formatStandingRecord(standingRecordForTeam(records, moved[0]))).toBe(
      "0–2",
    );
    expect(formatStandingRecord(standingRecordForTeam(records, moved[1]))).toBe(
      "2–0",
    );
    expect(formatStandingLast10(standingRecordForTeam(records, moved[1]))).toBe(
      "2–0",
    );
    expect(lastWeekDelta(moved, slots, 1)).toBe(-1);
    expect(lastWeekDelta(moved, slots, 0)).toBe(1);
  });
});

describe("graphic export constants", () => {
  it("matches the 1200x1500 Instagram 4:5 example", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
  });

  it("builds a slug filename from subtitle", () => {
    expect(exportFilename("EASTERN CONFERENCE", "PROJECTED NBA STANDINGS")).toBe(
      "eastern-conference.png",
    );
    expect(exportFilename("   ", "Projected NBA")).toBe("projected-nba.png");
  });

  it("keeps the banner title on one line", () => {
    expect(splitStandingsTitle(DEFAULT_TITLE)).toEqual([DEFAULT_TITLE]);
    expect(splitStandingsTitle("projected\nnba standings")).toEqual([
      DEFAULT_TITLE,
    ]);
  });

  it("uses the original single-line banner title size", () => {
    expect(STANDINGS_TITLE_SIZE).toBe(50);
  });

  it("formats W–L as a rank caption, not a logo caption", () => {
    expect(formatStandingRecord({ wins: 64, losses: 18 })).toBe("64–18");
    expect(formatStandingRecord(null)).toBeNull();
  });

  it("uppercases the conference subtitle for PNG export", () => {
    expect(standingsSubtitleLabel("eastern conference")).toBe(
      "EASTERN CONFERENCE",
    );
    expect(standingsSubtitleLabel("Western Conference")).toBe(
      "WESTERN CONFERENCE",
    );
    expect(STANDINGS_BOARD_BG.toLowerCase()).toBe("#161616");
  });
});

describe("composer route", () => {
  it("defaults `/` to the composer and keeps rankings aliases", () => {
    expect(isStandingsComposerRoute("", "/")).toBe(true);
    expect(isStandingsComposerRoute("?hub=rankings", "/")).toBe(true);
    expect(isStandingsComposerRoute("?hub=ig-rankings", "/")).toBe(true);
    expect(isStandingsComposerRoute("", "/rankings")).toBe(true);
    expect(isStandingsComposerRoute("", "/tier-list")).toBe(true);
    expect(isStandingsComposerRoute("", "/every-team")).toBe(true);
    expect(isStandingsComposerRoute("", "/by-team")).toBe(true);
    expect(isStandingsComposerRoute("", "/player-of-the-day")).toBe(true);
    expect(isStandingsComposerRoute("", "/team-of-the-week")).toBe(true);
    expect(isStandingsComposerRoute("", "/team-of-the-week-plus")).toBe(true);
    expect(isStandingsComposerRoute("", "/ranked-lineups")).toBe(true);
    expect(isStandingsComposerRoute("", "/pyramid")).toBe(true);
    expect(isStandingsComposerRoute("", "/headline")).toBe(true);
    expect(isStandingsComposerRoute("", "/stat-card")).toBe(true);
    expect(isStandingsComposerRoute("", "/stat-card-cover")).toBe(true);
    expect(isStandingsComposerRoute("", "/mock-trade")).toBe(true);
    expect(isStandingsComposerRoute("", "/plot")).toBe(true);
    expect(isStandingsComposerRoute("", "/scatter")).toBe(true);
    expect(isStandingsComposerRoute("?utm=try-live", "/")).toBe(true);
  });

  it("only opens Draft Day GM for an explicit play hub", () => {
    expect(isStandingsComposerRoute("?hub=play", "/tier-list")).toBe(false);
    expect(isStandingsComposerRoute("?hub=play", "/")).toBe(false);
    expect(isStandingsComposerRoute("?hub=ddgm", "/")).toBe(false);
    expect(isStandingsComposerRoute("?hub=ranks", "/")).toBe(true);
  });
});
