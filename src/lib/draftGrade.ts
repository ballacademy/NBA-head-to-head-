import { calculateLineupStatRawTotal, normalizeLineupTotal } from "./scoring";
import { getLineupTierAdjustment } from "./lineupMatchupBonus";
import type { LineupScore, Player } from "./types";

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

const average = (values: number[]) =>
  values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

const countShooters = (lineup: Player[]) =>
  lineup.filter((player) => player.threePoint >= 0.375).length;

const countHighUsage = (lineup: Player[]) =>
  lineup.filter((player) => player.usage >= 30).length;

const countBigs = (lineup: Player[]) =>
  lineup.filter(
    (player) => player.position === "PF" || player.position === "C",
  ).length;

interface RoastContext {
  ovr: number;
  grade: DraftLetterGrade;
  score: LineupScore;
  lineup: Player[];
  avgThreePoint: number;
  avgUsage: number;
  shooters: number;
  highUsage: number;
  bigs: number;
}

const roastPools: Record<string, string[]> = {
  spacing: [
    "This team has zero spacing and three guys who think they're the main character.",
    "Defenses are going to pack the paint and laugh. Bring a compass for all the midrange twos.",
    "You built a lineup that clogs the lane like rush-hour traffic.",
  ],
  usage: [
    "Ball-dominant overload. Someone is finishing this game with zero assists and a grudge.",
    "Five players, one basketball, and absolutely no interest in sharing.",
    "This roster has more usage conflicts than a group chat after a bad trade.",
  ],
  defense: [
    "The other team might score 150 without breaking a sweat.",
    "You drafted a welcome mat and called it a defensive identity.",
    "Opposing stars are booking extra luggage for all the points they're about to score.",
  ],
  balanced: [
    "Solid construction. Boring at parties, dangerous on the court.",
    "This lineup actually makes sense. Suspicious.",
    "Competent roster. You might accidentally win something.",
  ],
  elite: [
    "Elite on paper. Championship parades are typing…",
    "This is disgustingly talented. Vegas just filed a complaint.",
    "A+ energy. The league office is investigating your draft luck.",
  ],
  disaster: [
    "Play-in tournament? This team is fighting for the lottery.",
    "Bold strategy drafting five guys who hate each other positionally.",
    "This lineup screams 'we ran out of time on the clock.'",
  ],
};

const pickRoast = (pool: string[], lineup: Player[]) => {
  const seed = lineup.reduce(
    (sum, player) => sum + player.name.length + player.points,
    0,
  );

  return pool[seed % pool.length]!;
};

export const buildRoastSummary = ({
  ovr,
  grade,
  score,
  lineup,
  avgThreePoint,
  avgUsage,
  shooters,
  highUsage,
  bigs,
}: RoastContext) => {
  if (ovr >= 92) {
    return pickRoast(roastPools.elite, lineup);
  }

  if (ovr <= 35) {
    return pickRoast(roastPools.disaster, lineup);
  }

  if (shooters <= 1 || avgThreePoint < 0.33) {
    return pickRoast(roastPools.spacing, lineup);
  }

  if (highUsage >= 3 || avgUsage > 31) {
    return pickRoast(roastPools.usage, lineup);
  }

  if (
    score.warnings.some((warning) => warning.toLowerCase().includes("defender"))
  ) {
    return pickRoast(roastPools.defense, lineup);
  }

  if (bigs >= 4) {
    return "Five bigs and a prayer. Rebounds for days, spacing for never.";
  }

  return pickRoast(roastPools.balanced, lineup);
};

export const buildDraftGradeReport = (lineup: Player[], score: LineupScore) => {
  const ovr = score.total;
  const grade = gradeFromOvr(ovr);
  const avgThreePoint = average(lineup.map((player) => player.threePoint));
  const avgUsage = average(lineup.map((player) => player.usage));
  const shooters = countShooters(lineup);
  const highUsage = countHighUsage(lineup);
  const bigs = countBigs(lineup);
  const roast = buildRoastSummary({
    ovr,
    grade,
    score,
    lineup,
    avgThreePoint,
    avgUsage,
    shooters,
    highUsage,
    bigs,
  });

  return {
    ovr,
    grade,
    roast,
    projectedRecord: score.projectedRecord.formatted,
  };
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
  lineup: Player[],
  projectedWins: number,
  dateKey: string,
  percentile?: number,
) => {
  const grid = lineup.map((player) => getPickQualityEmoji(player)).join("");
  const lines = [
    `H2H Daily Draft ${dateKey}`,
    grid,
    `📊 ${projectedWins} projected wins`,
  ];

  if (typeof percentile === "number") {
    lines.push(`📈 ${percentile}th percentile`);
  }

  lines.push("#NBAHeadToHead");

  return lines.join("\n");
};
