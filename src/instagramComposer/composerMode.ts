export type ComposerMode = "standings" | "tier" | "every-team";

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

const normalizePath = (pathname: string) => pathname.replace(/\/+$/, "") || "/";

export const isTierListPath = (pathname: string) =>
  TIER_PATHS.has(normalizePath(pathname));

export const isEveryTeamPath = (pathname: string) =>
  EVERY_TEAM_PATHS.has(normalizePath(pathname));

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

export const readComposerMode = (
  search = typeof window !== "undefined" ? window.location.search : "",
  pathname = typeof window !== "undefined" ? window.location.pathname : "/",
): ComposerMode => {
  if (isEveryTeamPath(pathname)) {
    return "every-team";
  }
  if (isTierListPath(pathname)) {
    return "tier";
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
  return "/";
};
