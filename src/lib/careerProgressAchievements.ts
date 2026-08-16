import { getDailyDraftPlayStreak } from "./dailyDraftPlayStreak";
import { getRecordedDraftLineupCount } from "./nbaPlayerUsage";
import { loadAllModeRecords } from "./playerRecord";

/** Lifetime / multi-session badges (not single-lineup checks). */
export const CAREER_PROGRESS_ACHIEVEMENT_IDS = new Set([
  "fifty-wins",
  "five-hundred-wins",
  "hundred-plays",
  "thousand-plays",
  "ten-drafts",
  "twenty-five-drafts",
  "daily-streak-3",
  "daily-streak-7",
  "daily-streak-14",
]);

export type CareerProgressMetric = "wins" | "plays" | "drafts" | "dailyStreak";

export interface CareerProgressDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
  metric: CareerProgressMetric;
  target: number;
}

export const CAREER_PROGRESS_DEFINITIONS: CareerProgressDefinition[] = [
  {
    id: "fifty-wins",
    title: "50 Wins",
    description: "Win 50 competitive matches.",
    emoji: "🏅",
    metric: "wins",
    target: 50,
  },
  {
    id: "five-hundred-wins",
    title: "500 Wins",
    description: "Win 500 competitive matches.",
    emoji: "🏆",
    metric: "wins",
    target: 500,
  },
  {
    id: "hundred-plays",
    title: "100 Plays",
    description: "Play 100 competitive matches.",
    emoji: "🎮",
    metric: "plays",
    target: 100,
  },
  {
    id: "thousand-plays",
    title: "1,000 Plays",
    description: "Play 1,000 competitive matches.",
    emoji: "♾️",
    metric: "plays",
    target: 1000,
  },
  {
    id: "ten-drafts",
    title: "10 Drafts",
    description: "Record 10 competitive or Daily lineups.",
    emoji: "📋",
    metric: "drafts",
    target: 10,
  },
  {
    id: "twenty-five-drafts",
    title: "25 Drafts",
    description: "Record 25 competitive or Daily lineups.",
    emoji: "🗂️",
    metric: "drafts",
    target: 25,
  },
  {
    id: "daily-streak-3",
    title: "Daily Habit",
    description: "Play Daily Draft three days in a row.",
    emoji: "📅",
    metric: "dailyStreak",
    target: 3,
  },
  {
    id: "daily-streak-7",
    title: "Weekly Ritual",
    description: "Play Daily Draft seven days in a row.",
    emoji: "🗓️",
    metric: "dailyStreak",
    target: 7,
  },
  {
    id: "daily-streak-14",
    title: "Two-Week Run",
    description: "Play Daily Draft fourteen days in a row.",
    emoji: "🔥",
    metric: "dailyStreak",
    target: 14,
  },
];

export interface CareerProgressCounters {
  wins: number;
  plays: number;
  drafts: number;
  dailyStreak: number;
}

const modePlays = (mode: {
  wins: number;
  losses: number;
  ties: number;
}) => mode.wins + mode.losses + mode.ties;

export const getCareerProgressCounters = (): CareerProgressCounters => {
  const records = loadAllModeRecords();
  const wins =
    records.headToHead.wins + records.ranked.wins + records.allTime.wins;
  const plays =
    modePlays(records.headToHead) +
    modePlays(records.ranked) +
    modePlays(records.allTime);
  const basic = getDailyDraftPlayStreak("basic");
  const advanced = getDailyDraftPlayStreak("advanced");

  return {
    wins,
    plays,
    drafts: getRecordedDraftLineupCount(),
    dailyStreak: Math.max(basic.current, advanced.current),
  };
};

const currentForMetric = (
  counters: CareerProgressCounters,
  metric: CareerProgressMetric,
) => counters[metric];

export interface CareerProgressBadgeRow {
  id: string;
  title: string;
  description: string;
  emoji: string;
  current: number;
  target: number;
  isUnlocked: boolean;
}

export const getCareerProgressBadgeRows = (
  unlockedIds: Iterable<string> = [],
  counters = getCareerProgressCounters(),
): CareerProgressBadgeRow[] => {
  const unlocked = new Set(unlockedIds);

  return CAREER_PROGRESS_DEFINITIONS.map((definition) => {
    const current = currentForMetric(counters, definition.metric);
    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      emoji: definition.emoji,
      current,
      target: definition.target,
      isUnlocked: unlocked.has(definition.id) || current >= definition.target,
    };
  });
};

export const getEarnedCareerProgressIds = (
  counters = getCareerProgressCounters(),
): string[] =>
  CAREER_PROGRESS_DEFINITIONS.filter(
    (definition) =>
      currentForMetric(counters, definition.metric) >= definition.target,
  ).map((definition) => definition.id);

/** Next Daily streak career badge still locked for this GM, if any. */
export const getNextDailyStreakGoal = (
  counters = getCareerProgressCounters(),
) =>
  CAREER_PROGRESS_DEFINITIONS.find(
    (definition) =>
      definition.metric === "dailyStreak" &&
      counters.dailyStreak < definition.target,
  ) ?? null;
