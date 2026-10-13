import { describe, expect, it } from "vitest";
import { isStandingsComposerRoute } from "./isStandingsComposerRoute";
import {
  assignTeam,
  clearSlot,
  createEmptySlots,
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
  splitStandingsTitle,
  standingsSubtitleLabel,
  lastWeekDelta,
  lastWeekMark,
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
    expect(isStandingsComposerRoute("?utm=try-live", "/")).toBe(true);
  });

  it("only opens Draft Day GM for an explicit play hub", () => {
    expect(isStandingsComposerRoute("?hub=play", "/tier-list")).toBe(false);
    expect(isStandingsComposerRoute("?hub=play", "/")).toBe(false);
    expect(isStandingsComposerRoute("?hub=ddgm", "/")).toBe(false);
    expect(isStandingsComposerRoute("?hub=ranks", "/")).toBe(true);
  });
});
