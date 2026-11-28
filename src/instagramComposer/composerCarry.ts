import { readJson, writeJson } from "../lib/browserStorage";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { readComposerDateRange } from "./composerDateRange";

export const COMPOSER_CARRY_KEY = "ddgm:composer-carry";

export interface ComposerCarry {
  playerId: string;
  playerIds?: string[];
  playerName: string;
  from: string;
  to: string;
  at: number;
}

const uniquePlayerIds = (ids: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
};

export const parseComposerCarry = (value: unknown): ComposerCarry | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<ComposerCarry>;
  const playerIds = uniquePlayerIds([
    raw.playerId,
    ...(Array.isArray(raw.playerIds) ? raw.playerIds : []),
  ]);
  if (!playerIds.length) {
    return null;
  }
  return {
    playerId: playerIds[0]!,
    playerIds,
    playerName: typeof raw.playerName === "string" ? raw.playerName : "",
    from: typeof raw.from === "string" ? raw.from : "",
    to: typeof raw.to === "string" ? raw.to : "",
    at: typeof raw.at === "number" ? raw.at : 0,
  };
};

export const readComposerCarry = () =>
  parseComposerCarry(readJson(COMPOSER_CARRY_KEY));

export const rememberComposerPlayer = (playerId: string) =>
  rememberComposerPlayers([playerId]);

export const rememberComposerPlayers = (playerIds: Array<string | null | undefined>) => {
  const ids = uniquePlayerIds(playerIds);
  if (!ids.length) {
    return readComposerCarry();
  }
  const player = getPlayer(ids[0]!);
  const range = readComposerDateRange();
  const next: ComposerCarry = {
    playerId: ids[0]!,
    playerIds: ids,
    playerName: player?.name ?? "",
    from: range.from,
    to: range.to,
    at: Date.now(),
  };
  writeJson(COMPOSER_CARRY_KEY, next);
  return next;
};

export const carriedPlayerId = (currentId?: string | null) => {
  if (currentId) {
    return currentId;
  }
  return readComposerCarry()?.playerId ?? "";
};

export const carriedPlayerIds = () => readComposerCarry()?.playerIds ?? [];
