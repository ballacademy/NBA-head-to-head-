import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import {
  buildEventId,
  evaluateEventBadges,
  filterPlayersForEventRestriction,
  getCurrentWeeklyEvent,
  getEventRestrictionForWeek,
  getIsoWeekId,
  getTopEventBadgeTier,
  isValidEventId,
} from "./weeklyEvents";

describe("weeklyEvents", () => {
  it("builds ISO week and event ids", () => {
    const weekId = getIsoWeekId(new Date("2026-07-27T12:00:00.000Z"));
    expect(weekId).toMatch(/^\d{4}-W\d{2}$/);
    const restriction = getEventRestrictionForWeek(weekId);
    const eventId = buildEventId(weekId, restriction);
    expect(isValidEventId(eventId)).toBe(true);
  });

  it("filters under-25 and international pools", () => {
    const u25 = filterPlayersForEventRestriction(players, "u25");
    const intl = filterPlayersForEventRestriction(players, "intl");

    expect(u25.length).toBeGreaterThan(40);
    expect(u25.every((player) => (player.age ?? 99) <= 25)).toBe(true);
    expect(intl.length).toBeGreaterThan(20);
  });

  it("builds a playable current weekly event with shared slots", () => {
    const event = getCurrentWeeklyEvent(players);
    expect(event).not.toBeNull();
    expect(event!.sharedSlots).toHaveLength(5);
    expect(event!.salaryCapLimit).toBe(100_000_000);
    expect(event!.maxMatches).toBe(30);
  });

  it("awards event badges from wins and matches played", () => {
    expect(evaluateEventBadges({ matchesPlayed: 9, wins: 9 })).toEqual([]);
    expect(evaluateEventBadges({ matchesPlayed: 10, wins: 10 })).toEqual([
      "participation",
    ]);
    expect(evaluateEventBadges({ matchesPlayed: 20, wins: 15 })).toEqual([
      "participation",
      "bronze",
    ]);
    expect(evaluateEventBadges({ matchesPlayed: 25, wins: 20 })).toEqual([
      "participation",
      "bronze",
      "silver",
    ]);
    expect(evaluateEventBadges({ matchesPlayed: 30, wins: 25 })).toEqual([
      "participation",
      "bronze",
      "silver",
      "gold",
    ]);
  });

  it("picks the highest earned event badge tier", () => {
    expect(getTopEventBadgeTier([])).toBeNull();
    expect(getTopEventBadgeTier(["participation"])).toBe("participation");
    expect(
      getTopEventBadgeTier(["participation", "bronze", "silver"]),
    ).toBe("silver");
    expect(
      getTopEventBadgeTier(["gold", "participation", "bronze"]),
    ).toBe("gold");
  });
});
