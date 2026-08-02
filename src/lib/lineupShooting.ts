import type { Player } from "./types";

export const PASSABLE_THREE_POINT = 0.36;
export const ELITE_THREE_POINT = 0.38;
export const NON_SHOOTER_THREE_POINT = 0.32;

/** Minimum 3PA/game to count as real spacing (not a tiny hot/cold sample). */
export const PASSABLE_THREE_VOLUME = 2;
/** Minimum 3PA/game to count as an elite spacing shooter. */
export const ELITE_THREE_VOLUME = 3.5;
/** At/under this volume, low 3P% (or any %) is treated as non-spacing. */
export const NON_SHOOTER_THREE_VOLUME = 1;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export interface LineupShootingProfile {
  volumeWeightedThreePoint: number;
  simpleAverageThreePoint: number;
  passableShooters: number;
  eliteShooters: number;
  nonShooters: number;
  totalThreePointersAttempted: number;
}

export const isPassableThreePointShooter = (player: Player) =>
  player.threePoint >= PASSABLE_THREE_POINT &&
  player.threePointersAttempted >= PASSABLE_THREE_VOLUME;

export const isEliteThreePointShooter = (player: Player) =>
  player.threePoint >= ELITE_THREE_POINT &&
  player.threePointersAttempted >= ELITE_THREE_VOLUME;

/** Low-% shooters, plus anyone without enough attempts to space the floor. */
export const isNonThreePointShooter = (player: Player) =>
  player.threePointersAttempted < NON_SHOOTER_THREE_VOLUME ||
  (player.threePoint < NON_SHOOTER_THREE_POINT &&
    player.threePointersAttempted < PASSABLE_THREE_VOLUME);

export const buildLineupShootingProfile = (
  lineup: Player[],
  weights: number[],
  weightSum: number,
): LineupShootingProfile => {
  const totalThreePointersAttempted = lineup.reduce(
    (sum, player, index) => sum + player.threePointersAttempted * weights[index],
    0,
  );

  const volumeWeightedThreePoint =
    totalThreePointersAttempted > 0
      ? lineup.reduce(
          (sum, player, index) =>
            sum +
            player.threePoint * player.threePointersAttempted * weights[index],
          0,
        ) / totalThreePointersAttempted
      : weightSum > 0
        ? lineup.reduce(
            (sum, player, index) => sum + player.threePoint * weights[index],
            0,
          ) / weightSum
        : 0;

  const simpleAverageThreePoint =
    weightSum > 0
      ? lineup.reduce(
          (sum, player, index) => sum + player.threePoint * weights[index],
          0,
        ) / weightSum
      : 0;

  const countWeighted = (predicate: (player: Player) => boolean) =>
    lineup.reduce(
      (sum, player, index) => sum + (predicate(player) ? weights[index] : 0),
      0,
    );

  return {
    volumeWeightedThreePoint,
    simpleAverageThreePoint,
    passableShooters: countWeighted(isPassableThreePointShooter),
    eliteShooters: countWeighted(isEliteThreePointShooter),
    nonShooters: countWeighted(isNonThreePointShooter),
    totalThreePointersAttempted,
  };
};

export const scoreLineupThreePointBonus = (profile: LineupShootingProfile) => {
  // Quality of makes, already attempt-weighted across the lineup.
  const volumeBonus = clamp(
    (profile.volumeWeightedThreePoint - 0.335) * 130,
    0,
    14,
  );
  // How many real volume shooters are on the floor (passable/elite already
  // require attempt floors — no separate lineup-wide attempt stack).
  const floorBonus = clamp(profile.passableShooters * 1.9, 0, 9);
  const eliteBonus = clamp(profile.eliteShooters * 1.1, 0, 4);
  const fragilePenalty = clamp(profile.nonShooters * 2.4, 0, 8);

  return clamp(volumeBonus + floorBonus + eliteBonus - fragilePenalty, 0, 22);
};

export const hasReliableLineupSpacing = (profile: LineupShootingProfile) =>
  profile.passableShooters >= 3.5 ||
  (profile.volumeWeightedThreePoint >= 0.36 &&
    profile.passableShooters >= 2.5 &&
    profile.totalThreePointersAttempted >= 14);

export const formatLineupShootingNote = (profile: LineupShootingProfile) => {
  const passableCount = Math.round(profile.passableShooters);

  return `${passableCount} passable+ shooters (${PASSABLE_THREE_POINT * 100}%+ on ${PASSABLE_THREE_VOLUME}+ 3PA), ${roundPercent(
    profile.volumeWeightedThreePoint,
  )}% volume-weighted 3P`;
};

const roundPercent = (value: number) => (value * 100).toFixed(1);
