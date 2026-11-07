import {
  searchPlayers,
  sortPlayers,
  type PlayerPickerSort,
  type PlayerSearchFilters,
  type TierPlayer,
} from "../tierListComposer/nbaActivePlayers";

export type SuggestedPickerSort = PlayerPickerSort | "night";

export interface SuggestedPickerRow {
  id: string;
  badge?: string;
  meta?: string;
  live?: boolean;
  player: TierPlayer;
}

/** Night PTS from rec badge/meta (`40 PTS`, `19/4/2`), else null. */
export const recLinePoints = (row: {
  badge?: string;
  meta?: string;
}) => {
  const text = `${row.badge ?? ""} ${row.meta ?? ""}`;
  const labeled = text.match(/(\d+(?:\.\d+)?)\s*PTS\b/i);
  if (labeled) {
    return Number(labeled[1]);
  }
  const slash = text.match(/(?:^|\s)(\d+)\s*\/\s*\d+\s*\/\s*\d+/);
  if (slash) {
    return Number(slash[1]);
  }
  return null;
};

const familyName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || name;
};

/** Name search + board filters, then Name/Points sort, on gold recs. */
export const filterSuggestedPickerRows = (
  rows: SuggestedPickerRow[],
  options: {
    query: string;
    filters?: PlayerSearchFilters;
    sort?: SuggestedPickerSort;
  },
): SuggestedPickerRow[] => {
  const { query, filters = {}, sort = "night" } = options;
  const allowed = new Set(
    searchPlayers(
      query,
      filters,
      rows.map((row) => row.player),
    ).map((player) => player.id),
  );
  const matched = rows.filter((row) => allowed.has(row.id));
  if (sort === "points") {
    return matched.slice().sort((left, right) => {
      const leftPts = recLinePoints(left) ?? left.player.ppg;
      const rightPts = recLinePoints(right) ?? right.player.ppg;
      return (
        rightPts - leftPts ||
        familyName(left.player.name).localeCompare(
          familyName(right.player.name),
        ) ||
        left.player.id.localeCompare(right.player.id)
      );
    });
  }
  if (sort === "depth") {
    const order = new Map(
      sortPlayers(
        matched.map((row) => row.player),
        "depth",
      ).map((player, index) => [player.id, index]),
    );
    return matched
      .slice()
      .sort(
        (left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0),
      );
  }
  if (sort === "name") {
    return matched.slice().sort(
      (left, right) =>
        familyName(left.player.name).localeCompare(
          familyName(right.player.name),
        ) ||
        left.player.name.localeCompare(right.player.name) ||
        left.player.id.localeCompare(right.player.id),
    );
  }
  return matched;
};
