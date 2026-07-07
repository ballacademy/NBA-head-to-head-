import { getStarTierLineupBonus } from "./lineupMatchupBonus";
import { players } from "./playerPool";
import { calculateLineupStatRawTotal, normalizeLineupTotal } from "./scoring";
import type { Player } from "./types";

export const SCRUB_POOL_AUTO_SIZE = 30;
export const SCRUB_POOL_FORCED_BBR_IDS = [
  "thierad01",
  "william01",
  "mogbojo01",
  "connapa01",
  "battlja01",
  "holmeda01",
  "harriga01",
  "hukpoar01",
  "knechda01",
  "isaacjo01",
  "maluakh01",
  "richaja02",
  "harpero02",
  "berinjo01",
  "finnedo01",
  "greenjo02",
  "jackstr02",
  "nnajize01",
  "mcneeli01",
  "terryda01",
] as const;
export const SCRUB_POOL_SIZE =
  SCRUB_POOL_AUTO_SIZE + SCRUB_POOL_FORCED_BBR_IDS.length;
export const SUPER_SCRUB_POOL_SIZE = 6;
export const SCRUB_POOL_EXCLUDED_BBR_IDS = [
  "looneke01",
  "adamsst01",
  "martica02",
  "russeda01",
] as const;

const scrubPoolExcludedBbrIds = new Set<string>(SCRUB_POOL_EXCLUDED_BBR_IDS);
const scrubPoolForcedBbrIds = new Set<string>(SCRUB_POOL_FORCED_BBR_IDS);

let scrubIds: Set<string> | undefined;
let superScrubIds: Set<string> | undefined;

const isScrubPoolExcluded = (player: { bbrPlayerId?: string }) =>
  Boolean(
    player.bbrPlayerId && scrubPoolExcludedBbrIds.has(player.bbrPlayerId),
  );

const getForcedScrubIds = () =>
  players
    .filter(
      (player) =>
        player.bbrPlayerId && scrubPoolForcedBbrIds.has(player.bbrPlayerId),
    )
    .map((player) => player.id);

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

  const forcedScrubIds = getForcedScrubIds();
  const autoScrubIds = rankedByOvr
    .slice(0, SCRUB_POOL_AUTO_SIZE)
    .map((entry) => entry.player.id);

  scrubIds = new Set([...forcedScrubIds, ...autoScrubIds]);
  superScrubIds = new Set(
    [...rankedByOvr]
      .filter((entry) => scrubIds!.has(entry.player.id))
      .slice(0, SUPER_SCRUB_POOL_SIZE)
      .map((entry) => entry.player.id),
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
