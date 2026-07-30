import { describe, expect, it } from "vitest";
import { findPlayerId, players } from "./playerPool";
import {
  createDefaultTierListState,
  filterTierListPool,
  movePlayerToTier,
  playerMatchesTierListFilters,
  DEFAULT_TIER_LIST_FILTERS,
} from "./tierList";

const byName = (name: string) => {
  const id = findPlayerId(name);
  const player = players.find((entry) => entry.id === id);
  if (!player) {
    throw new Error(`missing ${name}`);
  }
  return player;
};

describe("tierList", () => {
  it("filters by position and age band", () => {
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
});
