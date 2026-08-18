import { describe, expect, it } from "vitest";
import {
  buildEventHistoryRows,
  formatEventPresenceLabel,
} from "./eventHistory";
import type { EventProfile } from "./eventProfile";

const profile = (
  eventId: string,
  overrides: Partial<EventProfile> = {},
): EventProfile => ({
  eventId,
  wins: 2,
  losses: 1,
  ties: 0,
  matchesPlayed: 3,
  winStreak: 1,
  lossStreak: 0,
  elo: 1000,
  badges: ["participation"],
  ...overrides,
});

describe("eventHistory", () => {
  it("builds history rows for played events only", () => {
    const rows = buildEventHistoryRows(
      [
        profile("2026-W30-u25"),
        profile("2026-W29-intl", { matchesPlayed: 0, wins: 0, losses: 0 }),
      ],
      "2026-W30-u25",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.isCurrent).toBe(true);
    expect(rows[0]?.topBadgeLabel).toBe("Competitor");
  });

  it("marks only the live week as current so history can drop it", () => {
    const rows = buildEventHistoryRows(
      [profile("2026-W30-u25"), profile("2026-W29-intl")],
      "2026-W30-u25",
    );

    expect(rows.filter((row) => row.isCurrent)).toHaveLength(1);
    expect(rows.filter((row) => !row.isCurrent).map((row) => row.eventId)).toEqual(
      ["2026-W29-intl"],
    );
  });

  it("formats presence status", () => {
    expect(
      formatEventPresenceLabel({
        matchesPlayed: 0,
        matchesLeft: 30,
        maxMatches: 30,
      }),
    ).toMatch(/Not started/i);
    expect(
      formatEventPresenceLabel({
        matchesPlayed: 5,
        matchesLeft: 25,
        maxMatches: 30,
      }),
    ).toMatch(/Active/);
    expect(
      formatEventPresenceLabel({
        matchesPlayed: 30,
        matchesLeft: 0,
        maxMatches: 30,
      }),
    ).toMatch(/complete/i);
  });
});
