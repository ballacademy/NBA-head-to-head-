import { unlockAchievements } from "./achievements";

export const FOUNDING_GM_ACCOUNT_LIMIT = 500;
export const FOUNDING_GM_ACHIEVEMENT_ID = "founding-gm";

export const isFoundingGmSignupIndex = (
  signupIndex: number | null | undefined,
) =>
  typeof signupIndex === "number" &&
  Number.isFinite(signupIndex) &&
  signupIndex >= 1 &&
  signupIndex <= FOUNDING_GM_ACCOUNT_LIMIT;

/** Grant the Founding GM badge when the linked account is in the first 500. */
export const syncFoundingGmAchievement = (foundingGm: boolean) => {
  if (!foundingGm) {
    return { newlyUnlocked: [] as string[] };
  }

  const { newlyUnlocked } = unlockAchievements([FOUNDING_GM_ACHIEVEMENT_ID]);
  return { newlyUnlocked };
};
