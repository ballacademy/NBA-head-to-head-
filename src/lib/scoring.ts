import type { LineupScore, Player, ProjectedRecord, ScoreCategory } from "./types";
import {
  isAllStarPlayer,
  isSuperstarPlayer,
} from "./allStars";
import { getChemistryAdjustment, getActiveChemistryBonuses } from "./chemistry";
import {
  formatAverageDefenseGrade,
  getPlayerDefenseGradeRank,
} from "./defenseGrade";
import {
  getImpactRankingAdjustment,
  getLineupBestImpactRank,
  getMidTierImpactLineupPenalty,
  getThinImpactLineupPenalty,
  isImpactRankStarPlayer,
} from "./impactRanking";
import { getLineupTierAdjustment } from "./lineupMatchupBonus";
import { getSoloStarElevationPenalty } from "./lineupSoloStar";
import type { HeadToHeadResult } from "./playerRecord";
import { getPlayerStatWeight } from "./sampleSize";
import {
  blendProjectedWinsWithTeamAnchor,
  getLineupTeamQualityRawAdjustment,
  getSameTeamRecordAnchor,
} from "./teamRecordBaseline";
import {
  buildLineupShootingProfile,
  formatLineupShootingNote,
  hasReliableLineupSpacing,
  scoreLineupThreePointBonus,
} from "./lineupShooting";
import {
  buildLineupRoleFitProfile,
  formatLineupRoleFitNote,
  hasEliteLineupCreation,
  hasLineupCreation,
  hasLineupFrontcourt,
  hasNoCenter,
  hasTooManyCenters,
  scoreLineupRoleFit,
} from "./lineupRoleFit";
import { buildLineupScorePipeline } from "./scoring/lineupScorePipeline";

export type { LineupScoreLayer, LineupScoreModifiers, LineupScorePipelineResult } from "./scoring/lineupScorePipeline";
export { buildLineupScorePipeline, computeLineupScoreLayers } from "./scoring/lineupScorePipeline";

export interface LineupScoreBreakdown {
  categories: ScoreCategory[];
  strengths: string[];
  warnings: string[];
  statRawTotal: number;
  productionScore: number;
  totalPoints: number;
}

export const LOW_SCORING_PPG_THRESHOLD = 6;
export const LOW_SCORING_IMPACT_WEIGHT = 0.05;
export const LOW_SCORING_LINEUP_PENALTY = -7;
/** Below this PPG, low-scoring severity is fully on (before defense mitigation). */
export const LOW_SCORING_SEVERITY_FULL_PPG = 3.5;
/** At/above this PPG, low-scoring severity is fully off. */
export const LOW_SCORING_SEVERITY_CLEAR_PPG = 10;
export const PRIMARY_SCORER_PPG_THRESHOLD = 20;
export const PRIMARY_SCORER_LINEUP_PENALTY = -5;
export const LINEUP_FIRST_OPTION_PPG_THRESHOLD = 18;
export const STAR_SCORER_PPG_THRESHOLD = 22;
export const TEAM_FIT_CAP_WITHOUT_FIRST_OPTION = 34;
export const TEAM_FIT_CAP_WITHOUT_STAR_SCORER = 40;
export const TEAM_FIT_CAP_FULL = 48;
export const NO_TRUE_STAR_LINEUP_PENALTY = -8;
export const ELITE_OFFENSE_PRODUCTION_THRESHOLD = 110;
export const ELITE_OFFENSE_TOTAL_PPG_THRESHOLD = 120;
export const ELITE_OFFENSE_LINEUP_BONUS = 10;
export const SUPERSTAR_STACKING_MIN_COUNT = 2;
export const SUPERSTAR_STACKING_LINEUP_BONUS = 8;
export const OFFENSE_FLOOR_BASE_PENALTY = -4;
export const OFFENSE_FLOOR_LOW_MAX_PPG_THRESHOLD = 16;
export const OFFENSE_FLOOR_LOW_MAX_PPG_PENALTY = -3;
export const OFFENSE_FLOOR_LOW_TOTAL_PPG_THRESHOLD = 58;
export const OFFENSE_FLOOR_LOW_TOTAL_PPG_PENALTY = -3;
export const STOPPER_MINIMUM_DEFENSE_GRADE = "B" as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (from: number, to: number, t: number) =>
  from + (to - from) * clamp01(t);
const smoothUnit = (value: number, lo: number, hi: number) => {
  if (hi <= lo) {
    return value >= hi ? 1 : 0;
  }
  return clamp01((value - lo) / (hi - lo));
};

/**
 * 0 = healthy scorer / fully mitigated, 1 = very low usage scorer with weak D.
 * Defense softens (does not binary-exempt) the severity.
 */
export const getLowScoringSeverity = (player: Player) => {
  const scoringSeverity =
    1 -
    smoothUnit(
      player.points,
      LOW_SCORING_SEVERITY_FULL_PPG,
      LOW_SCORING_SEVERITY_CLEAR_PPG,
    );

  if (scoringSeverity <= 0) {
    return 0;
  }

  // Rank 0 (F) → no mitigation; rank 7 (B-) starts helping; rank 10 (A-) ≈ full.
  const defenseRank = getPlayerDefenseGradeRank(player);
  const defenseMitigation = smoothUnit(defenseRank, 7, 10);
  return scoringSeverity * (1 - defenseMitigation * 0.95);
};

/** @deprecated Prefer getLowScoringSeverity — kept for call sites / tests. */
export const isLowScoringNonEliteDefender = (player: Player) =>
  getLowScoringSeverity(player) >= 0.45;

export const getPlayerLowScoringPenalty = (player: Player) =>
  LOW_SCORING_LINEUP_PENALTY * getLowScoringSeverity(player);

export const getLowScoringLineupPenalty = (lineup: Player[]) =>
  lineup.reduce(
    (penalty, player) => penalty + getPlayerLowScoringPenalty(player),
    0,
  );

export const getLineupMaxPoints = (lineup: Player[]) =>
  lineup.length === 0 ? 0 : Math.max(...lineup.map((player) => player.points));

/** 0–1 how clearly the lineup has an 18+ first option. */
export const getFirstOptionStrength = (lineup: Player[]) =>
  smoothUnit(getLineupMaxPoints(lineup), 14, 18);

/** 0–1 volume-star strength around the 22 PPG band. */
export const getStarScorerStrength = (lineup: Player[]) =>
  smoothUnit(getLineupMaxPoints(lineup), 19, 22);

export const hasPrimaryScorer = (lineup: Player[]) =>
  lineup.some((player) => player.points >= PRIMARY_SCORER_PPG_THRESHOLD);

export const hasLineupFirstOption = (lineup: Player[]) =>
  lineup.some((player) => player.points >= LINEUP_FIRST_OPTION_PPG_THRESHOLD);

export const hasStarScorer = (lineup: Player[]) =>
  lineup.some((player) => player.points >= STAR_SCORER_PPG_THRESHOLD);

/**
 * True-star anchors for no-star / fit caps: current All-Stars, superstars,
 * or top-30 impact. Recent All-Stars outside that impact band no longer clear.
 * Volume scorers (≥22 PPG) still clear via hasStarScorer.
 */
export const isTrueStarAnchorPlayer = (player: Player) =>
  isSuperstarPlayer(player) ||
  isAllStarPlayer(player) ||
  isImpactRankStarPlayer(player);

export const hasStarTierPlayer = (lineup: Player[]) =>
  lineup.some((player) => isTrueStarAnchorPlayer(player));

export const getTrueStarAnchorStrength = (lineup: Player[]) => {
  if (hasStarTierPlayer(lineup)) {
    return 1;
  }

  return getStarScorerStrength(lineup);
};

export const hasTrueStarAnchor = (lineup: Player[]) =>
  hasStarScorer(lineup) || hasStarTierPlayer(lineup);

export const getLineupTopScoringAverage = (lineup: Player[]) => {
  if (lineup.length === 0) {
    return 0;
  }

  const sorted = [...lineup].sort((left, right) => right.points - left.points);
  const topScorers = sorted.slice(0, Math.min(2, sorted.length));

  return (
    topScorers.reduce((sum, player) => sum + player.points, 0) /
    topScorers.length
  );
};

/**
 * Soft primary-scorer ding for soft secondary-lead bands below 20 PPG.
 * Ramps in from 16→18, holds through the high teens, clears into 20–21.
 */
export const getPrimaryScorerLineupPenalty = (lineup: Player[]) => {
  const maxPoints = getLineupMaxPoints(lineup);
  if (maxPoints <= 0 || maxPoints >= 21) {
    return 0;
  }

  if (maxPoints < 16) {
    return 0;
  }

  const enter = smoothUnit(maxPoints, 16, 18);
  const clear = smoothUnit(maxPoints, 19.75, 21);
  return PRIMARY_SCORER_LINEUP_PENALTY * enter * (1 - clear);
};

export const getLineupOffenseFloorPenalty = (lineup: Player[]) => {
  if (lineup.length === 0) {
    return 0;
  }

  const firstOptionStrength = getFirstOptionStrength(lineup);
  if (firstOptionStrength >= 1) {
    return 0;
  }

  const maxPoints = getLineupMaxPoints(lineup);
  const totalPoints = lineup.reduce((sum, player) => sum + player.points, 0);

  let penalty = OFFENSE_FLOOR_BASE_PENALTY * (1 - firstOptionStrength);
  penalty +=
    OFFENSE_FLOOR_LOW_MAX_PPG_PENALTY *
    (1 - smoothUnit(maxPoints, 12, OFFENSE_FLOOR_LOW_MAX_PPG_THRESHOLD));
  penalty +=
    OFFENSE_FLOOR_LOW_TOTAL_PPG_PENALTY *
    (1 -
      smoothUnit(
        totalPoints,
        OFFENSE_FLOOR_LOW_TOTAL_PPG_THRESHOLD - 12,
        OFFENSE_FLOOR_LOW_TOTAL_PPG_THRESHOLD + 6,
      ));

  return penalty;
};

export const getNoTrueStarLineupPenalty = (lineup: Player[]) =>
  NO_TRUE_STAR_LINEUP_PENALTY * (1 - getTrueStarAnchorStrength(lineup));

export const countSuperstars = (lineup: Player[]) =>
  lineup.filter(isSuperstarPlayer).length;

export const getSuperstarStackingLineupBonus = (lineup: Player[]) => {
  const count = countSuperstars(lineup);
  if (count <= 0) {
    return 0;
  }

  // Soft ramp: 1 superstar → partial, 2+ → full.
  return SUPERSTAR_STACKING_LINEUP_BONUS * clamp01(count / SUPERSTAR_STACKING_MIN_COUNT);
};

export const getEliteOffenseLineupBonus = (
  productionScore: number,
  totalPoints: number,
) => {
  const productionFactor = smoothUnit(
    productionScore,
    ELITE_OFFENSE_PRODUCTION_THRESHOLD - 15,
    ELITE_OFFENSE_PRODUCTION_THRESHOLD + 10,
  );
  const pointsFactor = smoothUnit(
    totalPoints,
    ELITE_OFFENSE_TOTAL_PPG_THRESHOLD - 15,
    ELITE_OFFENSE_TOTAL_PPG_THRESHOLD + 10,
  );
  return ELITE_OFFENSE_LINEUP_BONUS * Math.max(productionFactor, pointsFactor);
};

export const capLineupRoleFitForOffense = (
  lineup: Player[],
  roleFitScore: number,
) => {
  const firstOptionStrength = getFirstOptionStrength(lineup);
  const starStrength = getTrueStarAnchorStrength(lineup);

  // Soft caps: weak offense → toward 34; mid → toward 40; anchored → full 48.
  const midCap = lerp(
    TEAM_FIT_CAP_WITHOUT_FIRST_OPTION,
    TEAM_FIT_CAP_WITHOUT_STAR_SCORER,
    firstOptionStrength,
  );
  const effectiveCap = lerp(midCap, TEAM_FIT_CAP_FULL, starStrength);

  return Math.min(roleFitScore, effectiveCap);
};

/** @deprecated Use capLineupRoleFitForOffense */
export const capLineupRoleFitWithoutFirstOption = capLineupRoleFitForOffense;

/** Gradual stopper factor from defense grade (0 at weak D, 1 near B+/A-). */
export const getStopperGradeFactor = (player: Player) => {
  const rank = getPlayerDefenseGradeRank(player);
  // C- (4) → 0, B (8) → ~0.8, B+ (9) → 1
  return smoothUnit(rank, 4, 9);
};

export const isPlusDefenderByGrade = (player: Player) =>
  getStopperGradeFactor(player) >= 0.75;

/** Soft high-usage contribution (rises through the high-20s into 32+). */
export const getHighUsageFactor = (player: Player) =>
  smoothUnit(player.usage, 26, 32);

/** Soft low-usage / spacer contribution. */
export const getLowUsageFactor = (player: Player) =>
  1 - smoothUnit(player.usage, 16, 24);

/** Soft rim-protection contribution from blocks, style, and elite frontcourt D. */
export const getRimProtectorFactor = (player: Player) => {
  if (player.styles.includes("rim-protector")) {
    return 1;
  }

  const blockFactor = smoothUnit(player.blocks, 0.55, 1.45);
  const isFrontcourt = player.positions.some(
    (position) => position === "C" || position === "PF" || position === "SF",
  );

  if (!isFrontcourt) {
    return blockFactor;
  }

  // Elite frontcourt defenders protect the paint beyond raw block rate
  // (Giannis, Bam, etc.). Grade carries most of the weight; blocks help.
  const defenseRank = getPlayerDefenseGradeRank(player);
  const gradeFactor = smoothUnit(defenseRank, 8, 11); // B → A
  const blockBoost = smoothUnit(player.blocks, 0.35, 1.2);
  const paintPresence = lerp(gradeFactor * 0.6, 1, blockBoost);

  return Math.max(blockFactor, paintPresence);
};

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

/** OVR before the 100 cap — used to show how far a maxed lineup cleared 100. */
export const uncappedLineupOvr = (rawTotal: number) =>
  (rawTotal / LINEUP_RAW_CEILING) * 100;

export const lineupOvrOverflow = (uncappedTotal: number) =>
  Math.max(0, Math.round(uncappedTotal - 100));

export const formatLineupOvrDisplay = (
  score: Pick<LineupScore, "total" | "ovrOverflow">,
) =>
  score.ovrOverflow > 0 ? `${score.total} (+${score.ovrOverflow})` : `${score.total}`;

export const formatLineupOvrLabel = (
  score: Pick<LineupScore, "ovrOverflow">,
) => (score.ovrOverflow > 0 ? `OVR (+${score.ovrOverflow})` : "OVR");

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
/** Steeper than linear below 80 OVR so weak fives fall into the teens faster. */
export const LOW_OVR_CURVE_POWER = 1.85;

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
  const severity = getLowScoringSeverity(player);
  const lowScoringFactor = lerp(1, LOW_SCORING_IMPACT_WEIGHT, severity);
  return sampleWeight * lowScoringFactor;
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

const buildLineupScoreBreakdown = (lineup: Player[]): LineupScoreBreakdown => {
  const { weights, weightSum } = buildLineupWeights(lineup);
  const usageWeights = lineup.map(
    (player, index) => weights[index] * Math.max(player.usage, 8),
  );
  const usageWeightSum = usageWeights.reduce((sum, weight) => sum + weight, 0);

  const totals = {
    points: weightedTotal(lineup, "points", weights),
    rebounds: weightedTotal(lineup, "rebounds", weights),
    assists: weightedTotal(lineup, "assists", weights),
    steals: weightedTotal(lineup, "steals", weights),
    blocks: weightedTotal(lineup, "blocks", weights),
  };

  // Usage-weight TS so low-usage bench efficiency cannot dominate.
  const averageTrueShooting = weightedAverage(
    lineup,
    "trueShooting",
    usageWeights,
    usageWeightSum,
  );
  const averageDefenseGradeRank =
    weightSum > 0
      ? lineup.reduce(
          (sum, player, index) =>
            sum + getPlayerDefenseGradeRank(player) * weights[index],
          0,
        ) / weightSum
      : 0;
  const averageUsage = weightedAverage(lineup, "usage", weights, weightSum);

  const stoppers = lineup.reduce(
    (sum, player, index) =>
      sum + weights[index] * getStopperGradeFactor(player),
    0,
  );
  const rimProtectors = lineup.reduce(
    (sum, player, index) =>
      sum + weights[index] * getRimProtectorFactor(player),
    0,
  );
  const engines = weightedCount(lineup, weights, (player) =>
    player.styles.includes("engine"),
  );
  const connectors = weightedCount(lineup, weights, (player) =>
    player.styles.includes("connector"),
  );
  const highUsagePlayers = lineup.reduce(
    (sum, player, index) =>
      sum + weights[index] * getHighUsageFactor(player),
    0,
  );
  const lowUsagePlayers = lineup.reduce(
    (sum, player, index) =>
      sum + weights[index] * getLowUsageFactor(player),
    0,
  );

  // Usage-weight spacing so low-usage specialists don't max the 3P category.
  const shootingProfile = buildLineupShootingProfile(
    lineup,
    usageWeights,
    usageWeightSum,
  );
  const roleFitProfile = buildLineupRoleFitProfile(
    lineup,
    weights,
    { assists: totals.assists },
    {
      stoppers,
      rimProtectors,
      engines,
      connectors,
      highUsagePlayers,
      lowUsagePlayers,
    },
  );

  const production =
    totals.points * 0.45 +
    totals.rebounds * 0.38 +
    totals.assists * 0.52 +
    totals.steals * 3.8 +
    totals.blocks * 3.5;

  const efficiency =
    clamp((averageTrueShooting - 0.54) * 260, 0, 34) +
    clamp((averageDefenseGradeRank - 4) * 1.75, 0, 13);

  const threePointBonus = scoreLineupThreePointBonus(shootingProfile);

  const fit = capLineupRoleFitForOffense(
    lineup,
    scoreLineupRoleFit(roleFitProfile, { assists: totals.assists }),
  );

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
      note: formatLineupShootingNote(shootingProfile),
    },
    {
      label: "Team fit",
      value: round(fit),
      note: formatLineupRoleFitNote(roleFitProfile, STOPPER_MINIMUM_DEFENSE_GRADE),
    },
  ];

  const strengths: string[] = [];
  const warnings: string[] = [];

  if (averageTrueShooting >= 0.61) {
    strengths.push("Elite shot quality and true shooting across the lineup.");
  }

  if (hasReliableLineupSpacing(shootingProfile)) {
    strengths.push("Enough shooting to keep the floor spaced.");
  } else {
    warnings.push("Spacing is fragile; defenses can load the paint.");
  }

  if (stoppers >= 2 && rimProtectors >= 1) {
    strengths.push("Multiple plus defenders with a back-line anchor.");
  } else if (stoppers < 2) {
    warnings.push("Not enough defenders to survive elite scorers.");
  }

  if (hasLineupCreation(roleFitProfile, { assists: totals.assists })) {
    strengths.push("Creation and connective passing should travel well.");
  } else {
    warnings.push("The lineup lacks a reliable table-setter.");
  }

  const eliteCreation = hasEliteLineupCreation(roleFitProfile, {
    assists: totals.assists,
  });

  if (
    (highUsagePlayers > 2 || averageUsage > 31) &&
    !eliteCreation
  ) {
    warnings.push("Ball-dominant stars may fight for the same touches.");
  } else if (eliteCreation && highUsagePlayers >= 2) {
    strengths.push("Elite playmaking supports multiple high-usage creators.");
  }

  if (!hasPrimaryScorer(lineup)) {
    warnings.push(
      `No clear first option; the offense lacks a ${PRIMARY_SCORER_PPG_THRESHOLD} PPG scorer.`,
    );
  }

  if (!hasLineupFirstOption(lineup)) {
    warnings.push(
      `No go-to scorer; nobody in the lineup reaches ${LINEUP_FIRST_OPTION_PPG_THRESHOLD} PPG.`,
    );
  } else if (!hasTrueStarAnchor(lineup)) {
    warnings.push(
      `No true star; nobody reaches ${STAR_SCORER_PPG_THRESHOLD} PPG and the lineup lacks an All-Star or superstar.`,
    );
  }

  if (getMidTierImpactLineupPenalty(lineup) < 0) {
    const best = getLineupBestImpactRank(lineup);
    warnings.push(
      best != null && best <= 50
        ? "Impact depth is soft; a lone top-50 piece is not enough elite support."
        : "Impact profile is mid-tier; the lineup lacks a top-50 impact anchor.",
    );
  }

  if (getThinImpactLineupPenalty(lineup) < 0) {
    warnings.push(
      "Impact depth is thin; the lineup leans too hard on one ranked piece.",
    );
  }

  if (getSoloStarElevationPenalty(lineup) < -0.25) {
    warnings.push(
      "The lone star is not a playmaker; creation does not elevate the supporting cast.",
    );
  }

  if (hasNoCenter(roleFitProfile)) {
    warnings.push("No true center makes rebounding and interior size harder.");
  } else if (hasTooManyCenters(roleFitProfile)) {
    warnings.push("Too many centers clog the floor and limit spacing.");
  } else if (!hasLineupFrontcourt(roleFitProfile)) {
    warnings.push("The frontcourt is too thin to hold up across matchups.");
  }

  const chemistryBonuses = getActiveChemistryBonuses(lineup);

  for (const bonus of chemistryBonuses) {
    strengths.push(`${bonus.title}: ${bonus.description}`);
  }

  const statRawTotal = round(
    categories.reduce((sum, category) => sum + category.value, 0),
  );
  const totalPoints = lineup.reduce((sum, player) => sum + player.points, 0);

  return {
    categories,
    strengths,
    warnings,
    statRawTotal,
    productionScore: production,
    totalPoints,
  };
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
      uncappedTotal: 0,
      ovrOverflow: 0,
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

  const { categories, strengths, warnings, statRawTotal, productionScore, totalPoints } =
    buildLineupScoreBreakdown(lineup);
  const modifiers = {
    tierAdjustment: getLineupTierAdjustment(lineup),
    impactBlend: getImpactRankingAdjustment(lineup),
    chemistry: getChemistryAdjustment(lineup),
    teamQuality: getLineupTeamQualityRawAdjustment(lineup),
    lowScoringPenalty: getLowScoringLineupPenalty(lineup),
    primaryScorerPenalty: getPrimaryScorerLineupPenalty(lineup),
    offenseFloorPenalty: getLineupOffenseFloorPenalty(lineup),
    noStarPenalty: getNoTrueStarLineupPenalty(lineup),
    midTierImpactPenalty: getMidTierImpactLineupPenalty(lineup),
    thinImpactPenalty: getThinImpactLineupPenalty(lineup),
    soloStarElevationPenalty: getSoloStarElevationPenalty(lineup),
    eliteOffenseBonus: getEliteOffenseLineupBonus(productionScore, totalPoints),
    superstarStackBonus: getSuperstarStackingLineupBonus(lineup),
  };
  const pipeline = buildLineupScorePipeline(
    { categories, strengths, warnings, statRawTotal, productionScore, totalPoints },
    modifiers,
  );
  const rawTotal = pipeline.rawTotal;
  const uncappedTotal = uncappedLineupOvr(rawTotal);
  const preciseTotal = preciseLineupOvr(rawTotal);
  const total = displayLineupOvr(preciseTotal);
  const ovrOverflow = lineupOvrOverflow(uncappedTotal);

  return {
    total,
    preciseTotal,
    uncappedTotal,
    ovrOverflow,
    projectedRecord: projectLineupRecord(lineup, preciseTotal),
    categories,
    strengths,
    warnings,
  };
};

const ensureContextSentence = (text: string) => {
  const trimmed = text.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return trimmed;
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

/** Two short sentences explaining a lineup's OVR (strength + hole when available). */
export const buildLineupScoreContext = (score: LineupScore): string => {
  const strength = score.strengths[0];
  const warning = score.warnings[0];
  const first =
    strength ??
    warning ??
    "This five has no single defining trait on paper";
  const second =
    (strength ? warning : score.warnings[1]) ??
    score.strengths[1] ??
    (strength
      ? "The rest of the construction is steady without a major red flag"
      : "Matchup luck and execution will decide how far it travels");

  const firstSentence = ensureContextSentence(first);
  const secondSentence = ensureContextSentence(second);

  if (firstSentence === secondSentence) {
    return `${firstSentence} Overall the OVR reflects a tightly contested construction.`;
  }

  return `${firstSentence} ${secondSentence}`;
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
