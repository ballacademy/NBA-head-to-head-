import { readJson, writeJson } from "../lib/browserStorage";
import { getPlayer, type TierPlayer } from "../tierListComposer/nbaActivePlayers";

export const COMPOSER_RECENT_PLAYERS_KEY = "ddgm:composer-recent-players";
export const COMPOSER_RECENT_PLAYERS_MAX = 8;

export const parseRecentPlayerIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter(Boolean)
    .slice(0, COMPOSER_RECENT_PLAYERS_MAX);
};

export const readRecentPlayerIds = () =>
  parseRecentPlayerIds(readJson(COMPOSER_RECENT_PLAYERS_KEY));

export const rememberRecentPlayer = (playerId: string) => {
  const id = playerId.trim();
  if (!id) {
    return readRecentPlayerIds();
  }
  const next = [id, ...readRecentPlayerIds().filter((row) => row !== id)].slice(
    0,
    COMPOSER_RECENT_PLAYERS_MAX,
  );
  writeJson(COMPOSER_RECENT_PLAYERS_KEY, next);
  return next;
};

export const recentPickerPlayers = (pool: TierPlayer[]) => {
  const allowed = new Map(pool.map((player) => [player.id, player]));
  return readRecentPlayerIds()
    .map((id) => allowed.get(id) ?? getPlayer(id) ?? null)
    .filter((player): player is TierPlayer => Boolean(player));
};
