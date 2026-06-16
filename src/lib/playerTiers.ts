import { players } from "./playerPool";
import { calculateLineupScore } from "./scoring";
import type { Player } from "./types";

export const SCRUB_POOL_SIZE = 50;
export const SUPER_SCRUB_POOL_SIZE = 10;

const rankedByOvr = [...players]
  .map((player) => ({
    player,
    ovr: calculateLineupScore([player]).total,
  }))
  .sort(
    (left, right) =>
      left.ovr - right.ovr || left.player.name.localeCompare(right.player.name),
  );

const scrubPlayers = rankedByOvr
  .slice(0, SCRUB_POOL_SIZE)
  .map((entry) => entry.player);
const superScrubPlayers = rankedByOvr
  .slice(0, SUPER_SCRUB_POOL_SIZE)
  .map((entry) => entry.player);

const scrubIds = new Set(scrubPlayers.map((player) => player.id));
const superScrubIds = new Set(superScrubPlayers.map((player) => player.id));

export const isScrubPlayer = (player: Pick<Player, "id">) =>
  scrubIds.has(player.id);

export const isSuperScrubPlayer = (player: Pick<Player, "id">) =>
  superScrubIds.has(player.id);

export const getScrubPlayers = () => [...scrubPlayers];

export const getScrubPlayerIds = () => [...scrubIds];

export const getSuperScrubPlayerIds = () => [...superScrubIds];
