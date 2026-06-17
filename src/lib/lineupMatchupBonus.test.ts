import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import {
  ALL_STAR_MATCHUP_BONUS,
  getStarTierMatchupBonus,
  RECENT_ALL_STAR_MATCHUP_BONUS,
  SUPERSTAR_MATCHUP_BONUS,
} from "./lineupMatchupBonus";

describe("getStarTierMatchupBonus", () => {
  it("applies the highest tier bonus once per player", () => {
    const byId = new Map(players.map((player) => [player.id, player]));
    const lineup = [
      byId.get("jokicni01-den"),
      byId.get("bookede01-pho"),
      byId.get("garlada01-cle"),
    ].filter((player): player is NonNullable<typeof player> => Boolean(player));

    expect(lineup).toHaveLength(3);
    expect(getStarTierMatchupBonus(lineup)).toBe(
      SUPERSTAR_MATCHUP_BONUS +
        ALL_STAR_MATCHUP_BONUS +
        RECENT_ALL_STAR_MATCHUP_BONUS,
    );
  });
});
