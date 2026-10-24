import { readJson, writeJson } from "../lib/browserStorage";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { readComposerDateRange } from "./composerDateRange";

export const COMPOSER_CARRY_KEY = "ddgm:composer-carry";

export interface ComposerCarry {
  playerId: string;
  playerName: string;
  from: string;
  to: string;
  at: number;
}

export const parseComposerCarry = (value: unknown): ComposerCarry | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<ComposerCarry>;
  if (typeof raw.playerId !== "string" || !raw.playerId.trim()) {
    return null;
  }
  return {
    playerId: raw.playerId,
    playerName: typeof raw.playerName === "string" ? raw.playerName : "",
    from: typeof raw.from === "string" ? raw.from : "",
    to: typeof raw.to === "string" ? raw.to : "",
    at: typeof raw.at === "number" ? raw.at : 0,
  };
};

export const readComposerCarry = () =>
  parseComposerCarry(readJson(COMPOSER_CARRY_KEY));

export const rememberComposerPlayer = (playerId: string) => {
  const player = getPlayer(playerId);
  const range = readComposerDateRange();
  const next: ComposerCarry = {
    playerId,
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
