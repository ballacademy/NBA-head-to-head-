import { calculateLineupScore } from "../../src/lib/scoring";
import { playersById } from "../../src/lib/playerPool";
import type { Player } from "../../src/lib/types";

/** Resolve lineup ids to players; null if any id is missing from the pool. */
export const resolveLineupPlayers = (lineup: string[]): Player[] | null => {
  const resolved: Player[] = [];

  for (const id of lineup) {
    const player = playersById.get(id);
    if (!player) {
      return null;
    }
    resolved.push(player);
  }

  return resolved;
};

/** Server-side uncapped OVR for stored lineup ids; null if any id is missing. */
export const scoreLineupIds = (lineup: string[]): number | null => {
  const players = resolveLineupPlayers(lineup);
  if (!players) {
    return null;
  }

  return calculateLineupScore(players).uncappedTotal;
};
