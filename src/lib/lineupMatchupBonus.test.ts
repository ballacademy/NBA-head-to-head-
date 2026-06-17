import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import {
  ALL_STAR_LINEUP_BONUS,
  getStarTierLineupBonus,
  RECENT_ALL_STAR_LINEUP_BONUS,
  SUPERSTAR_LINEUP_BONUS,
} from "./lineupMatchupBonus";

describe("getStarTierLineupBonus", () => {
  it("applies the highest tier bonus once per player", () => {
    const byId = new Map(players.map((player) => [player.id, player]));
    const lineup = [
      byId.get("jokicni01-den"),
      byId.get("bookede01-pho"),
      byId.get("garlada01-cle"),
    ].filter((player): player is NonNullable<typeof player> => Boolean(player));

    expect(lineup).toHaveLength(3);
    expect(getStarTierLineupBonus(lineup)).toBe(
      SUPERSTAR_LINEUP_BONUS +
        ALL_STAR_LINEUP_BONUS +
        RECENT_ALL_STAR_LINEUP_BONUS,
    );
  });
});
