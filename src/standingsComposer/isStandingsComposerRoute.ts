const COMPOSER_HUB_TOKENS = new Set([
  "rankings",
  "standings-graphic",
  "ig-rankings",
  "standings-composer",
]);

/** Explicit Draft Day GM entry — otherwise this branch opens the composer. */
const GAME_APP_HUB_TOKENS = new Set(["play", "draft", "game", "ddgm"]);

const normalizeToken = (value: string | null | undefined) =>
  value?.trim().toLowerCase().replace(/[\s_]+/g, "-") ?? "";

export const isStandingsComposerHub = (
  value: string | null | undefined,
): boolean => {
  const token = normalizeToken(value);
  return Boolean(token && COMPOSER_HUB_TOKENS.has(token));
};

export const isStandingsComposerPath = (pathname: string): boolean => {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (
    path === "/" ||
    path === "/rankings" ||
    path.endsWith("/rankings.html") ||
    path === "/standings-composer" ||
    path === "/tier-list" ||
    path === "/tiers" ||
    path === "/tierlist" ||
    path === "/every-team" ||
    path === "/everyteam" ||
    path === "/by-team" ||
    path === "/byteam"
  );
};

export const isGameAppHub = (value: string | null | undefined): boolean => {
  const token = normalizeToken(value);
  return Boolean(token && GAME_APP_HUB_TOKENS.has(token));
};

/**
 * This branch’s product is the Instagram composer hub. `/`, `/rankings`,
 * `/tier-list`, `/every-team`, and `?hub=rankings` all open it. Draft Day GM
 * only loads for `?hub=play`.
 */
export const isStandingsComposerRoute = (
  search = typeof window !== "undefined" ? window.location.search : "",
  pathname = typeof window !== "undefined" ? window.location.pathname : "/",
): boolean => {
  try {
    const hub = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    ).get("hub");
    if (isGameAppHub(hub)) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
};
