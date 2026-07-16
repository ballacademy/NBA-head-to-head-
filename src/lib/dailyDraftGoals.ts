import type { DailyDraftMode } from "./dailyDraftMode";

export type DailyGoalDirection = "higher" | "lower";

export type BasicDailyGoalStat =
  | "threePoint"
  | "trueShooting"
  | "rebounds"
  | "assists"
  | "turnovers"
  | "steals"
  | "blocks"
  | "points"
  | "heightInches"
  | "age"
  | "minutes"
  | "usage"
  | "defense"
  | "fieldGoalsAttempted"
  | "threePointersAttempted"
  | "stocks"
  | "gamesPlayed"
  | "personalFouls"
  | "freeThrowsAttempted"
  | "midrangeAttempts"
  | "boxPlus";

export type AdvancedDailyGoalStat =
  | "pointsPerMinute"
  | "assistsPerMinute"
  | "reboundsPerMinute"
  | "stealsPerMinute"
  | "blocksPerMinute"
  | "stocksPerMinute"
  | "turnoversPerMinute"
  | "assistToTurnoverRatio"
  | "threePointAttemptShare"
  | "threePointersAttemptedPerMinute"
  | "fieldGoalsAttemptedPerMinute"
  | "trueShooting"
  | "creationRate"
  | "whistleRate"
  | "highEventRate";

export type DailyGoalStat = BasicDailyGoalStat | AdvancedDailyGoalStat;

export type DailyGoalAggregation = "weightedRate" | "average";

export interface DailyDraftGoal {
  id: string;
  title: string;
  description: string;
  direction: DailyGoalDirection;
  aggregation: DailyGoalAggregation;
  stat: DailyGoalStat;
  mode: DailyDraftMode;
}

type DailyDraftGoalDefinition = Omit<DailyDraftGoal, "mode">;

const attachDailyDraftMode = (
  goals: DailyDraftGoalDefinition[],
  mode: DailyDraftMode,
): DailyDraftGoal[] => goals.map((goal) => ({ ...goal, mode }));

const BASIC_DAILY_DRAFT_GOAL_DEFINITIONS: DailyDraftGoalDefinition[] = [
  {
    id: "splash-zone",
    title: "Splash Zone",
    description: "Draft the lineup with the highest weighted three-point percentage.",
    direction: "higher",
    aggregation: "weightedRate",
    stat: "threePoint",
  },
  {
    id: "brick-city",
    title: "Brick City",
    description: "Draft the lineup with the lowest weighted three-point percentage.",
    direction: "lower",
    aggregation: "weightedRate",
    stat: "threePoint",
  },
  {
    id: "ultra-efficient",
    title: "Ultra Efficient",
    description: "Draft the lineup with the highest weighted true shooting.",
    direction: "higher",
    aggregation: "weightedRate",
    stat: "trueShooting",
  },
  {
    id: "glass-gang",
    title: "Glass Gang",
    description: "Draft the lineup with the highest average rebounds.",
    direction: "higher",
    aggregation: "average",
    stat: "rebounds",
  },
  {
    id: "ball-movers",
    title: "Ball Movers",
    description: "Draft the lineup with the highest average assists.",
    direction: "higher",
    aggregation: "average",
    stat: "assists",
  },
  {
    id: "live-ball-turnovers",
    title: "Chaos Crew",
    description: "Draft the lineup with the highest average turnovers.",
    direction: "higher",
    aggregation: "average",
    stat: "turnovers",
  },
  {
    id: "careful-hands",
    title: "Careful Hands",
    description: "Draft the lineup with the lowest average turnovers.",
    direction: "lower",
    aggregation: "average",
    stat: "turnovers",
  },
  {
    id: "pickpocket-crew",
    title: "Pickpocket Crew",
    description: "Draft the lineup with the highest average steals.",
    direction: "higher",
    aggregation: "average",
    stat: "steals",
  },
  {
    id: "wall-of-flesh",
    title: "Wall of Flesh",
    description: "Draft the lineup with the highest average blocks.",
    direction: "higher",
    aggregation: "average",
    stat: "blocks",
  },
  {
    id: "bucket-getters",
    title: "Bucket Getters",
    description: "Draft the lineup with the highest average points.",
    direction: "higher",
    aggregation: "average",
    stat: "points",
  },
  {
    id: "usage-hogs",
    title: "Usage Hogs",
    description: "Draft the lineup with the highest average usage.",
    direction: "higher",
    aggregation: "average",
    stat: "usage",
  },
  {
    id: "workhorses",
    title: "Workhorses",
    description: "Draft the lineup with the highest average minutes.",
    direction: "higher",
    aggregation: "average",
    stat: "minutes",
  },
  {
    id: "train-wreck",
    title: "Train Wreck Efficiency",
    description: "Draft the lineup with the lowest weighted true shooting.",
    direction: "lower",
    aggregation: "weightedRate",
    stat: "trueShooting",
  },
  {
    id: "low-usage-club",
    title: "Low Usage Club",
    description: "Draft the lineup with the lowest average usage.",
    direction: "lower",
    aggregation: "average",
    stat: "usage",
  },
  {
    id: "volume-shooter",
    title: "Volume Shooter",
    description: "Draft the lineup with the highest average field goal attempts.",
    direction: "higher",
    aggregation: "average",
    stat: "fieldGoalsAttempted",
  },
  {
    id: "deep-volume",
    title: "Deep Volume",
    description: "Draft the lineup with the highest average three-point attempts.",
    direction: "higher",
    aggregation: "average",
    stat: "threePointersAttempted",
  },
  {
    id: "stocks-market",
    title: "Stocks Market",
    description: "Draft the lineup with the highest average steals plus blocks.",
    direction: "higher",
    aggregation: "average",
    stat: "stocks",
  },
  {
    id: "iron-men",
    title: "Iron Men",
    description: "Draft the lineup with the highest average games played.",
    direction: "higher",
    aggregation: "average",
    stat: "gamesPlayed",
  },
  {
    id: "bench-mob",
    title: "Bench Mob",
    description: "Draft the lineup with the lowest average minutes.",
    direction: "lower",
    aggregation: "average",
    stat: "minutes",
  },
  {
    id: "foul-trouble",
    title: "Foul Trouble",
    description: "Draft the lineup with the highest average personal fouls.",
    direction: "higher",
    aggregation: "average",
    stat: "personalFouls",
  },
  {
    id: "free-throw-merchants",
    title: "Free Throw Merchants",
    description: "Draft the lineup with the highest average free throw attempts.",
    direction: "higher",
    aggregation: "average",
    stat: "freeThrowsAttempted",
  },
  {
    id: "midrange-museum",
    title: "Midrange Museum",
    description:
      "Draft the lineup with the highest average two-point field goal attempts.",
    direction: "higher",
    aggregation: "average",
    stat: "midrangeAttempts",
  },
  {
    id: "plus-factory",
    title: "Plus Factory",
    description:
      "Draft the lineup with the highest average box-score surplus (PTS+REB+AST+STL+BLK − TOV − PF).",
    direction: "higher",
    aggregation: "average",
    stat: "boxPlus",
  },
];

const ADVANCED_DAILY_DRAFT_GOAL_DEFINITIONS: DailyDraftGoalDefinition[] = [
  {
    id: "adv-ppm-scorers",
    title: "Per-Minute Scorers",
    description: "Draft the lineup with the highest average points per minute.",
    direction: "higher",
    aggregation: "average",
    stat: "pointsPerMinute",
  },
  {
    id: "adv-playmaking-rate",
    title: "Playmaking Rate",
    description: "Draft the lineup with the highest average assists per minute.",
    direction: "higher",
    aggregation: "average",
    stat: "assistsPerMinute",
  },
  {
    id: "adv-glass-rate",
    title: "Glass Rate",
    description: "Draft the lineup with the highest average rebounds per minute.",
    direction: "higher",
    aggregation: "average",
    stat: "reboundsPerMinute",
  },
  {
    id: "adv-hawk-rate",
    title: "Hawk Rate",
    description: "Draft the lineup with the highest average steals per minute.",
    direction: "higher",
    aggregation: "average",
    stat: "stealsPerMinute",
  },
  {
    id: "adv-rim-rate",
    title: "Rim Rate",
    description: "Draft the lineup with the highest average blocks per minute.",
    direction: "higher",
    aggregation: "average",
    stat: "blocksPerMinute",
  },
  {
    id: "adv-stocks-rate",
    title: "Stocks Rate",
    description: "Draft the lineup with the highest average steals plus blocks per minute.",
    direction: "higher",
    aggregation: "average",
    stat: "stocksPerMinute",
  },
  {
    id: "adv-careful-rate",
    title: "Careful Rate",
    description: "Draft the lineup with the lowest average turnovers per minute.",
    direction: "lower",
    aggregation: "average",
    stat: "turnoversPerMinute",
  },
  {
    id: "adv-chaos-rate",
    title: "Chaos Rate",
    description: "Draft the lineup with the highest average turnovers per minute.",
    direction: "higher",
    aggregation: "average",
    stat: "turnoversPerMinute",
  },
  {
    id: "adv-playmaker-ratio",
    title: "Playmaker Ratio",
    description: "Draft the lineup with the highest average assist-to-turnover ratio.",
    direction: "higher",
    aggregation: "average",
    stat: "assistToTurnoverRatio",
  },
  {
    id: "adv-turnover-prone",
    title: "Turnover Prone",
    description: "Draft the lineup with the lowest average assist-to-turnover ratio.",
    direction: "lower",
    aggregation: "average",
    stat: "assistToTurnoverRatio",
  },
  {
    id: "adv-three-heavy",
    title: "Three-Heavy",
    description: "Draft the lineup with the highest share of shot attempts from three.",
    direction: "higher",
    aggregation: "average",
    stat: "threePointAttemptShare",
  },
  {
    id: "adv-paint-heavy",
    title: "Paint Heavy",
    description: "Draft the lineup with the lowest share of shot attempts from three.",
    direction: "lower",
    aggregation: "average",
    stat: "threePointAttemptShare",
  },
  {
    id: "adv-deep-rate",
    title: "Deep Rate",
    description: "Draft the lineup with the highest average three-point attempts per minute.",
    direction: "higher",
    aggregation: "average",
    stat: "threePointersAttemptedPerMinute",
  },
  {
    id: "adv-volume-rate",
    title: "Volume Rate",
    description: "Draft the lineup with the highest average field goal attempts per minute.",
    direction: "higher",
    aggregation: "average",
    stat: "fieldGoalsAttemptedPerMinute",
  },
  {
    id: "adv-creation-rate",
    title: "Creation Rate",
    description:
      "Draft the lineup with the highest average points plus assists per minute.",
    direction: "higher",
    aggregation: "average",
    stat: "creationRate",
  },
  {
    id: "adv-whistle-rate",
    title: "Whistle Rate",
    description: "Draft the lineup with the highest average free throw attempts per minute.",
    direction: "higher",
    aggregation: "average",
    stat: "whistleRate",
  },
  {
    id: "adv-high-event",
    title: "High Event",
    description:
      "Draft the lineup with the highest average steals, blocks, and turnovers per minute.",
    direction: "higher",
    aggregation: "average",
    stat: "highEventRate",
  },
];

/** Removed from rotation but kept so historical daily scores still resolve. */
const LEGACY_BASIC_DAILY_DRAFT_GOAL_DEFINITIONS: DailyDraftGoalDefinition[] = [
  {
    id: "sky-high",
    title: "Sky High",
    description: "Draft the tallest lineup by average height.",
    direction: "higher",
    aggregation: "average",
    stat: "heightInches",
  },
  {
    id: "small-ball",
    title: "Small Ball Revolution",
    description: "Draft the shortest lineup by average height.",
    direction: "lower",
    aggregation: "average",
    stat: "heightInches",
  },
  {
    id: "defensive-fortress",
    title: "Defensive Fortress",
    description: "Draft the lineup with the highest average defensive grade.",
    direction: "higher",
    aggregation: "average",
    stat: "defense",
  },
  {
    id: "veteran-council",
    title: "Veteran Council",
    description: "Draft the oldest lineup by average age.",
    direction: "higher",
    aggregation: "average",
    stat: "age",
  },
  {
    id: "youth-movement",
    title: "Youth Movement",
    description: "Draft the youngest lineup by average age.",
    direction: "lower",
    aggregation: "average",
    stat: "age",
  },
  {
    id: "anti-offense",
    title: "Anti Offense",
    description: "Draft the lineup with the lowest average points.",
    direction: "lower",
    aggregation: "average",
    stat: "points",
  },
  {
    id: "low-boards",
    title: "Low Boards",
    description: "Draft the lineup with the lowest average rebounds.",
    direction: "lower",
    aggregation: "average",
    stat: "rebounds",
  },
  {
    id: "assist-avoiders",
    title: "Assist Avoiders",
    description: "Draft the lineup with the lowest average assists.",
    direction: "lower",
    aggregation: "average",
    stat: "assists",
  },
  {
    id: "quiet-hands",
    title: "Quiet Hands",
    description: "Draft the lineup with the lowest average steals.",
    direction: "lower",
    aggregation: "average",
    stat: "steals",
  },
  {
    id: "no-rim-protection",
    title: "No Rim Protection",
    description: "Draft the lineup with the lowest average blocks.",
    direction: "lower",
    aggregation: "average",
    stat: "blocks",
  },
  {
    id: "defensive-liability",
    title: "Defensive Liability",
    description: "Draft the lineup with the lowest average defensive grade.",
    direction: "lower",
    aggregation: "average",
    stat: "defense",
  },
];

const LEGACY_ADVANCED_DAILY_DRAFT_GOAL_DEFINITIONS: DailyDraftGoalDefinition[] = [
  {
    id: "adv-low-ppm",
    title: "Low Usage Scorers",
    description: "Draft the lineup with the lowest average points per minute.",
    direction: "lower",
    aggregation: "average",
    stat: "pointsPerMinute",
  },
  {
    id: "adv-efficient-minute",
    title: "Efficient Minute",
    description: "Draft the lineup with the highest weighted true shooting.",
    direction: "higher",
    aggregation: "weightedRate",
    stat: "trueShooting",
  },
  {
    id: "adv-inefficient-minute",
    title: "Inefficient Minute",
    description: "Draft the lineup with the lowest weighted true shooting.",
    direction: "lower",
    aggregation: "weightedRate",
    stat: "trueShooting",
  },
  {
    id: "adv-low-glass-rate",
    title: "Low Glass Rate",
    description: "Draft the lineup with the lowest average rebounds per minute.",
    direction: "lower",
    aggregation: "average",
    stat: "reboundsPerMinute",
  },
];

export const DAILY_DRAFT_GOALS = attachDailyDraftMode(
  BASIC_DAILY_DRAFT_GOAL_DEFINITIONS,
  "basic",
);
export const ADVANCED_DAILY_DRAFT_GOALS = attachDailyDraftMode(
  ADVANCED_DAILY_DRAFT_GOAL_DEFINITIONS,
  "advanced",
);
export const ALL_DAILY_DRAFT_GOALS = [
  ...DAILY_DRAFT_GOALS,
  ...ADVANCED_DAILY_DRAFT_GOALS,
];

const LEGACY_DAILY_DRAFT_GOALS = [
  ...attachDailyDraftMode(LEGACY_BASIC_DAILY_DRAFT_GOAL_DEFINITIONS, "basic"),
  ...attachDailyDraftMode(LEGACY_ADVANCED_DAILY_DRAFT_GOAL_DEFINITIONS, "advanced"),
];

export const getDailyDraftGoalsForMode = (mode: DailyDraftMode) =>
  mode === "advanced" ? ADVANCED_DAILY_DRAFT_GOALS : DAILY_DRAFT_GOALS;

export const DAILY_GOAL_REPEAT_WINDOW_DAYS = 28;

const goalsById = new Map(
  [...ALL_DAILY_DRAFT_GOALS, ...LEGACY_DAILY_DRAFT_GOALS].map((goal) => [
    goal.id,
    goal,
  ]),
);

export const getDailyGoalById = (goalId: string) => goalsById.get(goalId);
