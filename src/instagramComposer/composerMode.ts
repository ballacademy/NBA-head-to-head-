export type ComposerMode = "standings" | "tier";

const TIER_PATHS = new Set(["/tier-list", "/tiers", "/tierlist"]);
const TIER_QUERY = new Set(["tier", "tiers", "tier-list", "tierlist"]);

const normalizePath = (pathname: string) => pathname.replace(/\/+$/, "") || "/";

export const isTierListPath = (pathname: string) =>
  TIER_PATHS.has(normalizePath(pathname));

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

export const readComposerMode = (
  search = typeof window !== "undefined" ? window.location.search : "",
  pathname = typeof window !== "undefined" ? window.location.pathname : "/",
): ComposerMode =>
  isTierListPath(pathname) || isTierListQuery(search) ? "tier" : "standings";

export const composerHref = (mode: ComposerMode) =>
  mode === "tier" ? "/tier-list" : "/";
