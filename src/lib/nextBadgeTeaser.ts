import {
  evaluateCareerProgressAchievements,
  getAchievementProgress,
} from "./achievements";
import {
  getAchievementPlayHint,
  getNearestLockedAchievement,
  type AchievementPlayHint,
} from "./achievementPlayHints";

export type NextBadgeTeaser = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  hint: AchievementPlayHint;
};

export const isDailyNextBadge = (badge: NextBadgeTeaser | null | undefined) =>
  badge?.hint.playSection === "daily";

export const getNextBadgeTeaser = (): NextBadgeTeaser | null => {
  evaluateCareerProgressAchievements();
  const progress = getAchievementProgress();
  const nextCandidates = [
    ...progress.careerProgress.map((row) => ({
      id: row.id,
      title: row.title,
      description: `${row.description} (${Math.min(row.current, row.target)}/${row.target})`,
      emoji: row.emoji,
      isUnlocked: row.isUnlocked,
    })),
    ...progress.achievements,
  ];

  const nextBadge = getNearestLockedAchievement(nextCandidates);
  if (!nextBadge) {
    return null;
  }

  return {
    id: nextBadge.id,
    title: nextBadge.title,
    description: nextBadge.description,
    emoji: nextBadge.emoji,
    hint: getAchievementPlayHint(nextBadge.id),
  };
};
