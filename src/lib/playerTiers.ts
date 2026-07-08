import { getStarTierLineupBonus } from "./lineupMatchupBonus";
import { players } from "./playerPool";
import { calculateLineupStatRawTotal, normalizeLineupTotal } from "./scoring";
import type { Player } from "./types";

export const SCRUB_POOL_BBR_IDS = [
  "thierad01",
  "johnsaj01",
  "martial01",
  "william01",
  "jacksan01",
  "hukpoar01",
  "chrisca02",
  "laniech01",
  "holmeda01",
  "terryda01",
  "battlja01",
  "richaja02",
  "davisjd01",
  "youngja05",
  "berinjo01",
  "broomjo01",
  "phillju01",
  "joneska03",
  "maluakh01",
  "mcneeli01",
  "shulgma01",
  "peavymi01",
  "gueyemo02",
  "tomlina01",
  "essenno01",
  "pendano01",
  "dadiepa01",
  "flemira01",
  "cissosi01",
  "yangha01",
] as const;
export const SCRUB_POOL_SIZE = SCRUB_POOL_BBR_IDS.length;
export const SUPER_SCRUB_POOL_SIZE = 6;
export const SCRUB_POOL_EXCLUDED_BBR_IDS = [
  "looneke01",
  "adamsst01",
  "martica02",
  "russeda01",
  // Removed from the scrub pool after community feedback on vets/rotation players.
  "conlemi01",
  "jonesty01",
  "harriga01",
  "connapa01",
  "finnedo01",
  "isaacjo01",
  "jackstr02",
  "greenjo02",
  "knechda01",
  "nnajize01",
  "bantoda01",
  "manntr01",
  "hawkijo01",
  "jamesbr02",
  "mogbojo01",
  "harpero02",
  "furphjo01",
  "bouyeja01",
  "ruperra01",
  "jamessi01",
] as const;

const scrubPoolBbrIds = new Set<string>(SCRUB_POOL_BBR_IDS);
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

  scrubIds = new Set(
    players
      .filter(
        (player) =>
          player.bbrPlayerId && scrubPoolBbrIds.has(player.bbrPlayerId),
      )
      .map((player) => player.id),
  );

  const rankedScrubs = players
    .filter((player) => scrubIds!.has(player.id))
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

  superScrubIds = new Set(
    rankedScrubs.slice(0, SUPER_SCRUB_POOL_SIZE).map((entry) => entry.player.id),
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

export const isScrubPoolExcludedPlayer = (player: Pick<Player, "bbrPlayerId">) =>
  isScrubPoolExcluded(player);
