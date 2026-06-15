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
  steals: number;
  blocks: number;
  defensiveRebounds: number;
  defensiveWinShares?: number | null;
  defensiveBoxPlusMinus?: number | null;
  defensiveReboundPct?: number | null;
  stealPct?: number | null;
  blockPct?: number | null;
}

interface WeightedMetric {
  key: keyof DefensiveStatInput;
  weight: number;
}

const defensiveMetrics: WeightedMetric[] = [
  { key: "defensiveWinShares", weight: 0.22 },
  { key: "defensiveBoxPlusMinus", weight: 0.22 },
  { key: "steals", weight: 0.1 },
  { key: "blocks", weight: 0.1 },
  { key: "defensiveRebounds", weight: 0.1 },
  { key: "defensiveReboundPct", weight: 0.1 },
  { key: "stealPct", weight: 0.08 },
  { key: "blockPct", weight: 0.08 },
];

const gradeThresholds: Array<{ min: number; grade: DefenseGrade }> = [
  { min: 97, grade: "A+" },
  { min: 93, grade: "A" },
  { min: 88, grade: "A-" },
  { min: 82, grade: "B+" },
  { min: 75, grade: "B" },
  { min: 68, grade: "B-" },
  { min: 58, grade: "C+" },
  { min: 48, grade: "C" },
  { min: 38, grade: "C-" },
  { min: 28, grade: "D+" },
  { min: 18, grade: "D" },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

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

  return weightedScore / totalWeight;
};

export const buildDefensiveRatings = <T extends DefensiveStatInput & { id: string }>(
  players: T[],
) => {
  const eligible = players.filter((player) =>
    defensiveMetrics.some((metric) => isFiniteNumber(player[metric.key])),
  );
  const tables = buildDefensivePercentileTables(eligible);
  const ratings = new Map<
    string,
    { percentile: number; grade: DefenseGrade; defense: number }
  >();

  for (const player of players) {
    const percentile = computeDefensivePercentile(player, tables);

    ratings.set(player.id, {
      percentile,
      grade: gradeFromPercentile(percentile),
      defense: defenseScoreFromPercentile(percentile),
    });
  }

  return ratings;
};
