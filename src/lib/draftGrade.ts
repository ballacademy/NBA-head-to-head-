import { calculateLineupStatRawTotal, normalizeLineupTotal } from "./scoring";
import { getLineupTierAdjustment } from "./lineupMatchupBonus";
import type { Player } from "./types";

export type DraftLetterGrade =
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
  | "D-"
  | "F"
  | "F-";

const gradeThresholds: Array<{ min: number; grade: DraftLetterGrade }> = [
  { min: 96, grade: "A+" },
  { min: 91, grade: "A" },
  { min: 86, grade: "A-" },
  { min: 81, grade: "B+" },
  { min: 75, grade: "B" },
  { min: 69, grade: "B-" },
  { min: 62, grade: "C+" },
  { min: 55, grade: "C" },
  { min: 48, grade: "C-" },
  { min: 40, grade: "D+" },
  { min: 32, grade: "D" },
  { min: 24, grade: "D-" },
  { min: 16, grade: "F" },
];

export const gradeFromOvr = (ovr: number): DraftLetterGrade => {
  for (const threshold of gradeThresholds) {
    if (ovr >= threshold.min) {
      return threshold.grade;
    }
  }

  return "F-";
};

export const getPickQualityEmoji = (player: Player) => {
  const soloOvr = normalizeLineupTotal(
    calculateLineupStatRawTotal([player]) + getLineupTierAdjustment([player]),
  );

  if (soloOvr >= 82) {
    return "🟩";
  }

  if (soloOvr >= 68) {
    return "🟨";
  }

  if (soloOvr >= 52) {
    return "🟧";
  }

  return "🟥";
};

export const buildDailyDraftShareText = (
  goalTitle: string,
  formattedResult: string,
  dateKey: string,
  lineup: Player[],
  percentile?: number,
) => {
  const grid = lineup.map((player) => getPickQualityEmoji(player)).join("");
  const lines = [
    `H2H Daily Draft ${dateKey}`,
    `🎯 ${goalTitle}`,
    grid,
    `📊 ${formattedResult}`,
  ];

  if (typeof percentile === "number") {
    lines.push(`📈 ${percentile}th percentile`);
  }

  lines.push("#DraftDayGM");

  return lines.join("\n");
};
