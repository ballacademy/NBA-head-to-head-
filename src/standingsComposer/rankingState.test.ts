import { describe, expect, it } from "vitest";
import { isStandingsComposerRoute } from "./isStandingsComposerRoute";
import {
  assignTeam,
  clearSlot,
  createEmptySlots,
  exportFilename,
  EXPORT_HEIGHT,
  EXPORT_WIDTH,
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  SLOT_COUNT,
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
});

describe("composer route", () => {
  it("defaults `/` to the composer and keeps rankings aliases", () => {
    expect(isStandingsComposerRoute("", "/")).toBe(true);
    expect(isStandingsComposerRoute("?hub=rankings", "/")).toBe(true);
    expect(isStandingsComposerRoute("?hub=ig-rankings", "/")).toBe(true);
    expect(isStandingsComposerRoute("", "/rankings")).toBe(true);
    expect(isStandingsComposerRoute("", "/tier-list")).toBe(true);
    expect(isStandingsComposerRoute("?utm=try-live", "/")).toBe(true);
  });

  it("only opens Draft Day GM for an explicit play hub", () => {
    expect(isStandingsComposerRoute("?hub=play", "/tier-list")).toBe(false);
    expect(isStandingsComposerRoute("?hub=play", "/")).toBe(false);
    expect(isStandingsComposerRoute("?hub=ddgm", "/")).toBe(false);
    expect(isStandingsComposerRoute("?hub=ranks", "/")).toBe(true);
  });
});
