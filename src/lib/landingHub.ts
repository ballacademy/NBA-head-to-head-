export type LandingContentTab = "play" | "roster" | "account";

/** Sub-views under the Play hub (bottom-nav Play → chooser → mode page). */
export type LandingPlaySection =
  | "chooser"
  | "headToHead"
  | "daily"
  | "events";

const LANDING_HUB_TAB_KEY = "ddgm:landing-hub-tab";
const LANDING_PLAY_SECTION_KEY = "ddgm:landing-play-section";

/** Legacy content-tab ids from the 7-item bottom nav. */
const LEGACY_PLAY_SECTIONS = new Set(["daily", "events", "play"]);

export const isLandingContentTab = (
  value: string | null | undefined,
): value is LandingContentTab =>
  value === "play" || value === "roster" || value === "account";

export const isLandingPlaySection = (
  value: string | null | undefined,
): value is LandingPlaySection =>
  value === "chooser" ||
  value === "headToHead" ||
  value === "daily" ||
  value === "events";

export const loadLandingHubTab = (): LandingContentTab => {
  try {
    const stored = sessionStorage.getItem(LANDING_HUB_TAB_KEY);
    if (isLandingContentTab(stored)) {
      return stored;
    }

    // Old builds stored daily/events as top-level hub tabs.
    if (stored && LEGACY_PLAY_SECTIONS.has(stored)) {
      return "play";
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

export const loadLandingPlaySection = (): LandingPlaySection => {
  try {
    const storedSection = sessionStorage.getItem(LANDING_PLAY_SECTION_KEY);
    if (isLandingPlaySection(storedSection)) {
      return storedSection;
    }

    // Migrate: if the old hub tab was daily/events, open that Play section once.
    const storedTab = sessionStorage.getItem(LANDING_HUB_TAB_KEY);
    if (storedTab === "daily" || storedTab === "events") {
      return storedTab;
    }
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }

  return "chooser";
};

export const saveLandingPlaySection = (section: LandingPlaySection) => {
  try {
    sessionStorage.setItem(LANDING_PLAY_SECTION_KEY, section);
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
};
