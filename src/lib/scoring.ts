import type { LineupScore, Player, ProjectedRecord, ScoreCategory } from "./types";

export const SEASON_LENGTH = 82;
export const LINEUP_RAW_CEILING = 232;

const round = (value: number, places = 1) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const normalizeLineupTotal = (rawTotal: number) =>
  round(clamp((rawTotal / LINEUP_RAW_CEILING) * 100, 0, 100));

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

export const getPlayersById = (playerIds: string[], pool: Player[]) =>
  playerIds
    .map((id) => pool.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player));

export const calculateLineupScore = (lineup: Player[]): LineupScore => {
  if (lineup.length === 0) {
    return {
      total: 0,
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

  const perPlayer = (metric: keyof Pick<
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
  >) => lineup.reduce((sum, player) => sum + player[metric], 0) / lineup.length;

  const totals = {
    points: lineup.reduce((sum, player) => sum + player.points, 0),
    rebounds: lineup.reduce((sum, player) => sum + player.rebounds, 0),
    assists: lineup.reduce((sum, player) => sum + player.assists, 0),
    steals: lineup.reduce((sum, player) => sum + player.steals, 0),
    blocks: lineup.reduce((sum, player) => sum + player.blocks, 0),
  };

  const averageTrueShooting = perPlayer("trueShooting");
  const averageThreePoint = perPlayer("threePoint");
  const averageDefense = perPlayer("defense");
  const averageUsage = perPlayer("usage");

  const shooters = lineup.filter((player) => player.threePoint >= 0.375).length;
  const stoppers = lineup.filter((player) => player.defense >= 8).length;
  const rimProtectors = lineup.filter(
    (player) =>
      player.blocks >= 1.2 || player.styles.includes("rim-protector"),
  ).length;
  const engines = lineup.filter((player) => player.styles.includes("engine"));
  const connectors = lineup.filter((player) =>
    player.styles.includes("connector"),
  ).length;
  const highUsagePlayers = lineup.filter((player) => player.usage >= 30).length;
  const lowUsagePlayers = lineup.filter((player) => player.usage <= 22).length;
  const positions = new Set(lineup.map((player) => player.position));

  const production =
    totals.points * 0.45 +
    totals.rebounds * 0.38 +
    totals.assists * 0.52 +
    totals.steals * 3.8 +
    totals.blocks * 3.5;

  const efficiency =
    clamp((averageTrueShooting - 0.54) * 260, 0, 34) +
    clamp((averageDefense - 6.5) * 4.2, 0, 13);

  const threePointBonus =
    clamp((averageThreePoint - 0.335) * 150, 0, 16) +
    Math.min(shooters, 4) * 2.3;

  let fit = 22;
  fit += positions.size >= 4 ? 8 : positions.size === 3 ? 4 : -4;
  fit += stoppers >= 2 ? 7 : stoppers === 1 ? 2 : -6;
  fit += rimProtectors >= 1 ? 6 : -6;
  fit += connectors >= 2 ? 6 : connectors === 1 ? 3 : -4;
  fit += shooters >= 3 ? 6 : shooters === 2 ? 3 : -4;
  fit += engines.length >= 1 ? 4 : -3;
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
      note: `${round(averageTrueShooting * 100, 1)}% TS, ${round(
        averageDefense,
      )}/10 defense`,
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
      note: `${positions.size} positions, ${stoppers} defenders, ${rimProtectors} rim protectors`,
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

  if (connectors >= 2 || engines.length >= 1) {
    strengths.push("Creation and connective passing should travel well.");
  } else {
    warnings.push("The lineup lacks a reliable table-setter.");
  }

  if (highUsagePlayers > 2 || averageUsage > 31) {
    warnings.push("Ball-dominant stars may fight for the same touches.");
  }

  if (positions.size < 4) {
    warnings.push("Positional overlap makes matchups harder to cover.");
  }

  const rawTotal = round(categories.reduce((sum, category) => sum + category.value, 0));
  const total = normalizeLineupTotal(rawTotal);

  return {
    total,
    projectedRecord: projectRecord(total),
    categories,
    strengths,
    warnings,
  };
};

export const compareLineups = (lineupA: Player[], lineupB: Player[]) => {
  const scoreA = calculateLineupScore(lineupA);
  const scoreB = calculateLineupScore(lineupB);

  return {
    scoreA,
    scoreB,
    winner: scoreA.total >= scoreB.total ? "A" : "B",
    margin: round(Math.abs(scoreA.total - scoreB.total)),
  };
};
