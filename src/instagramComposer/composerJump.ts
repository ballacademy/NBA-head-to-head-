import type { ComposerMode } from "./composerMode";

export interface ComposerJumpTab {
  mode: ComposerMode;
  label: string;
}

const ALIASES: Array<{ needle: string; mode: ComposerMode }> = [
  { needle: "head", mode: "headline" },
  { needle: "hl", mode: "headline" },
  { needle: "potd", mode: "player-of-the-day" },
  { needle: "totw+", mode: "team-of-the-week-plus" },
  { needle: "totw plus", mode: "team-of-the-week-plus" },
  { needle: "shots", mode: "shot-chart" },
  { needle: "picks", mode: "picks" },
  { needle: "locks", mode: "picks" },
  { needle: "spreads", mode: "picks" },
  { needle: "xy", mode: "plot" },
  { needle: "scatter", mode: "plot" },
];

export const composerJumpHaystack = (tab: ComposerJumpTab) =>
  `${tab.label} ${tab.mode}`.toLowerCase();

export const matchingComposerTabs = (
  query: string,
  tabs: ComposerJumpTab[],
) => {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return tabs;
  }
  const aliased = new Set(
    ALIASES.filter(
      (row) =>
        needle === row.needle ||
        row.needle.startsWith(needle) ||
        needle.startsWith(row.needle),
    ).map((row) => row.mode),
  );
  return tabs.filter(
    (tab) => aliased.has(tab.mode) || composerJumpHaystack(tab).includes(needle),
  );
};

/** Unique hit so typing `head` opens Headline instead of only filtering. */
export const jumpComposerMode = (
  query: string,
  tabs: ComposerJumpTab[],
): ComposerMode | null => {
  const hits = matchingComposerTabs(query, tabs);
  if (!query.trim()) {
    return null;
  }
  if (hits.length === 1) {
    return hits[0]!.mode;
  }
  const exact = hits.find(
    (tab) => tab.label.toLowerCase() === query.trim().toLowerCase(),
  );
  return exact?.mode ?? null;
};
