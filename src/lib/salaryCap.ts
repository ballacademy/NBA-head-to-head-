import {
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
} from "./allStars";
import { isScrubPlayer, isSuperScrubPlayer } from "./playerTiers";
import type { Player } from "./types";

export const RANKED_SALARY_CAP = 100_000_000;
export const MINIMUM_PLAYER_SALARY = 1_209_240;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const formatSalary = (salary: number) => {
  if (salary >= 1_000_000) {
    return `$${(salary / 1_000_000).toFixed(1)}M`;
  }

  return `$${Math.round(salary / 1_000)}K`;
};

export const estimatePlayerSalary = (player: Player) => {
  if (typeof player.salary === "number") {
    return player.salary;
  }

  if (isSuperScrubPlayer(player)) {
    return MINIMUM_PLAYER_SALARY;
  }

  if (isScrubPlayer(player)) {
    return 2_400_000;
  }

  const productionScore =
    player.points * 650_000 +
    player.usage * 900_000 +
    player.trueShooting * 8_000_000;

  if (isSuperstarPlayer(player)) {
    return clamp(productionScore, 38_000_000, 55_000_000);
  }

  if (isAllStarPlayer(player)) {
    return clamp(productionScore, 22_000_000, 42_000_000);
  }

  if (isRecentAllStarPlayer(player)) {
    return clamp(productionScore, 14_000_000, 28_000_000);
  }

  if (player.points >= 18) {
    return clamp(productionScore, 10_000_000, 24_000_000);
  }

  if (player.points >= 12) {
    return clamp(productionScore, 5_000_000, 14_000_000);
  }

  return clamp(productionScore, MINIMUM_PLAYER_SALARY, 8_000_000);
};

export const getLineupSalaryTotal = (lineup: Player[]) =>
  lineup.reduce((total, player) => total + estimatePlayerSalary(player), 0);

export const getRemainingSalaryCap = (
  lineup: Player[],
  cap = RANKED_SALARY_CAP,
) => cap - getLineupSalaryTotal(lineup);

export const canAffordPlayer = (
  lineup: Player[],
  player: Player,
  picksRemaining: number,
  cap = RANKED_SALARY_CAP,
) => {
  const nextTotal = getLineupSalaryTotal(lineup) + estimatePlayerSalary(player);
  const minimumReserve = Math.max(picksRemaining - 1, 0) * MINIMUM_PLAYER_SALARY;

  return nextTotal + minimumReserve <= cap;
};

export const getMaxAffordableSalary = (
  lineup: Player[],
  picksRemaining: number,
  cap = RANKED_SALARY_CAP,
) => {
  const minimumReserve = Math.max(picksRemaining - 1, 0) * MINIMUM_PLAYER_SALARY;

  return Math.max(
    0,
    cap - getLineupSalaryTotal(lineup) - minimumReserve,
  );
};
