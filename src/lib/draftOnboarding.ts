import { readJson, writeJson } from "./browserStorage";

const DRAFT_ONBOARDING_KEY = "nba-head-to-head-draft-onboarding-seen";

export const hasSeenDraftOnboarding = () =>
  readJson<{ seen?: boolean }>(DRAFT_ONBOARDING_KEY)?.seen === true;

export const markDraftOnboardingSeen = () => {
  writeJson(DRAFT_ONBOARDING_KEY, { seen: true });
};
