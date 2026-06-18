import { readJson, writeJson } from "./browserStorage";
import type { Player } from "./types";

const ACHIEVEMENTS_KEY = "nba-head-to-head-achievements";

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "oops-all-centers",
    title: "Oops, All Centers",
    description: "Draft a lineup of five bigs.",
    emoji: "🏗️",
  },
  {
    id: "retirement-home",
    title: "The Retirement Home",
    description: "Draft a lineup with an average age over 34.",
    emoji: "🧓",
  },
  {
    id: "brick-city",
    title: "Brick City",
    description: "Draft a lineup with brutal three-point shooting.",
    emoji: "🧱",
  },
  {
    id: "nepotism",
    title: "Nepotism",
    description: "Draft Bronny James and Thanasis Antetokounmpo together.",
    emoji: "👨‍👩‍👦",
  },
];

const BRONNY_BBR_ID = "jamesbr02";
const THANASIS_BBR_ID = "antetth01";

const average = (values: number[]) =>
  values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

export const checkLineupAchievements = (lineup: Player[]) => {
  const unlocked: string[] = [];

  if (lineup.length !== 5) {
    return unlocked;
  }

  const isBig = (player: Player) =>
    player.position === "PF" || player.position === "C";

  if (lineup.every(isBig)) {
    unlocked.push("oops-all-centers");
  }

  const ages = lineup
    .map((player) => player.age)
    .filter((age): age is number => typeof age === "number");

  if (ages.length === 5 && average(ages) > 34) {
    unlocked.push("retirement-home");
  }

  const avgThreePoint = average(lineup.map((player) => player.threePoint));
  const shooters = lineup.filter((player) => player.threePoint >= 0.34).length;

  if (avgThreePoint < 0.33 && shooters <= 1) {
    unlocked.push("brick-city");
  }

  const bbrIds = new Set(lineup.map((player) => player.bbrPlayerId));
  if (bbrIds.has(BRONNY_BBR_ID) && bbrIds.has(THANASIS_BBR_ID)) {
    unlocked.push("nepotism");
  }

  return unlocked;
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
