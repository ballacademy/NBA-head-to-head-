import type { LineupScore, Player, ProjectedRecord, ScoreCategory } from "./types";
import { getChemistryAdjustment, getActiveChemistryBonuses } from "./chemistry";
import {
  formatAverageDefenseGrade,
  getPlayerDefenseGradeRank,
  meetsMinimumDefenseGrade,
} from "./defenseGrade";
import { getImpactRankingAdjustment } from "./impactRanking";
import { getLineupTierAdjustment } from "./lineupMatchupBonus";
import type { HeadToHeadResult } from "./playerRecord";
import { getPlayerStatWeight } from "./sampleSize";
import {
  blendProjectedWinsWithTeamAnchor,
  getSameTeamRecordAnchor,
} from "./teamRecordBaseline";

export const LOW_SCORING_PPG_THRESHOLD = 6;
export const LOW_SCORING_IMPACT_WEIGHT = 0.05;
export const LOW_SCORING_LINEUP_PENALTY = -7;
export const PRIMARY_SCORER_PPG_THRESHOLD = 20;
export const PRIMARY_SCORER_LINEUP_PENALTY = -8;
export const STOPPER_MINIMUM_DEFENSE_GRADE = "B" as const;

export const isLowScoringNonEliteDefender = (player: Player) =>
  player.points < LOW_SCORING_PPG_THRESHOLD &&
  !meetsMinimumDefenseGrade(player.defense, player.defenseGrade, "B+");

export const getLowScoringLineupPenalty = (lineup: Player[]) =>
  lineup.reduce(
    (penalty, player) =>
      isLowScoringNonEliteDefender(player)
        ? penalty + LOW_SCORING_LINEUP_PENALTY
        : penalty,
    0,
  );

export const hasPrimaryScorer = (lineup: Player[]) =>
  lineup.some((player) => player.points >= PRIMARY_SCORER_PPG_THRESHOLD);

export const getPrimaryScorerLineupPenalty = (lineup: Player[]) =>
  hasPrimaryScorer(lineup) ? 0 : PRIMARY_SCORER_LINEUP_PENALTY;

export const isPlusDefenderByGrade = (player: Player) =>
  meetsMinimumDefenseGrade(
    player.defense,
    player.defenseGrade,
    STOPPER_MINIMUM_DEFENSE_GRADE,
  );

export const SEASON_LENGTH = 82;
export const LINEUP_RAW_CEILING = 232;

const round = (value: number, places = 1) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const preciseLineupOvr = (rawTotal: number) =>
  clamp((rawTotal / LINEUP_RAW_CEILING) * 100, 0, 100);

export const displayLineupOvr = (preciseOvr: number) => Math.round(preciseOvr);

export const normalizeLineupTotal = (rawTotal: number) =>
  displayLineupOvr(preciseLineupOvr(rawTotal));

export const formatProjectedSeasonRecord = (record: ProjectedRecord) =>
  `${record.wins}-${record.losses}`;

const PROJECTED_WINS_AT_80 = 52;
const PROJECTED_WINS_AT_85 = 57;
const PROJECTED_WINS_AT_90 = 63;
const PROJECTED_WINS_AT_95 = 71;
const PROJECTED_WINS_AT_100 = 82;
const LOW_OVR_CURVE_POWER = 1.35;

const interpolate = (value: number, start: number, end: number, from: number, to: number) =>
  from + ((to - from) * (value - start)) / (end - start);

export const projectedWinsFromOvr = (lineupTotal: number) => {
  const total = clamp(lineupTotal, 0, 100);

  if (total >= 95) {
    return Math.round(
      interpolate(total, 95, 100, PROJECTED_WINS_AT_95, PROJECTED_WINS_AT_100),
    );
  }

  if (total >= 90) {
    return Math.round(
      interpolate(total, 90, 95, PROJECTED_WINS_AT_90, PROJECTED_WINS_AT_95),
    );
  }

  if (total >= 85) {
    return Math.round(
      interpolate(total, 85, 90, PROJECTED_WINS_AT_85, PROJECTED_WINS_AT_90),
    );
  }

  if (total >= 80) {
    return Math.round(
      interpolate(total, 80, 85, PROJECTED_WINS_AT_80, PROJECTED_WINS_AT_85),
    );
  }

  return Math.round(
    PROJECTED_WINS_AT_80 * (total / 80) ** LOW_OVR_CURVE_POWER,
  );
};

export const projectRecord = (lineupTotal: number): ProjectedRecord => {
  const wins = clamp(projectedWinsFromOvr(lineupTotal), 0, SEASON_LENGTH);
  const losses = SEASON_LENGTH - wins;

  return {
    wins,
    losses,
    formatted: `Record: ${wins}-${losses}`,
  };
};

const projectLineupRecord = (
  lineup: Player[],
  preciseTotal: number,
): ProjectedRecord => {
  const ovrRecord = projectRecord(preciseTotal);
  const teamAnchor = getSameTeamRecordAnchor(lineup);

  if (!teamAnchor) {
    return ovrRecord;
  }

  const wins = blendProjectedWinsWithTeamAnchor(
    ovrRecord.wins,
    teamAnchor,
  );
  const losses = SEASON_LENGTH - wins;

  return {
    wins,
    losses,
    formatted: `Record: ${wins}-${losses}`,
  };
};

export const getPlayersById = (playerIds: string[], pool: Player[]) =>
  playerIds
    .map((id) => pool.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player));

export {
  getLineupTierAdjustment,
  getScrubTierLineupPenalty,
  getStarTierLineupBonus,
} from "./lineupMatchupBonus";
export { getActiveChemistryBonuses, getChemistryAdjustment } from "./chemistry";

const getPlayerLineupWeight = (player: Player) => {
  const sampleWeight = getPlayerStatWeight(player);

  if (isLowScoringNonEliteDefender(player)) {
    return sampleWeight * LOW_SCORING_IMPACT_WEIGHT;
  }

  return sampleWeight;
};

const buildLineupWeights = (lineup: Player[]) => {
  const weights = lineup.map((player) => getPlayerLineupWeight(player));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);

  return { weights, weightSum };
};

const weightedTotal = (
  lineup: Player[],
  metric: keyof Pick<
    Player,
    | "points"
    | "rebounds"
    | "assists"
    | "steals"
    | "blocks"
    | "trueShooting"
    | "threePoint"
    | "usage"
    | "defense"
  >,
  weights: number[],
) =>
  lineup.reduce(
    (sum, player, index) => sum + player[metric] * weights[index],
    0,
  );

const weightedAverage = (
  lineup: Player[],
  metric: keyof Pick<
    Player,
    | "points"
    | "rebounds"
    | "assists"
    | "steals"
    | "blocks"
    | "trueShooting"
    | "threePoint"
    | "usage"
    | "defense"
  >,
  weights: number[],
  weightSum: number,
) => (weightSum > 0 ? weightedTotal(lineup, metric, weights) / weightSum : 0);

const weightedCount = (
  lineup: Player[],
  weights: number[],
  predicate: (player: Player) => boolean,
) =>
  lineup.reduce(
    (sum, player, index) => sum + (predicate(player) ? weights[index] : 0),
    0,
  );

const buildLineupScoreBreakdown = (lineup: Player[]) => {
  const { weights, weightSum } = buildLineupWeights(lineup);

  const totals = {
    points: weightedTotal(lineup, "points", weights),
    rebounds: weightedTotal(lineup, "rebounds", weights),
    assists: weightedTotal(lineup, "assists", weights),
    steals: weightedTotal(lineup, "steals", weights),
    blocks: weightedTotal(lineup, "blocks", weights),
  };

  const averageTrueShooting = weightedAverage(
    lineup,
    "trueShooting",
    weights,
    weightSum,
  );
  const averageDefenseGradeRank =
    weightSum > 0
      ? lineup.reduce(
          (sum, player, index) =>
            sum + getPlayerDefenseGradeRank(player) * weights[index],
          0,
        ) / weightSum
      : 0;
  const averageThreePoint = weightedAverage(
    lineup,
    "threePoint",
    weights,
    weightSum,
  );
  const averageUsage = weightedAverage(lineup, "usage", weights, weightSum);

  const shooters = weightedCount(
    lineup,
    weights,
    (player) => player.threePoint >= 0.375,
  );
  const stoppers = weightedCount(lineup, weights, isPlusDefenderByGrade);
  const rimProtectors = weightedCount(
    lineup,
    weights,
    (player) =>
      player.blocks >= 1.2 || player.styles.includes("rim-protector"),
  );
  const engines = weightedCount(lineup, weights, (player) =>
    player.styles.includes("engine"),
  );
  const connectors = weightedCount(lineup, weights, (player) =>
    player.styles.includes("connector"),
  );
  const highUsagePlayers = weightedCount(
    lineup,
    weights,
    (player) => player.usage >= 30,
  );
  const lowUsagePlayers = weightedCount(
    lineup,
    weights,
    (player) => player.usage <= 22,
  );
  const positions = new Set(lineup.map((player) => player.position));

  const production =
    totals.points * 0.45 +
    totals.rebounds * 0.38 +
    totals.assists * 0.52 +
    totals.steals * 3.8 +
    totals.blocks * 3.5;

  const efficiency =
    clamp((averageTrueShooting - 0.54) * 260, 0, 34) +
    clamp((averageDefenseGradeRank - 4) * 1.75, 0, 13);

  const threePointBonus =
    clamp((averageThreePoint - 0.335) * 150, 0, 16) +
    Math.min(shooters, 4) * 2.3;

  let fit = 22;
  fit += positions.size >= 4 ? 8 : positions.size === 3 ? 4 : -4;
  fit += stoppers >= 2 ? 7 : stoppers === 1 ? 2 : -6;
  fit += rimProtectors >= 1 ? 6 : -6;
  fit += connectors >= 2 ? 6 : connectors === 1 ? 3 : -4;
  fit += shooters >= 3 ? 6 : shooters === 2 ? 3 : -4;
  fit += engines >= 1 ? 4 : -3;
  fit += lowUsagePlayers >= 1 ? 3 : -3;
  fit -= Math.max(0, highUsagePlayers - 2) * 6;
  fit -= averageUsage > 31 ? (averageUsage - 31) * 1.2 : 0;
  fit = clamp(fit, 0, 48);

  const categories: ScoreCategory[] = [
    {
      label: "Box score production",
      value: round(production),
      note: `${round(totals.points)} pts, ${round(totals.rebounds)} reb, ${round(
        totals.assists,
      )} ast plus stocks`,
    },
    {
      label: "True shooting and defense",
      value: round(efficiency),
      note: `${round(averageTrueShooting * 100, 1)}% TS, ${formatAverageDefenseGrade(
        averageDefenseGradeRank,
      )}`,
    },
    {
      label: "Three-point bonus",
      value: round(threePointBonus),
      note: `${shooters} reliable spacers, ${round(
        averageThreePoint * 100,
        1,
      )}% team 3P`,
    },
    {
      label: "Team fit",
      value: round(fit),
      note: `${positions.size} positions, ${stoppers} ${STOPPER_MINIMUM_DEFENSE_GRADE}-or-better defenders, ${rimProtectors} rim protectors`,
    },
  ];

  const strengths: string[] = [];
  const warnings: string[] = [];

  if (averageTrueShooting >= 0.61) {
    strengths.push("Elite shot quality and true shooting across the lineup.");
  }

  if (shooters >= 3) {
    strengths.push("Enough shooting to keep the floor spaced.");
  } else {
    warnings.push("Spacing is fragile; defenses can load the paint.");
  }

  if (stoppers >= 2 && rimProtectors >= 1) {
    strengths.push("Multiple plus defenders with a back-line anchor.");
  } else if (stoppers < 2) {
    warnings.push("Not enough defenders to survive elite scorers.");
  }

  if (connectors >= 2 || engines >= 1) {
    strengths.push("Creation and connective passing should travel well.");
  } else {
    warnings.push("The lineup lacks a reliable table-setter.");
  }

  if (highUsagePlayers > 2 || averageUsage > 31) {
    warnings.push("Ball-dominant stars may fight for the same touches.");
  }

  if (!hasPrimaryScorer(lineup)) {
    warnings.push(
      `No clear first option; the offense lacks a ${PRIMARY_SCORER_PPG_THRESHOLD} PPG scorer.`,
    );
  }

  if (positions.size < 4) {
    warnings.push("Positional overlap makes matchups harder to cover.");
  }

  const chemistryBonuses = getActiveChemistryBonuses(lineup);

  for (const bonus of chemistryBonuses) {
    strengths.push(`${bonus.title}: ${bonus.description}`);
  }

  const statRawTotal = round(
    categories.reduce((sum, category) => sum + category.value, 0),
  );

  return { categories, strengths, warnings, statRawTotal };
};

export const calculateLineupStatRawTotal = (lineup: Player[]) => {
  if (lineup.length === 0) {
    return 0;
  }

  return buildLineupScoreBreakdown(lineup).statRawTotal;
};

export const calculateLineupScore = (lineup: Player[]): LineupScore => {
  if (lineup.length === 0) {
    return {
      total: 0,
      preciseTotal: 0,
      projectedRecord: {
        wins: 0,
        losses: 0,
        formatted: "Record: —",
      },
      categories: [],
      strengths: [],
      warnings: ["Draft five players to unlock a matchup score."],
    };
  }

  const { categories, strengths, warnings, statRawTotal } =
    buildLineupScoreBreakdown(lineup);
  const rawTotal =
    statRawTotal +
    getLineupTierAdjustment(lineup) +
    getImpactRankingAdjustment(lineup) +
    getChemistryAdjustment(lineup) +
    getLowScoringLineupPenalty(lineup) +
    getPrimaryScorerLineupPenalty(lineup);
  const preciseTotal = preciseLineupOvr(rawTotal);
  const total = displayLineupOvr(preciseTotal);

  return {
    total,
    preciseTotal,
    projectedRecord: projectLineupRecord(lineup, preciseTotal),
    categories,
    strengths,
    warnings,
  };
};

export const resolveHeadToHeadResult = (
  userPreciseTotal: number,
  opponentPreciseTotal: number,
): HeadToHeadResult => {
  if (userPreciseTotal === opponentPreciseTotal) {
    return "tie";
  }

  return userPreciseTotal > opponentPreciseTotal ? "win" : "loss";
};

export const compareLineups = (lineupA: Player[], lineupB: Player[]) => {
  const scoreA = calculateLineupScore(lineupA);
  const scoreB = calculateLineupScore(lineupB);
  const result = resolveHeadToHeadResult(scoreA.preciseTotal, scoreB.preciseTotal);

  return {
    scoreA,
    scoreB,
    result,
    winner:
      result === "tie" ? "tie" : result === "win" ? "A" : "B",
    margin: round(Math.abs(scoreA.preciseTotal - scoreB.preciseTotal)),
  };
};
