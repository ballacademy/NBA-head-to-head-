import { readJson, writeJson } from "./browserStorage";
import { ACHIEVEMENT_CHECKS, type AchievementCheckContext } from "./achievementChecks";
import { calculateLineupScore } from "./scoring";
import type { Player } from "./types";

const ACHIEVEMENTS_KEY = "nba-head-to-head-achievements";

const REMOVED_ACHIEVEMENT_IDS = new Set([
  "zero-big",
  "twin-towers",
  "midrange-museum",
  "alphabet-bros",
  "curry-kitchen",
  "holiday-hoopers",
  "all-star-weekend",
  "chemistry-class",
  "dynasty",
]);

const LEGACY_ACHIEVEMENT_MIGRATIONS: Record<string, string> = {
  "alphabet-bros": "family-ties",
  "chemistry-class": "family-ties",
  "curry-kitchen": "family-ties",
  "holiday-hoopers": "family-ties",
  "midrange-museum": "brick-city",
};

const normalizeUnlockedAchievements = (unlocked: string[]) => {
  const validIds = new Set(ACHIEVEMENT_CHECKS.map((achievement) => achievement.id));
  const next = new Set<string>();

  for (const id of unlocked) {
    if (id === "dynasty") {
      if (validIds.has("seventy-wins")) {
        next.add("seventy-wins");
      }

      if (validIds.has("eighty-ovr")) {
        next.add("eighty-ovr");
      }

      continue;
    }

    if (REMOVED_ACHIEVEMENT_IDS.has(id)) {
      const migrated = LEGACY_ACHIEVEMENT_MIGRATIONS[id];

      if (migrated && validIds.has(migrated)) {
        next.add(migrated);
      }

      continue;
    }

    if (validIds.has(id)) {
      next.add(id);
    }
  }

  return [...next];
};

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

export const buildAchievementContext = (
  lineup: Player[],
  options: Pick<AchievementCheckContext, "hasSalaryCap"> = {},
): AchievementCheckContext => {
  if (lineup.length !== 5) {
    return options;
  }

  const score = calculateLineupScore(lineup);

  return {
    ...options,
    lineupOvr: score.total,
    preciseOvr: score.preciseTotal,
    projectedWins: score.projectedRecord.wins,
  };
};

export const checkLineupAchievements = (
  lineup: Player[],
  context: AchievementCheckContext = {},
) => {
  if (lineup.length !== 5) {
    return [];
  }

  return ACHIEVEMENT_CHECKS.filter((achievement) =>
    achievement.check(lineup, context),
  ).map((achievement) => achievement.id);
};

export interface AchievementState {
  unlocked: string[];
}

export const loadAchievementState = (): AchievementState => {
  const saved = readJson<Partial<AchievementState>>(ACHIEVEMENTS_KEY);
  const unlocked = Array.isArray(saved?.unlocked) ? saved.unlocked : [];
  const normalized = normalizeUnlockedAchievements(unlocked);

  if (normalized.length !== unlocked.length || normalized.some((id, index) => id !== unlocked[index])) {
    saveAchievementState({ unlocked: normalized });
  }

  return {
    unlocked: normalized,
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
    achievements: ACHIEVEMENTS.map((achievement) => {
      const isUnlocked = unlocked.has(achievement.id);

      return {
        ...achievement,
        isUnlocked,
        title: isUnlocked ? achievement.title : "????",
        description: isUnlocked ? achievement.description : "????",
        emoji: isUnlocked ? achievement.emoji : "❓",
      };
    }),
  };
};
