import type { Player } from "./types";
import type { PlayerRecord } from "./playerRecord";

export type EraId = "1970s" | "1980s" | "1990s" | "2000s" | "2010s";

export const ALL_TIME_WIN_THRESHOLD = 50;

/** Set to false before release to require 50 wins for legends. */
export const ALL_TIME_LEGENDS_TESTING_UNLOCK = true;

export const ALL_ERA_IDS: EraId[] = [
  "1970s",
  "1980s",
  "1990s",
  "2000s",
  "2010s",
];

export const areLegendsUnlocked = (
  record: Pick<PlayerRecord, "wins">,
) =>
  ALL_TIME_LEGENDS_TESTING_UNLOCK ||
  record.wins >= ALL_TIME_WIN_THRESHOLD;

export const isAllTimeModeUnlocked = areLegendsUnlocked;

export const getUnlockedEras = (
  record: Pick<PlayerRecord, "wins">,
): EraId[] => (areLegendsUnlocked(record) ? ALL_ERA_IDS : []);

export const getAllTimeWinsRemaining = (
  record: Pick<PlayerRecord, "wins">,
) => Math.max(ALL_TIME_WIN_THRESHOLD - record.wins, 0);

export const isEraPlayer = (player: Pick<Player, "era">) => Boolean(player.era);
