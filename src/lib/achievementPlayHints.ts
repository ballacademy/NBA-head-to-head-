import type { LandingPlaySection } from "./landingHub";

export type AchievementPlayHint = {
  playSection: LandingPlaySection;
  h2hMode?: "classic" | "ranked";
  ctaLabel: string;
};

const CASUAL_H2H: AchievementPlayHint = {
  playSection: "headToHead",
  h2hMode: "classic",
  ctaLabel: "Play Casual Head to Head",
};

const PRO_H2H: AchievementPlayHint = {
  playSection: "headToHead",
  h2hMode: "ranked",
  ctaLabel: "Play Pro Head to Head",
};

const DAILY: AchievementPlayHint = {
  playSection: "daily",
  ctaLabel: "Play Daily Draft",
};

export const ACHIEVEMENT_PLAY_HINTS: Record<string, AchievementPlayHint> = {
  "ballin-on-budget": PRO_H2H,
  "poverty-line": CASUAL_H2H,
  "seventy-wins": CASUAL_H2H,
  "eighty-ovr": CASUAL_H2H,
  "eighty-two-wins": CASUAL_H2H,
  "max-ovr": CASUAL_H2H,
  "ceiling-breaker": CASUAL_H2H,
  "plus-five": CASUAL_H2H,
  rebuild: CASUAL_H2H,
  winless: CASUAL_H2H,

  // Chemistry / theme lineups — Casual has the widest pool.
  nepotism: CASUAL_H2H,
  "family-ties": CASUAL_H2H,
  "college-roommates": CASUAL_H2H,
  "team-core": CASUAL_H2H,
  "same-jersey-club": CASUAL_H2H,
  "pacific-pact": CASUAL_H2H,
  "free-agents": CASUAL_H2H,
  "recent-heat": CASUAL_H2H,
  "scrub-life": CASUAL_H2H,
  "gutter-gang": CASUAL_H2H,
  "five-superstars": CASUAL_H2H,
  "retirement-home": CASUAL_H2H,
  daycare: CASUAL_H2H,
  "alphabet-squad": CASUAL_H2H,

  // Career progress — short loops first via PRIORITY_ACHIEVEMENT_IDS.
  "fifty-wins": CASUAL_H2H,
  "five-hundred-wins": CASUAL_H2H,
  "hundred-plays": CASUAL_H2H,
  "thousand-plays": CASUAL_H2H,
  "ten-drafts": CASUAL_H2H,
  "twenty-five-drafts": CASUAL_H2H,
  "daily-streak-3": DAILY,
  "daily-streak-7": DAILY,
  "daily-streak-14": DAILY,
};

export function getAchievementPlayHint(id: string): AchievementPlayHint {
  return ACHIEVEMENT_PLAY_HINTS[id] ?? CASUAL_H2H;
}

export const PRIORITY_ACHIEVEMENT_IDS = [
  "ten-drafts",
  "daily-streak-3",
  "daily-streak-7",
  "daily-streak-14",
  "fifty-wins",
  "hundred-plays",
  "ballin-on-budget",
  "seventy-wins",
  "eighty-ovr",
  "eighty-two-wins",
  "max-ovr",
  "ceiling-breaker",
  "plus-five",
] as const;

export function getNearestLockedAchievement(
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    emoji: string;
    isUnlocked: boolean;
  }>,
) {
  const locked = achievements.filter(
    (achievement) => !achievement.isUnlocked && achievement.id !== "founding-gm",
  );

  for (const id of PRIORITY_ACHIEVEMENT_IDS) {
    const match = locked.find((achievement) => achievement.id === id);
    if (match) {
      return match;
    }
  }

  return locked[0] ?? null;
}
