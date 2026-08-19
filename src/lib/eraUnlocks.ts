import type { Player } from "./types";
import { isQaRuntimeHost } from "./qaRuntime";

export type EraId = "1970s" | "1980s" | "1990s" | "2000s" | "2010s";

/**
 * Production default: All-Time stays behind a release-date gate.
 * Flip to true when you want to launch. When true, all players get access —
 * there is no per-player win or banner threshold.
 * QA / local hosts always expose the mode regardless.
 */
export const ALL_TIME_MODE_PLAYABLE = false;

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

/** In All-Time mode all eras are always available (no per-player unlock). */
export const getUnlockedEras = (): EraId[] => ALL_ERA_IDS;

export const isEraPlayer = (player: Pick<Player, "era">) => Boolean(player.era);
