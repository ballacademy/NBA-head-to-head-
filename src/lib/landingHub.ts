export type LandingContentTab = "play" | "daily" | "roster" | "account";

const LANDING_HUB_TAB_KEY = "ddgm:landing-hub-tab";

export const isLandingContentTab = (
  value: string | null | undefined,
): value is LandingContentTab =>
  value === "play" ||
  value === "daily" ||
  value === "roster" ||
  value === "account";

export const loadLandingHubTab = (): LandingContentTab => {
  try {
    const stored = sessionStorage.getItem(LANDING_HUB_TAB_KEY);
    if (isLandingContentTab(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }

  return "play";
};

export const saveLandingHubTab = (tab: LandingContentTab) => {
  try {
    sessionStorage.setItem(LANDING_HUB_TAB_KEY, tab);
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
};
