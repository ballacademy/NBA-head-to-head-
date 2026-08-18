import { readJson, writeJson } from "./browserStorage";

const DRAFT_ONBOARDING_KEY = "nba-head-to-head-draft-onboarding-seen";

export const hasSeenDraftOnboarding = () =>
  readJson<{ seen?: boolean }>(DRAFT_ONBOARDING_KEY)?.seen === true;

export const markDraftOnboardingSeen = () => {
  writeJson(DRAFT_ONBOARDING_KEY, { seen: true });
};

export type DraftOnboardingContext = {
  hasSalaryCap: boolean;
  isDailyDraft: boolean;
  /** Live Casual/Pro or Events — not Practice or Daily. */
  isCompetitive: boolean;
};

export const getDraftOnboardingBullets = ({
  hasSalaryCap,
  isDailyDraft,
  isCompetitive,
}: DraftOnboardingContext): string[] => {
  const bullets = ["Make five timed draft picks for your lineup."];

  if (isDailyDraft) {
    bullets.push(
      "Player stats stay hidden until you finish all five picks — draft from memory.",
    );
  }

  if (hasSalaryCap) {
    bullets.push(
      "Stay under the salary cap — the salary bar shows spent vs remaining.",
    );
  }

  if (hasSalaryCap && isCompetitive) {
    bullets.push(
      "Banners are your Front Office rating. Wins and losses move them on the Casual and Pro season boards.",
    );
  }

  bullets.push("If the timer hits zero, remaining picks auto-fill.");

  if (isCompetitive) {
    bullets.push(
      "LeBron James is banned in Casual, Pro, and Events — he stays on the board with a Banned label.",
    );
  }

  return bullets;
};
