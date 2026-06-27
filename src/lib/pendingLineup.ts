import { readJson, writeJson } from "./browserStorage";
import type { GhostMatchmakingMode } from "./ghostMatchmaking";

const pendingLineupKey = (mode: GhostMatchmakingMode, playerId: string) =>
  `nba-head-to-head-pending-lineup-${mode}-${playerId}`;

export interface PendingLineupState {
  storedLineupId: string;
  mode: GhostMatchmakingMode;
  submittedAt: string;
}

export const loadPendingLineupState = (
  mode: GhostMatchmakingMode,
  playerId: string,
): PendingLineupState | null => {
  const saved = readJson<PendingLineupState>(pendingLineupKey(mode, playerId));

  if (
    !saved ||
    saved.mode !== mode ||
    typeof saved.storedLineupId !== "string" ||
    typeof saved.submittedAt !== "string"
  ) {
    return null;
  }

  return saved;
};

export const savePendingLineupState = (state: PendingLineupState, playerId: string) => {
  writeJson(pendingLineupKey(state.mode, playerId), state);
};

export const clearPendingLineupState = (
  mode: GhostMatchmakingMode,
  playerId: string,
) => {
  writeJson(pendingLineupKey(mode, playerId), null);
};
