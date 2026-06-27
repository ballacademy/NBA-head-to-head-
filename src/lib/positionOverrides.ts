import overrideData from "../../data/player-position-overrides.json";
import type { Position } from "./types";

interface PositionOverrideFile {
  description?: string;
  overrides?: Record<string, Position[]>;
}

const overrideFile = overrideData as PositionOverrideFile;

export const PLAYER_POSITION_OVERRIDES: Readonly<Record<string, readonly Position[]>> =
  Object.freeze(overrideFile.overrides ?? {});

export const applyPositionOverride = (
  bbrPlayerId: string | undefined,
  positions: readonly Position[],
): Position[] => {
  if (!bbrPlayerId) {
    return [...positions];
  }

  const override = PLAYER_POSITION_OVERRIDES[bbrPlayerId];
  return override ? [...override] : [...positions];
};
