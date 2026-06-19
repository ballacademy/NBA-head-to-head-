import type { DefenseGrade } from "./defenseRating";
import { gradeFromPercentile } from "./defenseRating";

export type { DefenseGrade } from "./defenseRating";

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
  "D-": 1,
  F: 0,
};

export const meetsMinimumDefenseGrade = (
  defense: number,
  defenseGrade: DefenseGrade | undefined,
  minimum: DefenseGrade = "B+",
) => gradeRank[getDefenseGrade(defense, defenseGrade)] >= gradeRank[minimum];

export const getDefenseGrade = (
  defense: number,
  defenseGrade?: DefenseGrade,
): DefenseGrade => {
  if (defenseGrade) {
    return defenseGrade;
  }

  const percentile = ((defense - 4) / 6) * 100;
  return gradeFromPercentile(percentile);
};

export const formatPlayerDraftStats = (player: {
  points: number;
  rebounds: number;
  blocks: number;
  steals: number;
  threePoint: number;
  trueShooting: number;
  turnovers: number;
  defense: number;
  defenseGrade?: DefenseGrade;
}) => {
  const grade = getDefenseGrade(player.defense, player.defenseGrade);
  const parts = [
    `${player.points.toFixed(1)} PTS`,
    `${player.rebounds.toFixed(1)} REB`,
    `${player.blocks.toFixed(1)} BLK`,
    `${player.steals.toFixed(1)} STL`,
    `${(player.threePoint * 100).toFixed(1)}% 3P`,
    `${(player.trueShooting * 100).toFixed(1)}% TS`,
    `${player.turnovers.toFixed(1)} TOV`,
    `${grade} DEF`,
  ];

  return {
    grade,
    parts,
    summary: parts.join(" • "),
  };
};
