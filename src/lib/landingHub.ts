export type LandingContentTab = "play" | "roster" | "account";

/** Sub-views under the Play hub (bottom-nav Play → chooser → mode page). */
export type LandingPlaySection =
  | "chooser"
  | "headToHead"
  | "daily"
  | "events";

/** Hub deep-link targets, including feature pages opened from the bottom nav. */
export type LandingHubDeepLink =
  | LandingContentTab
  | "community"
  | "ranks"
  | "standings";

export type LandingDeepLinkFeature = "tierList" | "leaderboard";

export interface LandingDeepLinkBoot {
  contentTab: LandingContentTab | null;
  playSection: LandingPlaySection | null;
  feature: LandingDeepLinkFeature | null;
}

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

const normalizeQueryToken = (value: string) =>
  value.trim().toLowerCase().replace(/[\s_]+/g, "-");

/** Parse `?hub=` including community / ranks aliases. */
export const parseLandingHubParam = (
  value: string | null | undefined,
): LandingHubDeepLink | null => {
  if (!value) {
    return null;
  }

  const token = normalizeQueryToken(value);
  if (token === "play") return "play";
  if (token === "roster" || token === "collection") return "roster";
  if (token === "account" || token === "profile" || token === "settings") {
    return "account";
  }
  if (
    token === "community" ||
    token === "tiers" ||
    token === "tier-list" ||
    token === "tierlist"
  ) {
    return "community";
  }
  if (
    token === "ranks" ||
    token === "rank" ||
    token === "standings" ||
    token === "leaderboard" ||
    token === "lb"
  ) {
    return "ranks";
  }

  return null;
};

/** Parse `?play=` with sensible aliases (h2h, daily-draft, etc.). */
export const parseLandingPlayParam = (
  value: string | null | undefined,
): LandingPlaySection | null => {
  if (!value) {
    return null;
  }

  const token = normalizeQueryToken(value);
  if (
    token === "chooser" ||
    token === "home" ||
    token === "modes" ||
    token === "play" ||
    token === "menu"
  ) {
    return "chooser";
  }
  if (
    token === "daily" ||
    token === "dailydraft" ||
    token === "daily-draft" ||
    token === "draft"
  ) {
    return "daily";
  }
  if (
    token === "headtohead" ||
    token === "head-to-head" ||
    token === "h2h" ||
    token === "classic" ||
    token === "ranked" ||
    token === "pro"
  ) {
    return "headToHead";
  }
  if (token === "events" || token === "event" || token === "weekly") {
    return "events";
  }

  return null;
};

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

/**
 * Read `?hub=` / `?play=` from a search string, persist content/play to
 * sessionStorage, and report any feature-page deep link (community/ranks).
 * Existing `?tierList=` handling stays in App and is preserved by URL sync.
 */
export const applyLandingDeepLinksFromSearch = (
  search: string,
): LandingDeepLinkBoot => {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const hub = parseLandingHubParam(params.get("hub"));
  const play = parseLandingPlayParam(params.get("play"));

  let contentTab: LandingContentTab | null = null;
  let playSection: LandingPlaySection | null = play;
  let feature: LandingDeepLinkFeature | null = null;

  if (hub === "play" || hub === "roster" || hub === "account") {
    contentTab = hub;
    saveLandingHubTab(hub);
  } else if (hub === "community") {
    feature = "tierList";
  } else if (hub === "ranks" || hub === "standings") {
    feature = "leaderboard";
  }

  if (playSection) {
    saveLandingPlaySection(playSection);
    // Play deep links land on the Play hub unless a feature hub won.
    if (!feature) {
      contentTab = contentTab ?? "play";
      saveLandingHubTab(contentTab);
    }
  }

  return { contentTab, playSection, feature };
};

export interface SyncLandingDeepLinkUrlOptions {
  hub?: LandingHubDeepLink | null;
  play?: LandingPlaySection | null;
  /** When false, drop hub/play params (e.g. leaving the landing surface). */
  clearLandingParams?: boolean;
}

/** Sync hub/play query params via replaceState; preserves `tierList` and other params. */
export const syncLandingDeepLinkUrl = (
  options: SyncLandingDeepLinkUrlOptions,
) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const url = new URL(window.location.href);

    if (options.clearLandingParams) {
      url.searchParams.delete("hub");
      url.searchParams.delete("play");
    } else {
      if (options.hub != null) {
        const hubParam =
          options.hub === "standings" ? "ranks" : options.hub;
        url.searchParams.set("hub", hubParam);
        if (hubParam !== "play" && options.play === undefined) {
          url.searchParams.delete("play");
        }
      }
      if (options.play === null) {
        url.searchParams.delete("play");
      } else if (options.play != null) {
        url.searchParams.set("play", options.play);
        if (options.hub == null && !url.searchParams.get("hub")) {
          url.searchParams.set("hub", "play");
        }
      }
    }

    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) {
      window.history.replaceState(window.history.state, "", next);
    }
  } catch {
    // Ignore URL sync failures.
  }
};
