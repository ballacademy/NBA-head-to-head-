import type { Player } from "./types";

/** Assists where elevation credit begins to ramp. */
export const PLAYMAKER_ELEVATION_ASSISTS_FLOOR = 4.5;
/** Assists that fully clear as a teammate elevator. */
export const PLAYMAKER_ELEVATION_ASSISTS_FULL = 7;
/** Assist/points share that marks a creator vs an iso scorer. */
export const PLAYMAKER_ASSIST_SHARE_FLOOR = 0.18;
export const PLAYMAKER_ASSIST_SHARE_FULL = 0.34;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const smoothUnit = (value: number, start: number, end: number) => {
  if (end <= start) {
    return value >= end ? 1 : 0;
  }

  return clamp01((value - start) / (end - start));
};

/**
 * 0–1 how much this player elevates teammates as a creator/playmaker.
 * Engines and high-assist initiators clear; iso scorers / non-creating bigs stay low.
 */
export const getPlaymakerElevationStrength = (player: Player) => {
  if (player.styles.includes("engine")) {
    return 1;
  }

  const assistFactor = smoothUnit(
    player.assists,
    PLAYMAKER_ELEVATION_ASSISTS_FLOOR,
    PLAYMAKER_ELEVATION_ASSISTS_FULL,
  );
  const assistShare =
    player.points > 0
      ? player.assists / player.points
      : player.assists > 0
        ? 1
        : 0;
  const shareFactor = smoothUnit(
    assistShare,
    PLAYMAKER_ASSIST_SHARE_FLOOR,
    PLAYMAKER_ASSIST_SHARE_FULL,
  );

  // Guard initiators get a small assist-path boost; pure bigs need real APG.
  const guardBoost =
    (player.position === "PG" || player.position === "SG") &&
    assistFactor > 0.35
      ? 0.12
      : 0;

  return clamp01(
    Math.max(assistFactor, 0.55 * assistFactor + 0.45 * shareFactor) +
      guardBoost,
  );
};

export const isPlaymakerElevator = (player: Player) =>
  getPlaymakerElevationStrength(player) >= 0.85;
