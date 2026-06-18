import { getStarTierLineupBonus } from "./lineupMatchupBonus";
import { players } from "./playerPool";
import { calculateLineupStatRawTotal, normalizeLineupTotal } from "./scoring";
import type { Player } from "./types";

export const SCRUB_POOL_SIZE = 50;
export const SUPER_SCRUB_POOL_SIZE = 10;
export const SCRUB_POOL_EXCLUDED_BBR_IDS = ["bealbr01"] as const;

const scrubPoolExcludedBbrIds = new Set<string>(SCRUB_POOL_EXCLUDED_BBR_IDS);

let scrubIds: Set<string> | undefined;
let superScrubIds: Set<string> | undefined;

const isScrubPoolExcluded = (player: { bbrPlayerId?: string }) =>
  Boolean(
    player.bbrPlayerId && scrubPoolExcludedBbrIds.has(player.bbrPlayerId),
  );

const ensureScrubPools = () => {
  if (scrubIds && superScrubIds) {
    return;
  }

  const rankedByOvr = [...players]
    .filter((player) => !isScrubPoolExcluded(player))
    .map((player) => ({
      player,
      ovr: normalizeLineupTotal(
        calculateLineupStatRawTotal([player]) +
          getStarTierLineupBonus([player]),
      ),
    }))
    .sort(
      (left, right) =>
        left.ovr - right.ovr ||
        left.player.name.localeCompare(right.player.name),
    );

  scrubIds = new Set(
    rankedByOvr.slice(0, SCRUB_POOL_SIZE).map((entry) => entry.player.id),
  );
  superScrubIds = new Set(
    rankedByOvr.slice(0, SUPER_SCRUB_POOL_SIZE).map((entry) => entry.player.id),
  );
};

export const isScrubPlayer = (player: Pick<Player, "id">) => {
  ensureScrubPools();
  return scrubIds!.has(player.id);
};

export const isSuperScrubPlayer = (player: Pick<Player, "id">) => {
  ensureScrubPools();
  return superScrubIds!.has(player.id);
};

export const getScrubPlayers = () => {
  ensureScrubPools();
  return players.filter((player) => scrubIds!.has(player.id));
};

export const getScrubPlayerIds = () => {
  ensureScrubPools();
  return [...scrubIds!];
};

export const getSuperScrubPlayerIds = () => {
  ensureScrubPools();
  return [...superScrubIds!];
};
