export type ComposerMode =
  | "standings"
  | "tier"
  | "every-team"
  | "player-of-the-day"
  | "potd-leaderboard"
  | "team-of-the-week"
  | "team-of-the-week-plus"
  | "ranked-lineups"
  | "lineup"
  | "pyramid"
  | "headline"
  | "compare"
  | "quote"
  | "play-in"
  | "stat-card"
  | "stat-card-cover"
  | "mock-trade"
  | "plot";

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
const TEAM_OF_THE_WEEK_PLUS_PATHS = new Set([
  "/team-of-the-week-plus",
  "/totw-plus",
  "/team-of-week-plus",
]);
const TEAM_OF_THE_WEEK_PLUS_QUERY = new Set([
  "team-of-the-week-plus",
  "totw-plus",
  "team-of-week-plus",
]);
const RANKED_LINEUPS_PATHS = new Set([
  "/ranked-lineups",
  "/ranked-lineup",
  "/lineups",
]);
const RANKED_LINEUPS_QUERY = new Set([
  "ranked-lineups",
  "ranked-lineup",
  "lineups",
]);
const LINEUP_PATHS = new Set(["/lineup", "/starting-lineup"]);
const LINEUP_QUERY = new Set(["lineup", "starting-lineup"]);
const PYRAMID_PATHS = new Set(["/pyramid", "/coy-pyramid"]);
const PYRAMID_QUERY = new Set(["pyramid", "coy-pyramid"]);
const HEADLINE_PATHS = new Set(["/headline", "/hot-take", "/hottake"]);
const HEADLINE_QUERY = new Set(["headline", "hot-take", "hottake"]);
const COMPARE_PATHS = new Set(["/compare", "/comparison", "/split"]);
const COMPARE_QUERY = new Set(["compare", "comparison", "split"]);
const QUOTE_PATHS = new Set(["/quote", "/pull-quote"]);
const QUOTE_QUERY = new Set(["quote", "pull-quote"]);
const PLAY_IN_PATHS = new Set(["/play-in", "/playin", "/mini-bracket"]);
const PLAY_IN_QUERY = new Set(["play-in", "playin", "mini-bracket"]);
const STAT_CARD_PATHS = new Set(["/stat-card", "/statcard", "/player-card"]);
const STAT_CARD_QUERY = new Set(["stat-card", "statcard", "player-card"]);
const STAT_CARD_COVER_PATHS = new Set([
  "/stat-card-cover",
  "/stat-cover",
  "/cover",
]);
const STAT_CARD_COVER_QUERY = new Set([
  "stat-card-cover",
  "stat-cover",
  "cover",
]);
const MOCK_TRADE_PATHS = new Set([
  "/mock-trade",
  "/mocktrade",
  "/trade-machine",
]);
const MOCK_TRADE_QUERY = new Set([
  "mock-trade",
  "mocktrade",
  "trade-machine",
]);
const PLOT_PATHS = new Set(["/plot", "/scatter", "/xy"]);
const PLOT_QUERY = new Set(["plot", "scatter", "xy"]);

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

export const isTeamOfTheWeekPlusPath = (pathname: string) =>
  TEAM_OF_THE_WEEK_PLUS_PATHS.has(normalizePath(pathname));

export const isTeamOfTheWeekPlusQuery = (search: string) => {
  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    const token = params.get("composer")?.trim().toLowerCase() ?? "";
    return TEAM_OF_THE_WEEK_PLUS_QUERY.has(token);
  } catch {
    return false;
  }
};

export const isRankedLineupsPath = (pathname: string) =>
  RANKED_LINEUPS_PATHS.has(normalizePath(pathname));

export const isRankedLineupsQuery = (search: string) => {
  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    const token = params.get("composer")?.trim().toLowerCase() ?? "";
    return RANKED_LINEUPS_QUERY.has(token);
  } catch {
    return false;
  }
};

export const isPyramidPath = (pathname: string) =>
  PYRAMID_PATHS.has(normalizePath(pathname));

export const isPyramidQuery = (search: string) => {
  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    const token = params.get("composer")?.trim().toLowerCase() ?? "";
    return PYRAMID_QUERY.has(token);
  } catch {
    return false;
  }
};

export const isHeadlinePath = (pathname: string) =>
  HEADLINE_PATHS.has(normalizePath(pathname));

export const isHeadlineQuery = (search: string) => {
  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    const token = params.get("composer")?.trim().toLowerCase() ?? "";
    return HEADLINE_QUERY.has(token);
  } catch {
    return false;
  }
};

const queryToken = (search: string) => {
  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    return params.get("composer")?.trim().toLowerCase() ?? "";
  } catch {
    return "";
  }
};

export const isLineupPath = (pathname: string) =>
  LINEUP_PATHS.has(normalizePath(pathname));

export const isLineupQuery = (search: string) => LINEUP_QUERY.has(queryToken(search));

export const isComparePath = (pathname: string) =>
  COMPARE_PATHS.has(normalizePath(pathname));

export const isCompareQuery = (search: string) =>
  COMPARE_QUERY.has(queryToken(search));

export const isQuotePath = (pathname: string) =>
  QUOTE_PATHS.has(normalizePath(pathname));

export const isQuoteQuery = (search: string) => QUOTE_QUERY.has(queryToken(search));

export const isPlayInPath = (pathname: string) =>
  PLAY_IN_PATHS.has(normalizePath(pathname));

export const isPlayInQuery = (search: string) =>
  PLAY_IN_QUERY.has(queryToken(search));

export const isStatCardPath = (pathname: string) =>
  STAT_CARD_PATHS.has(normalizePath(pathname));

export const isStatCardQuery = (search: string) =>
  STAT_CARD_QUERY.has(queryToken(search));

export const isStatCardCoverPath = (pathname: string) =>
  STAT_CARD_COVER_PATHS.has(normalizePath(pathname));

export const isStatCardCoverQuery = (search: string) =>
  STAT_CARD_COVER_QUERY.has(queryToken(search));

export const isMockTradePath = (pathname: string) =>
  MOCK_TRADE_PATHS.has(normalizePath(pathname));

export const isPlotPath = (pathname: string) =>
  PLOT_PATHS.has(normalizePath(pathname));

export const isPlotQuery = (search: string) =>
  PLOT_QUERY.has(queryToken(search));

export const isMockTradeQuery = (search: string) =>
  MOCK_TRADE_QUERY.has(queryToken(search));

export const readComposerMode = (
  search = typeof window !== "undefined" ? window.location.search : "",
  pathname = typeof window !== "undefined" ? window.location.pathname : "/",
): ComposerMode => {
  if (isPlotPath(pathname)) {
    return "plot";
  }
  if (isMockTradePath(pathname)) {
    return "mock-trade";
  }
  if (isHeadlinePath(pathname)) {
    return "headline";
  }
  if (isPyramidPath(pathname)) {
    return "pyramid";
  }
  if (isComparePath(pathname)) {
    return "compare";
  }
  if (isQuotePath(pathname)) {
    return "quote";
  }
  if (isPlayInPath(pathname)) {
    return "play-in";
  }
  if (isStatCardCoverPath(pathname)) {
    return "stat-card-cover";
  }
  if (isStatCardPath(pathname)) {
    return "stat-card";
  }
  if (isLineupPath(pathname)) {
    return "lineup";
  }
  if (isRankedLineupsPath(pathname)) {
    return "ranked-lineups";
  }
  if (isTeamOfTheWeekPlusPath(pathname)) {
    return "team-of-the-week-plus";
  }
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
  if (isPlotQuery(search)) {
    return "plot";
  }
  if (isMockTradeQuery(search)) {
    return "mock-trade";
  }
  if (isHeadlineQuery(search)) {
    return "headline";
  }
  if (isPyramidQuery(search)) {
    return "pyramid";
  }
  if (isCompareQuery(search)) {
    return "compare";
  }
  if (isQuoteQuery(search)) {
    return "quote";
  }
  if (isPlayInQuery(search)) {
    return "play-in";
  }
  if (isStatCardCoverQuery(search)) {
    return "stat-card-cover";
  }
  if (isStatCardQuery(search)) {
    return "stat-card";
  }
  if (isLineupQuery(search)) {
    return "lineup";
  }
  if (isRankedLineupsQuery(search)) {
    return "ranked-lineups";
  }
  if (isTeamOfTheWeekPlusQuery(search)) {
    return "team-of-the-week-plus";
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
  if (mode === "team-of-the-week-plus") {
    return "/team-of-the-week-plus";
  }
  if (mode === "ranked-lineups") {
    return "/ranked-lineups";
  }
  if (mode === "lineup") {
    return "/lineup";
  }
  if (mode === "pyramid") {
    return "/pyramid";
  }
  if (mode === "plot") {
    return "/plot";
  }
  if (mode === "mock-trade") {
    return "/mock-trade";
  }
  if (mode === "headline") {
    return "/headline";
  }
  if (mode === "compare") {
    return "/compare";
  }
  if (mode === "quote") {
    return "/quote";
  }
  if (mode === "play-in") {
    return "/play-in";
  }
  if (mode === "stat-card-cover") {
    return "/stat-card-cover";
  }
  if (mode === "stat-card") {
    return "/stat-card";
  }
  return "/";
};
