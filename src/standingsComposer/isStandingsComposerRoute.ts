const COMPOSER_HUB_TOKENS = new Set([
  "rankings",
  "standings-graphic",
  "ig-rankings",
  "standings-composer",
]);

export const isStandingsComposerHub = (
  value: string | null | undefined,
): boolean => {
  const token = value?.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return Boolean(token && COMPOSER_HUB_TOKENS.has(token));
};

export const isStandingsComposerPath = (pathname: string): boolean => {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (
    path === "/rankings" ||
    path.endsWith("/rankings.html") ||
    path === "/standings-composer"
  );
};

export const isStandingsComposerRoute = (
  search = typeof window !== "undefined" ? window.location.search : "",
  pathname = typeof window !== "undefined" ? window.location.pathname : "/",
): boolean => {
  try {
    const hub = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    ).get("hub");
    return isStandingsComposerHub(hub) || isStandingsComposerPath(pathname);
  } catch {
    return false;
  }
};
