import { readJson, writeJson } from "./browserStorage";

const MUTE_KEY = "nba-head-to-head-community-muted-players";
const MAX_MUTED = 100;

export const loadMutedPlayerIds = (): string[] => {
  const saved = readJson<unknown>(MUTE_KEY);
  if (!Array.isArray(saved)) {
    return [];
  }
  return saved
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim())
    .slice(0, MAX_MUTED);
};

const saveMutedPlayerIds = (ids: string[]) => {
  writeJson(MUTE_KEY, ids.slice(0, MAX_MUTED));
};

export const isPlayerMuted = (playerId: string) =>
  loadMutedPlayerIds().includes(playerId);

export const mutePlayerId = (playerId: string) => {
  const id = playerId.trim();
  if (!id) {
    return loadMutedPlayerIds();
  }
  const next = [id, ...loadMutedPlayerIds().filter((entry) => entry !== id)];
  saveMutedPlayerIds(next);
  return next;
};

export const unmutePlayerId = (playerId: string) => {
  const next = loadMutedPlayerIds().filter((entry) => entry !== playerId);
  saveMutedPlayerIds(next);
  return next;
};
