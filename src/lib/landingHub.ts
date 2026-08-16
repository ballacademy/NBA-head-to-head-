export type LandingContentTab = "play" | "roster" | "account";

/** Sub-views under the Play hub (bottom-nav Play → chooser → mode page). */
export type LandingPlaySection =
  | "chooser"
  | "headToHead"
  | "daily"
  | "events";

export type LandingH2hMode = "classic" | "ranked";

/** Hub deep-link targets, including feature pages opened from the bottom nav. */
export type LandingHubDeepLink =
  | LandingContentTab
  | "community"
  | "ranks"
  | "standings"
  | "stats"
  | "badges"
  | "gm-stats"
  | "privacy"
  | "terms"
  | "beta";

export type LandingDeepLinkFeature =
  | "tierList"
  | "leaderboard"
  | "stats"
  | "achievements"
  | "gmStats"
  | "privacy"
  | "terms"
  | "beta";

export type LandingCommunityView = "posts" | "tiers";

export interface LandingDeepLinkBoot {
  contentTab: LandingContentTab | null;
  playSection: LandingPlaySection | null;
  h2hMode: LandingH2hMode | null;
  feature: LandingDeepLinkFeature | null;
  communityView: LandingCommunityView | null;
  communityPostId: string | null;
  betaSection: string | null;
}

const LANDING_HUB_TAB_KEY = "ddgm:landing-hub-tab";
const LANDING_PLAY_SECTION_KEY = "ddgm:landing-play-section";
const LANDING_H2H_MODE_KEY = "ddgm:landing-h2h-mode";

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

/** Parse `?hub=` including community / ranks / feature-page aliases. */
export const parseLandingHubParam = (
  value: string | null | undefined,
): LandingHubDeepLink | null => {
  if (!value) {
    return null;
  }

  const token = normalizeQueryToken(value);
  if (token === "play") return "play";
  if (token === "roster" || token === "franchise" || token === "collection") {
    return "roster";
  }
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
  if (token === "stats" || token === "season-stats" || token === "player-stats") {
    return "stats";
  }
  if (
    token === "badges" ||
    token === "achievements" ||
    token === "unlocks"
  ) {
    return "badges";
  }
  if (
    token === "gm-stats" ||
    token === "gmstats" ||
    token === "gm-stat" ||
    token === "career"
  ) {
    return "gm-stats";
  }
  if (token === "privacy") return "privacy";
  if (token === "terms") return "terms";
  if (token === "beta" || token === "beta-notes") return "beta";

  return null;
};

/** Canonical `?hub=` value for a feature page (stable across refresh). */
export const hubParamForFeature = (
  feature: LandingDeepLinkFeature,
): Exclude<LandingHubDeepLink, "standings"> => {
  switch (feature) {
    case "tierList":
      return "community";
    case "leaderboard":
      return "ranks";
    case "stats":
      return "stats";
    case "achievements":
      return "badges";
    case "gmStats":
      return "gm-stats";
    case "privacy":
      return "privacy";
    case "terms":
      return "terms";
    case "beta":
      return "beta";
  }
};

/** Parent landing tab for a feature (used when exiting back to the hub). */
export const parentTabForFeature = (
  feature: LandingDeepLinkFeature,
): LandingContentTab => {
  switch (feature) {
    case "stats":
    case "achievements":
    case "gmStats":
      return "roster";
    case "privacy":
    case "terms":
    case "beta":
      return "account";
    case "tierList":
    case "leaderboard":
      return "play";
  }
};

export const featureFromHubDeepLink = (
  hub: LandingHubDeepLink,
): LandingDeepLinkFeature | null => {
  switch (hub) {
    case "community":
      return "tierList";
    case "ranks":
    case "standings":
      return "leaderboard";
    case "stats":
      return "stats";
    case "badges":
      return "achievements";
    case "gm-stats":
      return "gmStats";
    case "privacy":
      return "privacy";
    case "terms":
      return "terms";
    case "beta":
      return "beta";
    default:
      return null;
  }
};

export const isLandingH2hMode = (
  value: string | null | undefined,
): value is LandingH2hMode => value === "classic" || value === "ranked";

/** Parse `?play=` with sensible aliases (h2h, daily-draft, ranked/classic, etc.). */
export const parseLandingPlayParam = (
  value: string | null | undefined,
): LandingPlaySection | null => parseLandingPlayWithH2h(value).section;

export const parseLandingPlayWithH2h = (
  value: string | null | undefined,
): { section: LandingPlaySection | null; h2hMode: LandingH2hMode | null } => {
  if (!value) {
    return { section: null, h2hMode: null };
  }

  const token = normalizeQueryToken(value);
  let h2hMode: LandingH2hMode | null = null;
  if (token === "ranked" || token === "pro") {
    h2hMode = "ranked";
  } else if (token === "classic" || token === "casual") {
    h2hMode = "classic";
  }

  if (
    token === "chooser" ||
    token === "home" ||
    token === "modes" ||
    token === "play" ||
    token === "menu"
  ) {
    return { section: "chooser", h2hMode: null };
  }
  if (
    token === "daily" ||
    token === "dailydraft" ||
    token === "daily-draft" ||
    token === "draft"
  ) {
    return { section: "daily", h2hMode: null };
  }
  if (
    token === "headtohead" ||
    token === "head-to-head" ||
    token === "h2h" ||
    token === "classic" ||
    token === "casual" ||
    token === "ranked" ||
    token === "pro"
  ) {
    return { section: "headToHead", h2hMode };
  }
  if (token === "events" || token === "event" || token === "weekly") {
    return { section: "events", h2hMode: null };
  }

  return { section: null, h2hMode: null };
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
    if (section !== "headToHead") {
      sessionStorage.removeItem(LANDING_H2H_MODE_KEY);
    }
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
};

export const loadLandingH2hMode = (): LandingH2hMode | null => {
  try {
    const stored = sessionStorage.getItem(LANDING_H2H_MODE_KEY);
    if (isLandingH2hMode(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }

  return null;
};

export const saveLandingH2hMode = (mode: LandingH2hMode) => {
  try {
    sessionStorage.setItem(LANDING_H2H_MODE_KEY, mode);
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
};

export const clearLandingH2hMode = () => {
  try {
    sessionStorage.removeItem(LANDING_H2H_MODE_KEY);
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
};

/**
 * Read `?hub=` / `?play=` / `?view=` / `?post=` from a search string, persist
 * content/play to sessionStorage, and report any feature-page deep link
 * (community/ranks). Existing `?tierList=` handling stays in App and is
 * preserved by URL sync.
 */
export const applyLandingDeepLinksFromSearch = (
  search: string,
): LandingDeepLinkBoot => {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const hub = parseLandingHubParam(params.get("hub"));
  const { section: playSection, h2hMode } = parseLandingPlayWithH2h(
    params.get("play"),
  );
  const viewToken = normalizeQueryToken(params.get("view") ?? "");
  const postRaw = params.get("post")?.trim() ?? "";
  const communityPostId = postRaw ? postRaw.slice(0, 80) : null;
  const betaSectionRaw = params.get("section")?.trim() ?? "";
  const betaSection = betaSectionRaw ? betaSectionRaw.slice(0, 40) : null;

  let contentTab: LandingContentTab | null = null;
  let feature: LandingDeepLinkFeature | null = null;
  let communityView: LandingCommunityView | null = null;

  if (h2hMode) {
    saveLandingH2hMode(h2hMode);
  }

  if (hub === "play" || hub === "roster" || hub === "account") {
    contentTab = hub;
    saveLandingHubTab(hub);
  } else if (hub) {
    const fromHub = featureFromHubDeepLink(hub);
    if (fromHub) {
      feature = fromHub;
      contentTab = parentTabForFeature(fromHub);
      saveLandingHubTab(contentTab);
    }
  }

  if (
    viewToken === "posts" ||
    viewToken === "post" ||
    viewToken === "feed"
  ) {
    communityView = "posts";
    feature = feature ?? "tierList";
  } else if (
    viewToken === "tiers" ||
    viewToken === "tier" ||
    viewToken === "tier-lists" ||
    viewToken === "tierlists"
  ) {
    communityView = "tiers";
    feature = feature ?? "tierList";
  }

  if (communityPostId) {
    communityView = "posts";
    feature = feature ?? "tierList";
  }

  if (playSection) {
    saveLandingPlaySection(playSection);
    // Play deep links land on the Play hub unless a feature hub won.
    if (!feature) {
      contentTab = contentTab ?? "play";
      saveLandingHubTab(contentTab);
    }
  }

  return {
    contentTab,
    playSection,
    h2hMode,
    feature,
    communityView,
    communityPostId,
    betaSection: feature === "beta" ? betaSection : null,
  };
};

export interface SyncLandingDeepLinkUrlOptions {
  hub?: LandingHubDeepLink | null;
  play?: LandingPlaySection | null;
  h2hMode?: LandingH2hMode | null;
  view?: LandingCommunityView | null;
  post?: string | null;
  section?: string | null;
  /** When false, drop hub/play params (e.g. leaving the landing surface). */
  clearLandingParams?: boolean;
}

/** Sync hub/play/view/post query params via replaceState; preserves `tierList`. */
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
      url.searchParams.delete("view");
      url.searchParams.delete("post");
      url.searchParams.delete("section");
    } else {
      if (options.hub != null) {
        const hubParam =
          options.hub === "standings"
            ? "ranks"
            : options.hub === "roster"
              ? "franchise"
              : options.hub;
        url.searchParams.set("hub", hubParam);
        if (hubParam !== "play" && options.play === undefined) {
          url.searchParams.delete("play");
        }
        // Feature hubs don't use community view/post params.
        if (
          hubParam !== "community" &&
          options.view === undefined &&
          options.post === undefined
        ) {
          url.searchParams.delete("view");
          url.searchParams.delete("post");
        }
        if (hubParam !== "beta" && options.section === undefined) {
          url.searchParams.delete("section");
        }
      }
      if (options.play === null) {
        url.searchParams.delete("play");
      } else if (options.play != null) {
        const playParam =
          options.play === "headToHead" && options.h2hMode
            ? options.h2hMode
            : options.play;
        url.searchParams.set("play", playParam);
        if (options.hub == null && !url.searchParams.get("hub")) {
          url.searchParams.set("hub", "play");
        }
      }
      if (options.view === null) {
        url.searchParams.delete("view");
      } else if (options.view != null) {
        url.searchParams.set("view", options.view);
      }
      if (options.post === null) {
        url.searchParams.delete("post");
      } else if (options.post != null && options.post.trim()) {
        url.searchParams.set("post", options.post.trim().slice(0, 80));
      }
      if (options.section === null) {
        url.searchParams.delete("section");
      } else if (options.section != null && options.section.trim()) {
        url.searchParams.set("section", options.section.trim().slice(0, 40));
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

/** Absolute share URL for a community post deep link. */
export const buildCommunityPostShareUrl = (postId: string) => {
  const id = postId.trim().slice(0, 80);
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://www.draftdaygm.com";
  const url = new URL(origin);
  url.searchParams.set("hub", "community");
  url.searchParams.set("view", "posts");
  if (id) {
    url.searchParams.set("post", id);
  }
  return url.toString();
};

/** Absolute share URL for the Community hub or a nested view. */
export const buildCommunityHubShareUrl = (
  view: LandingCommunityView | null = null,
) => {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://www.draftdaygm.com";
  const url = new URL(origin);
  url.searchParams.set("hub", "community");
  if (view) {
    url.searchParams.set("view", view);
  }
  return url.toString();
};

/** Absolute share URL for Ranks / leaderboard hub. */
export const buildRanksHubShareUrl = () => {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://www.draftdaygm.com";
  const url = new URL(origin);
  url.searchParams.set("hub", "ranks");
  return url.toString();
};
