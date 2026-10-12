export type ComposerMode =
  | "standings"
  | "tier"
  | "every-team"
  | "player-of-the-day"
  | "potd-leaderboard"
  | "team-of-the-week";

const TIER_PATHS = new Set(["/tier-list", "/tiers", "/tierlist"]);
const TIER_QUERY = new Set(["tier", "tiers", "tier-list", "tierlist"]);
const EVERY_TEAM_PATHS = new Set([
  "/every-team",
  "/everyteam",
  "/by-team",
  "/byteam",
]);
const EVERY_TEAM_QUERY = new Set([
  "every-team",
  "everyteam",
  "by-team",
  "byteam",
]);
const PLAYER_OF_THE_DAY_PATHS = new Set([
  "/player-of-the-day",
  "/potd",
  "/player-of-day",
]);
const PLAYER_OF_THE_DAY_QUERY = new Set([
  "player-of-the-day",
  "potd",
  "player-of-day",
]);
const POTD_LEADERBOARD_PATHS = new Set([
  "/potd-leaderboard",
  "/leaderboard",
  "/potd-lb",
]);
const POTD_LEADERBOARD_QUERY = new Set([
  "potd-leaderboard",
  "leaderboard",
  "potd-lb",
]);
const TEAM_OF_THE_WEEK_PATHS = new Set([
  "/team-of-the-week",
  "/totw",
  "/team-of-week",
]);
const TEAM_OF_THE_WEEK_QUERY = new Set([
  "team-of-the-week",
  "totw",
  "team-of-week",
]);

const normalizePath = (pathname: string) => pathname.replace(/\/+$/, "") || "/";

export const isTierListPath = (pathname: string) =>
  TIER_PATHS.has(normalizePath(pathname));

export const isEveryTeamPath = (pathname: string) =>
  EVERY_TEAM_PATHS.has(normalizePath(pathname));

export const isPlayerOfTheDayPath = (pathname: string) =>
  PLAYER_OF_THE_DAY_PATHS.has(normalizePath(pathname));

export const isTierListQuery = (search: string) => {
  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    const token = params.get("composer")?.trim().toLowerCase() ?? "";
    return TIER_QUERY.has(token);
  } catch {
    return false;
  }
};

export const isEveryTeamQuery = (search: string) => {
  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    const token = params.get("composer")?.trim().toLowerCase() ?? "";
    return EVERY_TEAM_QUERY.has(token);
  } catch {
    return false;
  }
};

export const isPotdLeaderboardPath = (pathname: string) =>
  POTD_LEADERBOARD_PATHS.has(normalizePath(pathname));

export const isPlayerOfTheDayQuery = (search: string) => {
  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    const token = params.get("composer")?.trim().toLowerCase() ?? "";
    return PLAYER_OF_THE_DAY_QUERY.has(token);
  } catch {
    return false;
  }
};

export const isPotdLeaderboardQuery = (search: string) => {
  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    const token = params.get("composer")?.trim().toLowerCase() ?? "";
    return POTD_LEADERBOARD_QUERY.has(token);
  } catch {
    return false;
  }
};

export const isTeamOfTheWeekPath = (pathname: string) =>
  TEAM_OF_THE_WEEK_PATHS.has(normalizePath(pathname));

export const isTeamOfTheWeekQuery = (search: string) => {
  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    const token = params.get("composer")?.trim().toLowerCase() ?? "";
    return TEAM_OF_THE_WEEK_QUERY.has(token);
  } catch {
    return false;
  }
};

export const readComposerMode = (
  search = typeof window !== "undefined" ? window.location.search : "",
  pathname = typeof window !== "undefined" ? window.location.pathname : "/",
): ComposerMode => {
  if (isTeamOfTheWeekPath(pathname)) {
    return "team-of-the-week";
  }
  if (isPotdLeaderboardPath(pathname)) {
    return "potd-leaderboard";
  }
  if (isPlayerOfTheDayPath(pathname)) {
    return "player-of-the-day";
  }
  if (isEveryTeamPath(pathname)) {
    return "every-team";
  }
  if (isTierListPath(pathname)) {
    return "tier";
  }
  if (isTeamOfTheWeekQuery(search)) {
    return "team-of-the-week";
  }
  if (isPotdLeaderboardQuery(search)) {
    return "potd-leaderboard";
  }
  if (isPlayerOfTheDayQuery(search)) {
    return "player-of-the-day";
  }
  if (isEveryTeamQuery(search)) {
    return "every-team";
  }
  if (isTierListQuery(search)) {
    return "tier";
  }
  return "standings";
};

export const composerHref = (mode: ComposerMode) => {
  if (mode === "tier") {
    return "/tier-list";
  }
  if (mode === "every-team") {
    return "/every-team";
  }
  if (mode === "player-of-the-day") {
    return "/player-of-the-day";
  }
  if (mode === "potd-leaderboard") {
    return "/potd-leaderboard";
  }
  if (mode === "team-of-the-week") {
    return "/team-of-the-week";
  }
  return "/";
};
