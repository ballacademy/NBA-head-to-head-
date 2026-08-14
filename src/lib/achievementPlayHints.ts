import type { LandingPlaySection } from "./landingHub";

export type AchievementPlayHint = {
  playSection: LandingPlaySection;
  h2hMode?: "classic" | "ranked";
  ctaLabel: string;
};

export const ACHIEVEMENT_PLAY_HINTS: Record<string, AchievementPlayHint> = {
  "ballin-on-budget": {
    playSection: "headToHead",
    h2hMode: "ranked",
    ctaLabel: "Play Pro Head to Head",
  },
  "poverty-line": {
    playSection: "headToHead",
    h2hMode: "ranked",
    ctaLabel: "Play Pro Head to Head",
  },
  "seventy-wins": {
    playSection: "headToHead",
    h2hMode: "classic",
    ctaLabel: "Play Casual Head to Head",
  },
  "eighty-ovr": {
    playSection: "headToHead",
    h2hMode: "classic",
    ctaLabel: "Play Casual Head to Head",
  },
  "eighty-two-wins": {
    playSection: "headToHead",
    h2hMode: "classic",
    ctaLabel: "Play Casual Head to Head",
  },
  "max-ovr": {
    playSection: "headToHead",
    h2hMode: "classic",
    ctaLabel: "Play Casual Head to Head",
  },
  "ceiling-breaker": {
    playSection: "headToHead",
    h2hMode: "classic",
    ctaLabel: "Play Casual Head to Head",
  },
  "plus-five": {
    playSection: "headToHead",
    h2hMode: "classic",
    ctaLabel: "Play Casual Head to Head",
  },
  "rebuild": {
    playSection: "headToHead",
    h2hMode: "classic",
    ctaLabel: "Play Casual Head to Head",
  },
  "winless": {
    playSection: "headToHead",
    h2hMode: "classic",
    ctaLabel: "Play Casual Head to Head",
  },
};

export function getAchievementPlayHint(id: string): AchievementPlayHint {
  return (
    ACHIEVEMENT_PLAY_HINTS[id] ?? {
      playSection: "headToHead",
      h2hMode: "classic",
      ctaLabel: "Play Casual Head to Head",
    }
  );
}

export function getNearestLockedAchievement(
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    emoji: string;
    isUnlocked: boolean;
  }>,
) {
  return achievements.find((achievement) => !achievement.isUnlocked) ?? null;
}
