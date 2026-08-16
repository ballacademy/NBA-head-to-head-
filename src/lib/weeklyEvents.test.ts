import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import { isAllStarPlayer, isSuperstarPlayer } from "./allStars";
import {
  buildEventId,
  EVENT_BARGAIN_SALARY_CAP,
  EVENT_RESTRICTION_ROTATION,
  EVENT_SALARY_CAP,
  evaluateEventBadges,
  filterPlayersForEventRestriction,
  getCurrentWeeklyEvent,
  getEventRestrictionForWeek,
  getEventSalaryCap,
  getEventTitle,
  getIsoWeekId,
  getTopEventBadgeTier,
  isValidEventId,
} from "./weeklyEvents";

describe("weeklyEvents", () => {
  it("builds ISO week and event ids for the full restriction set", () => {
    const weekId = getIsoWeekId(new Date("2026-07-27T12:00:00.000Z"));
    expect(weekId).toMatch(/^\d{4}-W\d{2}$/);
    const restriction = getEventRestrictionForWeek(weekId);
    expect(EVENT_RESTRICTION_ROTATION).toContain(restriction);
    const eventId = buildEventId(weekId, restriction);
    expect(isValidEventId(eventId)).toBe(true);
    expect(isValidEventId(`${weekId}-nostars`)).toBe(true);
    expect(isValidEventId(`${weekId}-bargain`)).toBe(true);
  });

  it("rotates through all four event modes by week number", () => {
    expect(getEventRestrictionForWeek("2026-W28")).toBe("u25");
    expect(getEventRestrictionForWeek("2026-W29")).toBe("intl");
    expect(getEventRestrictionForWeek("2026-W30")).toBe("nostars");
    expect(getEventRestrictionForWeek("2026-W31")).toBe("bargain");
    expect(getEventTitle("u25")).toBe("Young and Coming");
  });

  it("filters under-25, international, and no-stars pools", () => {
    const u25 = filterPlayersForEventRestriction(players, "u25");
    const intl = filterPlayersForEventRestriction(players, "intl");
    const nostars = filterPlayersForEventRestriction(players, "nostars");
    const bargain = filterPlayersForEventRestriction(players, "bargain");

    expect(u25.length).toBeGreaterThan(40);
    expect(u25.every((player) => (player.age ?? 99) <= 25)).toBe(true);
    expect(intl.length).toBeGreaterThan(20);
    expect(nostars.length).toBeGreaterThan(100);
    expect(
      nostars.every(
        (player) => !isAllStarPlayer(player) && !isSuperstarPlayer(player),
      ),
    ).toBe(true);
    expect(bargain.length).toBe(players.length);
  });

  it("uses a tighter salary cap for Bargain Bin", () => {
    expect(getEventSalaryCap("bargain")).toBe(EVENT_BARGAIN_SALARY_CAP);
    expect(getEventSalaryCap("bargain")).toBe(50_000_000);
    expect(getEventSalaryCap("u25")).toBe(EVENT_SALARY_CAP);
    expect(getEventSalaryCap("nostars")).toBe(EVENT_SALARY_CAP);
  });

  it("builds a playable current weekly event with shared slots", () => {
    const event = getCurrentWeeklyEvent(players);
    expect(event).not.toBeNull();
    expect(event!.sharedSlots).toHaveLength(5);
    expect(event!.salaryCapLimit).toBe(getEventSalaryCap(event!.restriction));
    expect(event!.maxMatches).toBe(30);
  });

  it("keeps every rotation mode pool large enough to draft", () => {
    for (const restriction of EVENT_RESTRICTION_ROTATION) {
      const pool = filterPlayersForEventRestriction(players, restriction);
      expect(pool.length).toBeGreaterThanOrEqual(25);
    }
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
