import { getDailyDraftPlayStreak } from "./dailyDraftPlayStreak";
import { getRecordedDraftLineupCount } from "./nbaPlayerUsage";
import { loadAllModeRecords } from "./playerRecord";

/** Lifetime / multi-session badges (not single-lineup checks). */
export const CAREER_PROGRESS_ACHIEVEMENT_IDS = new Set([
  "ten-wins",
  "twenty-five-wins",
  "ten-drafts",
  "twenty-five-drafts",
  "daily-streak-3",
  "daily-streak-7",
]);

export type CareerProgressMetric = "wins" | "drafts" | "dailyStreak";

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
    id: "ten-wins",
    title: "10 Wins",
    description: "Win 10 competitive matches.",
    emoji: "🔟",
    metric: "wins",
    target: 10,
  },
  {
    id: "twenty-five-wins",
    title: "25 Wins",
    description: "Win 25 competitive matches.",
    emoji: "🏅",
    metric: "wins",
    target: 25,
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
];

export interface CareerProgressCounters {
  wins: number;
  drafts: number;
  dailyStreak: number;
}

export const getCareerProgressCounters = (): CareerProgressCounters => {
  const records = loadAllModeRecords();
  const wins =
    records.headToHead.wins + records.ranked.wins + records.allTime.wins;
  const basic = getDailyDraftPlayStreak("basic");
  const advanced = getDailyDraftPlayStreak("advanced");

  return {
    wins,
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
