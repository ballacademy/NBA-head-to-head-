import { readJson, writeJson } from "./browserStorage";
import { ACHIEVEMENT_CHECKS } from "./achievementChecks";
import type { Player } from "./types";

const ACHIEVEMENTS_KEY = "nba-head-to-head-achievements";

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

export const ACHIEVEMENTS: AchievementDefinition[] = ACHIEVEMENT_CHECKS.map(
  ({ id, title, description, emoji }) => ({
    id,
    title,
    description,
    emoji,
  }),
);

const achievementChecksById = new Map(
  ACHIEVEMENT_CHECKS.map((achievement) => [achievement.id, achievement.check]),
);

export const checkLineupAchievements = (lineup: Player[]) => {
  if (lineup.length !== 5) {
    return [];
  }

  return ACHIEVEMENT_CHECKS.filter((achievement) =>
    achievement.check(lineup),
  ).map((achievement) => achievement.id);
};

export interface AchievementState {
  unlocked: string[];
}

export const loadAchievementState = (): AchievementState => {
  const saved = readJson<Partial<AchievementState>>(ACHIEVEMENTS_KEY);

  return {
    unlocked: Array.isArray(saved?.unlocked) ? saved.unlocked : [],
  };
};

export const saveAchievementState = (state: AchievementState) => {
  writeJson(ACHIEVEMENTS_KEY, state);
};

export const unlockAchievements = (
  achievementIds: string[],
  state = loadAchievementState(),
) => {
  const unlocked = new Set(state.unlocked);
  const newlyUnlocked: string[] = [];

  for (const id of achievementIds) {
    if (!achievementChecksById.has(id)) {
      continue;
    }

    if (!unlocked.has(id)) {
      unlocked.add(id);
      newlyUnlocked.push(id);
    }
  }

  const next = { unlocked: [...unlocked] };
  saveAchievementState(next);

  return {
    state: next,
    newlyUnlocked,
  };
};

export const getAchievementById = (id: string) =>
  ACHIEVEMENTS.find((achievement) => achievement.id === id);

export const getAchievementProgress = (state = loadAchievementState()) => {
  const unlocked = new Set(state.unlocked);

  return {
    unlocked: state.unlocked.length,
    total: ACHIEVEMENTS.length,
    achievements: ACHIEVEMENTS.map((achievement) => ({
      ...achievement,
      isUnlocked: unlocked.has(achievement.id),
    })),
  };
};
