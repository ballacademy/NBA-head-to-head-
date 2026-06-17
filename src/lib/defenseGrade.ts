import type { DefenseGrade } from "./defenseRating";
import { gradeFromPercentile } from "./defenseRating";

export type { DefenseGrade } from "./defenseRating";

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

  return {
    grade,
    summary: `${player.points.toFixed(1)} PTS • ${player.rebounds.toFixed(1)} REB • ${player.blocks.toFixed(1)} BLK • ${player.steals.toFixed(1)} STL • ${(player.threePoint * 100).toFixed(1)}% 3P • ${(player.trueShooting * 100).toFixed(1)}% TS • ${grade} DEF • ${player.turnovers.toFixed(1)} TOV`,
  };
};
