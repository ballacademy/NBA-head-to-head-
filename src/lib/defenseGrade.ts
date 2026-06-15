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

const gradeThresholds: Array<{ min: number; grade: DefenseGrade }> = [
  { min: 9.2, grade: "A+" },
  { min: 8.8, grade: "A" },
  { min: 8.4, grade: "A-" },
  { min: 8.0, grade: "B+" },
  { min: 7.5, grade: "B" },
  { min: 7.0, grade: "B-" },
  { min: 6.5, grade: "C+" },
  { min: 6.0, grade: "C" },
  { min: 5.5, grade: "C-" },
  { min: 5.0, grade: "D+" },
  { min: 4.5, grade: "D" },
];

export const getDefenseGrade = (defense: number): DefenseGrade => {
  for (const threshold of gradeThresholds) {
    if (defense >= threshold.min) {
      return threshold.grade;
    }
  }

  return "F";
};

export const formatPlayerDraftStats = (player: {
  points: number;
  rebounds: number;
  blocks: number;
  steals: number;
  trueShooting: number;
  defense: number;
}) => {
  const grade = getDefenseGrade(player.defense);

  return {
    grade,
    summary: `${player.points.toFixed(1)} PTS • ${player.rebounds.toFixed(1)} REB • ${player.blocks.toFixed(1)} BLK • ${player.steals.toFixed(1)} STL • ${(player.trueShooting * 100).toFixed(1)}% TS • ${grade} DEF`,
  };
};
