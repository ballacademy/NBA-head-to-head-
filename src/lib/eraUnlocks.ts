import type { Player } from "./types";
import type { PlayerRecord } from "./playerRecord";
import { isQaRuntimeHost } from "./qaRuntime";

export type EraId = "1970s" | "1980s" | "1990s" | "2000s" | "2010s";

export const ALL_TIME_WIN_THRESHOLD = 50;

/**
 * Alternate legends unlock via All-Time peak banners (same scale as Casual/Pro).
 * Starts at 500; 1000 = NBA GM tier.
 */
export const ALL_TIME_BANNER_UNLOCK_THRESHOLD = 1000;

/**
 * Production default: All-Time stays “coming soon” on www.
 * QA / local hosts still expose the mode via `isAllTimeModePlayable()`.
 */
export const ALL_TIME_MODE_PLAYABLE = false;

/** Set to false before release to require 50 wins / banner threshold for legends. */
export const ALL_TIME_LEGENDS_TESTING_UNLOCK = false;

/** Playable on prod only when the flag is true; always playable on QA/local. */
export const isAllTimeModePlayable = (
  hostname = typeof window !== "undefined" ? window.location.hostname : "",
) => ALL_TIME_MODE_PLAYABLE || isQaRuntimeHost(hostname);

export const ALL_ERA_IDS: EraId[] = [
  "1970s",
  "1980s",
  "1990s",
  "2000s",
  "2010s",
];

export interface LegendsUnlockOptions {
  /** Peak banners earned in All-Time mode only (not Casual/Pro). */
  peakBanners?: number;
}

export const areLegendsUnlocked = (
  record: Pick<PlayerRecord, "wins">,
  options: LegendsUnlockOptions = {},
) =>
  ALL_TIME_LEGENDS_TESTING_UNLOCK ||
  record.wins >= ALL_TIME_WIN_THRESHOLD ||
  (options.peakBanners ?? 0) >= ALL_TIME_BANNER_UNLOCK_THRESHOLD;

export const isAllTimeModeUnlocked = areLegendsUnlocked;

export const getUnlockedEras = (
  record: Pick<PlayerRecord, "wins">,
  options: LegendsUnlockOptions = {},
): EraId[] => (areLegendsUnlocked(record, options) ? ALL_ERA_IDS : []);

export const getAllTimeWinsRemaining = (
  record: Pick<PlayerRecord, "wins">,
) => Math.max(ALL_TIME_WIN_THRESHOLD - record.wins, 0);

export const isEraPlayer = (player: Pick<Player, "era">) => Boolean(player.era);
