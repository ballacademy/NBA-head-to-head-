import type { DailyDraftGoal } from "./dailyDraftGoals";
import {
  formatAverageDefenseGrade,
  getDefenseGrade,
  getPlayerDefenseGradeRank,
} from "./defenseGrade";
import type { Player } from "./types";

const average = (values: number[]) =>
  values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

const perMinute = (player: Player, value: number) =>
  player.minutes > 0 ? value / player.minutes : 0;

const assistToTurnoverRatio = (player: Player) =>
  player.turnovers > 0 ? player.assists / player.turnovers : player.assists;

const threePointAttemptShare = (player: Player) =>
  player.fieldGoalsAttempted > 0
    ? player.threePointersAttempted / player.fieldGoalsAttempted
    : 0;

const weightedRate = (
  lineup: Player[],
  rate: (player: Player) => number,
  weight: (player: Player) => number,
) => {
  const totalWeight = lineup.reduce((sum, player) => sum + weight(player), 0);

  if (totalWeight <= 0) {
    return 0;
  }

  return (
    lineup.reduce(
      (sum, player) => sum + rate(player) * weight(player),
      0,
    ) / totalWeight
  );
};

const getStatValue = (player: Player, stat: DailyDraftGoal["stat"]) => {
  switch (stat) {
    case "threePoint":
      return player.threePoint;
    case "trueShooting":
      return player.trueShooting;
    case "rebounds":
      return player.rebounds;
    case "assists":
      return player.assists;
    case "turnovers":
      return player.turnovers;
    case "steals":
      return player.steals;
    case "blocks":
      return player.blocks;
    case "points":
      return player.points;
    case "heightInches":
      return player.heightInches;
    case "age":
      return player.age ?? 0;
    case "minutes":
      return player.minutes;
    case "usage":
      return player.usage;
    case "defense":
      return getPlayerDefenseGradeRank(player);
    case "fieldGoalsAttempted":
      return player.fieldGoalsAttempted;
    case "threePointersAttempted":
      return player.threePointersAttempted;
    case "stocks":
      return player.steals + player.blocks;
    case "pointsPerMinute":
      return perMinute(player, player.points);
    case "assistsPerMinute":
      return perMinute(player, player.assists);
    case "reboundsPerMinute":
      return perMinute(player, player.rebounds);
    case "stealsPerMinute":
      return perMinute(player, player.steals);
    case "blocksPerMinute":
      return perMinute(player, player.blocks);
    case "stocksPerMinute":
      return perMinute(player, player.steals + player.blocks);
    case "turnoversPerMinute":
      return perMinute(player, player.turnovers);
    case "assistToTurnoverRatio":
      return assistToTurnoverRatio(player);
    case "threePointAttemptShare":
      return threePointAttemptShare(player);
    case "threePointersAttemptedPerMinute":
      return perMinute(player, player.threePointersAttempted);
    case "fieldGoalsAttemptedPerMinute":
      return perMinute(player, player.fieldGoalsAttempted);
    default:
      return 0;
  }
};

export const scoreLineupForGoal = (lineup: Player[], goal: DailyDraftGoal) => {
  if (lineup.length === 0) {
    return 0;
  }

  if (goal.aggregation === "weightedRate") {
    if (goal.stat === "threePoint") {
      return weightedRate(
        lineup,
        (player) => player.threePoint,
        (player) => player.threePointersAttempted,
      );
    }

    return weightedRate(
      lineup,
      (player) => player.trueShooting,
      (player) => player.fieldGoalsAttempted,
    );
  }

  return average(lineup.map((player) => getStatValue(player, goal.stat)));
};

const formatHeight = (inches: number) => {
  const feet = Math.floor(inches / 12);
  const remaining = Math.round(inches % 12);

  return `${feet}'${remaining}" avg height`;
};

export const formatPlayerHeight = (inches: number) => {
  const feet = Math.floor(inches / 12);
  const remaining = Math.round(inches % 12);

  return `${feet}'${remaining}"`;
};

export const formatPlayerGoalStat = (player: Player, goal: DailyDraftGoal) => {
  const value = getStatValue(player, goal.stat);

  switch (goal.stat) {
    case "threePoint":
      return `${(value * 100).toFixed(1)}% 3P`;
    case "trueShooting":
      return `${(value * 100).toFixed(1)}% TS`;
    case "rebounds":
      return `${value.toFixed(1)} RPG`;
    case "assists":
      return `${value.toFixed(1)} APG`;
    case "turnovers":
      return `${value.toFixed(1)} TOV`;
    case "steals":
      return `${value.toFixed(1)} SPG`;
    case "blocks":
      return `${value.toFixed(1)} BPG`;
    case "points":
      return `${value.toFixed(1)} PPG`;
    case "heightInches":
      return formatPlayerHeight(value);
    case "age":
      return `${value.toFixed(1)} yrs`;
    case "minutes":
      return `${value.toFixed(1)} MPG`;
    case "usage":
      return `${value.toFixed(1)} USG%`;
    case "defense":
      return `${getDefenseGrade(player.defense, player.defenseGrade)} DEF`;
    case "fieldGoalsAttempted":
      return `${value.toFixed(1)} FGA`;
    case "threePointersAttempted":
      return `${value.toFixed(1)} 3PA`;
    case "stocks":
      return `${value.toFixed(1)} stocks`;
    case "pointsPerMinute":
      return `${value.toFixed(2)} PPM`;
    case "assistsPerMinute":
      return `${value.toFixed(2)} APM`;
    case "reboundsPerMinute":
      return `${value.toFixed(2)} RPM`;
    case "stealsPerMinute":
      return `${value.toFixed(2)} SPM`;
    case "blocksPerMinute":
      return `${value.toFixed(2)} BPM`;
    case "stocksPerMinute":
      return `${value.toFixed(2)} stocks/min`;
    case "turnoversPerMinute":
      return `${value.toFixed(2)} TOV/min`;
    case "assistToTurnoverRatio":
      return `${value.toFixed(2)} AST/TOV`;
    case "threePointAttemptShare":
      return `${(value * 100).toFixed(1)}% 3PA share`;
    case "threePointersAttemptedPerMinute":
      return `${value.toFixed(2)} 3PA/min`;
    case "fieldGoalsAttemptedPerMinute":
      return `${value.toFixed(2)} FGA/min`;
    default:
      return value.toFixed(1);
  }
};

export const formatGoalResult = (value: number, goal: DailyDraftGoal) => {
  switch (goal.stat) {
    case "threePoint":
      return `${(value * 100).toFixed(1)}% from 3`;
    case "trueShooting":
      return `${(value * 100).toFixed(1)}% true shooting`;
    case "rebounds":
      return `${value.toFixed(1)} RPG`;
    case "assists":
      return `${value.toFixed(1)} APG`;
    case "turnovers":
      return `${value.toFixed(1)} TOPG`;
    case "steals":
      return `${value.toFixed(1)} SPG`;
    case "blocks":
      return `${value.toFixed(1)} BPG`;
    case "points":
      return `${value.toFixed(1)} PPG`;
    case "heightInches":
      return formatHeight(value);
    case "age":
      return `${value.toFixed(1)} years avg age`;
    case "minutes":
      return `${value.toFixed(1)} MPG`;
    case "usage":
      return `${value.toFixed(1)} avg usage`;
    case "defense":
      return formatAverageDefenseGrade(value);
    case "fieldGoalsAttempted":
      return `${value.toFixed(1)} FGA`;
    case "threePointersAttempted":
      return `${value.toFixed(1)} 3PA`;
    case "stocks":
      return `${value.toFixed(1)} stocks per game`;
    case "pointsPerMinute":
      return `${value.toFixed(2)} points per minute`;
    case "assistsPerMinute":
      return `${value.toFixed(2)} assists per minute`;
    case "reboundsPerMinute":
      return `${value.toFixed(2)} rebounds per minute`;
    case "stealsPerMinute":
      return `${value.toFixed(2)} steals per minute`;
    case "blocksPerMinute":
      return `${value.toFixed(2)} blocks per minute`;
    case "stocksPerMinute":
      return `${value.toFixed(2)} stocks per minute`;
    case "turnoversPerMinute":
      return `${value.toFixed(2)} turnovers per minute`;
    case "assistToTurnoverRatio":
      return `${value.toFixed(2)} assist-to-turnover ratio`;
    case "threePointAttemptShare":
      return `${(value * 100).toFixed(1)}% of shots from 3`;
    case "threePointersAttemptedPerMinute":
      return `${value.toFixed(2)} 3PA per minute`;
    case "fieldGoalsAttemptedPerMinute":
      return `${value.toFixed(2)} FGA per minute`;
    default:
      return value.toFixed(1);
  }
};

export interface DailyGoalResult {
  value: number;
  formatted: string;
}

export const buildDailyGoalResult = (
  lineup: Player[],
  goal: DailyDraftGoal,
): DailyGoalResult => {
  const value = scoreLineupForGoal(lineup, goal);

  return {
    value,
    formatted: formatGoalResult(value, goal),
  };
};
