import { describe, expect, it } from "vitest";
import {
  isCurrentRookiePlayer,
  isUpcomingRookiePlayer,
  upcomingRookiePlayers,
} from "./draftClasses";
import { isStatsFreeAgent } from "./freeAgents";
import { databasePlayers, findPlayerId, freeAgentPlayers, players } from "./playerPool";
import {
  createDefaultTierListState,
  filterTierListPool,
  getTierListPlayers,
  movePlayerToTier,
  playerMatchesTierListFilters,
  DEFAULT_TIER_LIST_FILTERS,
} from "./tierList";
import { isInternationalEventPlayer } from "./weeklyEvents";

const byName = (name: string) => {
  const id = findPlayerId(name);
  const player = players.find((entry) => entry.id === id);
  if (!player) {
    throw new Error(`missing ${name}`);
  }
  return player;
};

describe("tierList", () => {
  it("filters by position, age range, team, and agency", () => {
    const guard = byName("Shai Gilgeous-Alexander");
    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        positions: ["PG", "SG"],
      }),
    ).toBe(true);

    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        positions: ["C"],
      }),
    ).toBe(false);

    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        ageMin: 20,
        ageMax: 40,
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        ageMax: 20,
      }),
    ).toBe(false);

    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        teams: [guard.team],
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        teams: ["BOS"],
      }),
    ).toBe(guard.team === "BOS");

    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        agency: "rostered",
      }),
    ).toBe(!isStatsFreeAgent(guard));

    const freeAgent = freeAgentPlayers[0];
    expect(freeAgent).toBeTruthy();
    expect(
      playerMatchesTierListFilters(freeAgent!, {
        ...DEFAULT_TIER_LIST_FILTERS,
        agency: "free-agent",
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(freeAgent!, {
        ...DEFAULT_TIER_LIST_FILTERS,
        agency: "rostered",
      }),
    ).toBe(false);
  });

  it("moves players between tiers and clears them from the pool", () => {
    const player = byName("Jayson Tatum");
    let state = createDefaultTierListState();
    const targetTier = state.tiers[0]!;

    state = movePlayerToTier(state, player.id, targetTier.id);
    expect(state.tiers[0]?.playerIds).toContain(player.id);

    const pool = filterTierListPool(
      players,
      DEFAULT_TIER_LIST_FILTERS,
      new Set(state.tiers.flatMap((tier) => tier.playerIds)),
    );
    expect(pool.some((entry) => entry.id === player.id)).toBe(false);

    state = movePlayerToTier(state, player.id, null);
    expect(state.tiers.every((tier) => !tier.playerIds.includes(player.id))).toBe(
      true,
    );
  });

  it("includes a broad non-US-born international pool from the season database", () => {
    const intl = databasePlayers.filter(isInternationalEventPlayer);
    expect(intl.length).toBeGreaterThanOrEqual(120);
    expect(intl.some((player) => player.name.includes("Gilgeous-Alexander"))).toBe(
      true,
    );
    expect(intl.some((player) => player.name.includes("Jokić") || player.name.includes("Jokic"))).toBe(
      true,
    );
    // US-born with international ties should not count as international-born.
    expect(intl.some((player) => player.name.includes("Towns"))).toBe(false);
  });

  it("adds upcoming rookies only to the tier list pool", () => {
    const tierPool = getTierListPlayers();
    expect(upcomingRookiePlayers.length).toBeGreaterThanOrEqual(20);
    expect(tierPool.length).toBe(
      databasePlayers.length + upcomingRookiePlayers.length,
    );
    expect(
      databasePlayers.some((player) => isUpcomingRookiePlayer(player)),
    ).toBe(false);
    expect(tierPool.some((player) => player.name === "Darryn Peterson")).toBe(
      true,
    );
  });

  it("filters by experience and draft class", () => {
    const rookies = databasePlayers.filter(isCurrentRookiePlayer);
    expect(rookies.length).toBeGreaterThan(10);

    const cooper = rookies.find((player) => player.name.includes("Flagg"));
    expect(cooper).toBeTruthy();
    expect(
      playerMatchesTierListFilters(cooper!, {
        ...DEFAULT_TIER_LIST_FILTERS,
        experience: "rookies",
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(cooper!, {
        ...DEFAULT_TIER_LIST_FILTERS,
        experience: "veterans",
      }),
    ).toBe(false);
    expect(
      playerMatchesTierListFilters(cooper!, {
        ...DEFAULT_TIER_LIST_FILTERS,
        draftClass: 2025,
      }),
    ).toBe(true);

    const prospect = upcomingRookiePlayers[0]!;
    expect(
      playerMatchesTierListFilters(prospect, {
        ...DEFAULT_TIER_LIST_FILTERS,
        experience: "upcoming",
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(prospect, {
        ...DEFAULT_TIER_LIST_FILTERS,
        draftClass: 2026,
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(prospect, {
        ...DEFAULT_TIER_LIST_FILTERS,
        experience: "veterans",
      }),
    ).toBe(false);

    const veteran = byName("Jayson Tatum");
    expect(
      playerMatchesTierListFilters(veteran, {
        ...DEFAULT_TIER_LIST_FILTERS,
        experience: "veterans",
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(veteran, {
        ...DEFAULT_TIER_LIST_FILTERS,
        draftClass: 2022,
      }),
    ).toBe(false);
  });
});
