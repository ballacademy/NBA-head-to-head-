import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import { isAllStarPlayer, isSuperstarPlayer } from "./allStars";
import {
  findBlindDraftMatch,
  formatSlotConstraint,
  generateFeasibleAgeBandSlotsUnderSalaryCap,
  slotUsesAgeBand,
} from "./draft";
import {
  buildEventId,
  EVENT_BARGAIN_SALARY_CAP,
  EVENT_RESTRICTION_ROTATION,
  EVENT_SALARY_CAP,
  evaluateEventBadges,
  filterPlayersForEventRestriction,
  formatWeeklyEventChooserMeta,
  getCurrentWeeklyEvent,
  getEventRestrictionForWeek,
  getScheduledWeeklyEventMeta,
  getEventSalaryCap,
  getEventTitle,
  getIsoWeekId,
  getLegacyUtcEventId,
  getTopEventBadgeTier,
  getUtcIsoWeekId,
  getWeeklyEventForEventId,
  isCurrentEventId,
  isValidEventId,
} from "./weeklyEvents";

describe("weeklyEvents", () => {
  it("uses Eastern civil dates for ISO weeks, matching Daily", () => {
    // Monday 03:00 UTC is still Sunday evening Eastern (2026-08-02 → W31).
    expect(getIsoWeekId(new Date("2026-08-03T03:00:00.000Z"))).toBe("2026-W31");
    // Later that UTC Monday is Monday morning Eastern (2026-08-03 → W32).
    expect(getIsoWeekId(new Date("2026-08-03T12:00:00.000Z"))).toBe("2026-W32");
  });

  it("aliases the UTC week id during the Sunday-evening Eastern window", () => {
    const sundayEvening = new Date("2026-08-03T03:00:00.000Z");
    expect(getUtcIsoWeekId(sundayEvening)).toBe("2026-W32");
    expect(getLegacyUtcEventId(sundayEvening)).toBe("2026-W32-nostars");
    expect(isCurrentEventId("2026-W31-intl", sundayEvening)).toBe(true);
    expect(isCurrentEventId("2026-W32-nostars", sundayEvening)).toBe(true);
    expect(isCurrentEventId("2026-W30-u25", sundayEvening)).toBe(false);
    expect(getWeeklyEventForEventId("2026-W32-nostars", players)?.id).toBe(
      "2026-W32-nostars",
    );

    const mondayMorning = new Date("2026-08-03T12:00:00.000Z");
    expect(getUtcIsoWeekId(mondayMorning)).toBe("2026-W32");
    expect(getLegacyUtcEventId(mondayMorning)).toBeNull();
    expect(isCurrentEventId("2026-W32-nostars", mondayMorning)).toBe(true);
    expect(isCurrentEventId("2026-W31-intl", mondayMorning)).toBe(false);
  });

  it("builds ISO week and event ids for the full restriction set", () => {
    const weekId = getIsoWeekId(new Date("2026-07-27T12:00:00.000Z"));
    expect(weekId).toMatch(/^\d{4}-W\d{2}$/);
    const restriction = getEventRestrictionForWeek(weekId);
    expect(EVENT_RESTRICTION_ROTATION).toContain(restriction);
    const eventId = buildEventId(weekId, restriction);
    expect(isValidEventId(eventId)).toBe(true);
    expect(isValidEventId(`${weekId}-blind`)).toBe(true);
    expect(isValidEventId(`${weekId}-agepos`)).toBe(true);
  });

  it("rotates through all six event modes by week number", () => {
    expect(getEventRestrictionForWeek("2026-W30")).toBe("u25");
    expect(getEventRestrictionForWeek("2026-W31")).toBe("intl");
    expect(getEventRestrictionForWeek("2026-W32")).toBe("nostars");
    expect(getEventRestrictionForWeek("2026-W33")).toBe("bargain");
    expect(getEventRestrictionForWeek("2026-W34")).toBe("blind");
    expect(getEventRestrictionForWeek("2026-W35")).toBe("agepos");
    expect(getEventTitle("blind")).toBe("Blind Draft");
    expect(getEventTitle("agepos")).toBe("Age Bracket Draft");
  });

  it("filters under-25, international, and no-stars pools", () => {
    const u25 = filterPlayersForEventRestriction(players, "u25");
    const intl = filterPlayersForEventRestriction(players, "intl");
    const nostars = filterPlayersForEventRestriction(players, "nostars");
    const bargain = filterPlayersForEventRestriction(players, "bargain");
    const blind = filterPlayersForEventRestriction(players, "blind");
    const agepos = filterPlayersForEventRestriction(players, "agepos");

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
    expect(blind.length).toBe(players.length);
    expect(agepos.length).toBe(players.length);
  });

  it("uses a tighter salary cap for Bargain Bin", () => {
    expect(getEventSalaryCap("bargain")).toBe(EVENT_BARGAIN_SALARY_CAP);
    expect(getEventSalaryCap("bargain")).toBe(50_000_000);
    expect(getEventSalaryCap("u25")).toBe(EVENT_SALARY_CAP);
    expect(getEventSalaryCap("blind")).toBe(EVENT_SALARY_CAP);
  });

  it("names this week's event on the Play chooser even if unplayable", () => {
    const scheduled = getScheduledWeeklyEventMeta(
      new Date("2026-08-17T12:00:00.000Z"),
    );
    expect(scheduled.title).toBe(getEventTitle(scheduled.restriction));
    expect(formatWeeklyEventChooserMeta(null, scheduled)).toBe(
      `${scheduled.title} · check back`,
    );

    const playable = getCurrentWeeklyEvent(players);
    expect(playable).not.toBeNull();
    expect(formatWeeklyEventChooserMeta(playable, scheduled)).toBe(
      `${playable!.title} · this week`,
    );
  });

  it("builds a playable current weekly event with shared slots", () => {
    const event = getCurrentWeeklyEvent(players);
    expect(event).not.toBeNull();
    expect(event!.sharedSlots).toHaveLength(5);
    expect(event!.salaryCapLimit).toBe(getEventSalaryCap(event!.restriction));
    expect(event!.maxMatches).toBe(30);
  });

  it("builds age-band slots for Age Bracket Draft", () => {
    const slots = generateFeasibleAgeBandSlotsUnderSalaryCap(
      players,
      EVENT_SALARY_CAP,
      5,
    );
    expect(slots).toHaveLength(5);
    expect(slots.every((slot) => slotUsesAgeBand(slot))).toBe(true);
    expect(formatSlotConstraint(slots[0]!)).toMatch(/age/i);
  });

  it("matches blind draft picks by exact full name", () => {
    const sample = players.slice(0, 20);
    const target = sample[0]!;
    expect(findBlindDraftMatch(sample, target.name)).toEqual({
      player: target,
    });
    expect(findBlindDraftMatch(sample, "not a real player")).toEqual({
      error: "not-found",
    });
    expect(findBlindDraftMatch(sample, "  ")).toEqual({ error: "empty" });
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
