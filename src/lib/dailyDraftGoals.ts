export type DailyGoalDirection = "higher" | "lower";

export type DailyGoalStat =
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
  | "stocks";

export type DailyGoalAggregation = "weightedRate" | "average";

export interface DailyDraftGoal {
  id: string;
  title: string;
  description: string;
  direction: DailyGoalDirection;
  aggregation: DailyGoalAggregation;
  stat: DailyGoalStat;
}

export const DAILY_DRAFT_GOALS: DailyDraftGoal[] = [
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
    id: "usage-hogs",
    title: "Usage Hogs",
    description: "Draft the lineup with the highest average usage.",
    direction: "higher",
    aggregation: "average",
    stat: "usage",
  },
  {
    id: "defensive-fortress",
    title: "Defensive Fortress",
    description: "Draft the lineup with the highest average defense rating.",
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
    id: "anti-offense",
    title: "Anti Offense",
    description: "Draft the lineup with the lowest average points.",
    direction: "lower",
    aggregation: "average",
    stat: "points",
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
    id: "stocks-market",
    title: "Stocks Market",
    description: "Draft the lineup with the highest average steals plus blocks.",
    direction: "higher",
    aggregation: "average",
    stat: "stocks",
  },
  {
    id: "defensive-liability",
    title: "Defensive Liability",
    description: "Draft the lineup with the lowest average defense rating.",
    direction: "lower",
    aggregation: "average",
    stat: "defense",
  },
];

export const DAILY_GOAL_REPEAT_WINDOW_DAYS = 28;

const goalsById = new Map(DAILY_DRAFT_GOALS.map((goal) => [goal.id, goal]));

export const getDailyGoalById = (goalId: string) => goalsById.get(goalId);
