import heightData from "../../data/nba-player-heights.json";
import type { Position } from "./types";

interface HeightEntry {
  name: string;
  heightInches: number;
  team?: string;
  seasonYear?: number;
}

interface PlayerHeightsFile {
  byPlayerId: Record<string, HeightEntry>;
}

const file = heightData as PlayerHeightsFile;

/** Position averages used only when no BBR height is available. */
export const POSITION_HEIGHT_INCHES: Record<Position, number> = {
  PG: 74.5,
  SG: 76.5,
  SF: 79.5,
  PF: 81.5,
  C: 84,
};

export const lookupPlayerHeightInches = (
  bbrPlayerId: string | undefined,
): number | null => {
  if (!bbrPlayerId) {
    return null;
  }

  const entry = file.byPlayerId[bbrPlayerId];
  if (!entry || !Number.isFinite(entry.heightInches)) {
    return null;
  }

  return entry.heightInches;
};

export const estimateHeightInches = (
  position: Position,
  seed = "",
): number => {
  const base = POSITION_HEIGHT_INCHES[position];
  const variance = seed.length % 3;
  return base + variance - 1;
};

export const resolvePlayerHeightInches = (options: {
  heightInches?: number | null;
  bbrPlayerId?: string;
  position: Position;
  seed?: string;
}): number => {
  if (
    typeof options.heightInches === "number" &&
    Number.isFinite(options.heightInches) &&
    options.heightInches > 0
  ) {
    return options.heightInches;
  }

  const lookedUp = lookupPlayerHeightInches(options.bbrPlayerId);
  if (lookedUp != null) {
    return lookedUp;
  }

  return estimateHeightInches(options.position, options.seed ?? "");
};
