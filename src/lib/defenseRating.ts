import {
  hasAllDefenseAccolade,
} from "./allDefense";

export type DefenseGrade =
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "C-"
  | "D+"
  | "D"
  | "F";

export interface DefensiveStatInput {
  stealsPer36: number;
  blocksPer36: number;
  defensiveReboundsPer36: number;
  defensiveWinSharesPerGame: number;
  defensiveBoxPlusMinus?: number | null;
  defensiveReboundPct?: number | null;
  stealPct?: number | null;
  blockPct?: number | null;
  bbrPlayerId?: string;
  points?: number;
  minutes?: number;
}

interface WeightedMetric {
  key: keyof DefensiveStatInput;
  weight: number;
}

const defensiveMetrics: WeightedMetric[] = [
  { key: "defensiveBoxPlusMinus", weight: 0.34 },
  { key: "defensiveWinSharesPerGame", weight: 0.28 },
  { key: "blockPct", weight: 0.12 },
  { key: "blocksPer36", weight: 0.06 },
  { key: "defensiveReboundPct", weight: 0.08 },
  { key: "defensiveReboundsPer36", weight: 0.04 },
  { key: "stealPct", weight: 0.04 },
  { key: "stealsPer36", weight: 0.04 },
];

const gradeThresholds: Array<{ min: number; grade: DefenseGrade }> = [
  { min: 94, grade: "A+" },
  { min: 88, grade: "A" },
  { min: 76, grade: "A-" },
  { min: 68, grade: "B+" },
  { min: 58, grade: "B" },
  { min: 48, grade: "B-" },
  { min: 38, grade: "C+" },
  { min: 28, grade: "C" },
  { min: 20, grade: "C-" },
  { min: 12, grade: "D+" },
  { min: 5, grade: "D" },
];

const DEFENSE_GRADE_OVERRIDES: Record<string, DefenseGrade> = {
  holmgch01: "A",
  antetgi01: "A-",
  edwaran01: "B",
};

const GENEROSITY_BOOST = 6;
const GENEROSITY_MULTIPLIER = 1.06;

const gradeRank: Record<DefenseGrade, number> = {
  "A+": 12,
  A: 11,
  "A-": 10,
  "B+": 9,
  B: 8,
  "B-": 7,
  "C+": 6,
  C: 5,
  "C-": 4,
  "D+": 3,
  D: 2,
  F: 1,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const per36 = (value: number, minutes: number) =>
  minutes > 0 ? (value / minutes) * 36 : 0;

export const toDefensiveStatInput = (raw: {
  bbrPlayerId?: string;
  minutes: number;
  gamesPlayed: number;
  points: number;
  steals: number;
  blocks: number;
  defensiveRebounds?: number;
  rebounds: number;
  defensiveWinShares?: number | null;
  defensiveBoxPlusMinus?: number | null;
  defensiveReboundPct?: number | null;
  stealPct?: number | null;
  blockPct?: number | null;
}): DefensiveStatInput => {
  const defensiveRebounds = raw.defensiveRebounds ?? raw.rebounds * 0.72;
  const gamesPlayed = Math.max(raw.gamesPlayed, 1);

  return {
    bbrPlayerId: raw.bbrPlayerId,
    points: raw.points,
    minutes: raw.minutes,
    stealsPer36: per36(raw.steals, raw.minutes),
    blocksPer36: per36(raw.blocks, raw.minutes),
    defensiveReboundsPer36: per36(defensiveRebounds, raw.minutes),
    defensiveWinSharesPerGame: (raw.defensiveWinShares ?? 0) / gamesPlayed,
    defensiveBoxPlusMinus: raw.defensiveBoxPlusMinus,
    defensiveReboundPct: raw.defensiveReboundPct,
    stealPct: raw.stealPct,
    blockPct: raw.blockPct,
  };
};

const percentileRank = (value: number, values: number[]) => {
  if (values.length <= 1) {
    return 50;
  }

  const sorted = [...values].sort((left, right) => left - right);
  let below = 0;
  let equal = 0;

  for (const candidate of sorted) {
    if (candidate < value) {
      below += 1;
    } else if (candidate === value) {
      equal += 1;
    }
  }

  return ((below + equal * 0.5) / (sorted.length - 1)) * 100;
};

export const gradeFromPercentile = (percentile: number): DefenseGrade => {
  for (const threshold of gradeThresholds) {
    if (percentile >= threshold.min) {
      return threshold.grade;
    }
  }

  return "F";
};

export const defenseScoreFromPercentile = (percentile: number) =>
  clamp(4 + (percentile / 100) * 6, 4, 10);

const raiseGrade = (
  grade: DefenseGrade,
  minimum: DefenseGrade,
): DefenseGrade => (gradeRank[grade] >= gradeRank[minimum] ? grade : minimum);

const applyAccoladeFloor = (
  grade: DefenseGrade,
  bbrPlayerId?: string,
): DefenseGrade => {
  if (!hasAllDefenseAccolade(bbrPlayerId)) {
    return grade;
  }

  return raiseGrade(grade, "A");
};

const applyGradeOverrides = (
  grade: DefenseGrade,
  bbrPlayerId?: string,
): DefenseGrade => {
  if (!bbrPlayerId) {
    return grade;
  }

  return DEFENSE_GRADE_OVERRIDES[bbrPlayerId] ?? grade;
};

export const buildDefensivePercentileTables = (players: DefensiveStatInput[]) => {
  const tables = new Map<keyof DefensiveStatInput, number[]>();

  for (const metric of defensiveMetrics) {
    const values = players
      .map((player) => player[metric.key])
      .filter(isFiniteNumber);

    tables.set(metric.key, values);
  }

  return tables;
};

export const computeDefensivePercentile = (
  player: DefensiveStatInput,
  tables: Map<keyof DefensiveStatInput, number[]>,
) => {
  let weightedScore = 0;
  let totalWeight = 0;

  for (const metric of defensiveMetrics) {
    const value = player[metric.key];
    const values = tables.get(metric.key) ?? [];

    if (!isFiniteNumber(value) || values.length === 0) {
      continue;
    }

    weightedScore += percentileRank(value, values) * metric.weight;
    totalWeight += metric.weight;
  }

  if (totalWeight === 0) {
    return 50;
  }

  let percentile = weightedScore / totalWeight;
  const stealPercentile = percentileRank(
    player.stealsPer36,
    tables.get("stealsPer36") ?? [],
  );
  const dbpmValues = tables.get("defensiveBoxPlusMinus") ?? [];
  const dbpmPercentile = isFiniteNumber(player.defensiveBoxPlusMinus)
    ? percentileRank(player.defensiveBoxPlusMinus, dbpmValues)
    : 50;
  const blockPercentile = percentileRank(
    player.blocksPer36,
    tables.get("blocksPer36") ?? [],
  );

  if (stealPercentile >= 75 && blockPercentile < 55) {
    percentile -= blockPercentile < 40 ? 12 : 8;
  }

  if ((player.points ?? 0) >= 28 && blockPercentile < 55) {
    percentile -= 20;
  }

  if ((player.points ?? 0) >= 30 && stealPercentile >= 75) {
    percentile -= 5;
  }

  percentile = clamp(
    percentile * GENEROSITY_MULTIPLIER + GENEROSITY_BOOST,
    0,
    100,
  );

  return percentile;
};

const gradeToMinPercentile = (grade: DefenseGrade) =>
  gradeThresholds.find((threshold) => threshold.grade === grade)?.min ?? 0;

export const buildDefensiveRatings = <T extends DefensiveStatInput & { id: string }>(
  players: T[],
) => {
  const eligible = players.filter(
    (player) =>
      (player.minutes ?? 0) >= 12 &&
      defensiveMetrics.some((metric) => isFiniteNumber(player[metric.key])),
  );
  const tables = buildDefensivePercentileTables(eligible);
  const ratings = new Map<
    string,
    { percentile: number; grade: DefenseGrade; defense: number }
  >();

  for (const player of players) {
    const percentile = computeDefensivePercentile(player, tables);
    const grade = applyGradeOverrides(
      applyAccoladeFloor(gradeFromPercentile(percentile), player.bbrPlayerId),
      player.bbrPlayerId,
    );
    const adjustedPercentile = Math.max(percentile, gradeToMinPercentile(grade));

    ratings.set(player.id, {
      percentile: adjustedPercentile,
      grade,
      defense: defenseScoreFromPercentile(adjustedPercentile),
    });
  }

  return ratings;
};
