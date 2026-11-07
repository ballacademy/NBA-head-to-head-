import { describe, expect, it } from "vitest";
import {
  EMPTY_PLAYER_FILTERS,
  EXAMPLE_PLAYER_IDS,
  getPlayer,
} from "../tierListComposer/nbaActivePlayers";
import {
  filterSuggestedPickerRows,
  recLinePoints,
  type SuggestedPickerRow,
} from "./pickerSuggested";

const row = (
  id: string,
  meta: string,
  badge?: string,
): SuggestedPickerRow => {
  const player = getPlayer(id)!;
  return { id, meta, badge, player };
};

describe("picker suggested recs", () => {
  it("reads night PTS from rec badge or box-score line", () => {
    expect(recLinePoints({ badge: "40 PTS" })).toBe(40);
    expect(recLinePoints({ meta: "19/4/2" })).toBe(19);
    expect(recLinePoints({ meta: "33 PTS · 8-10 FG" })).toBe(33);
    expect(recLinePoints({ meta: "Hot night" })).toBeNull();
  });

  it("filters gold recs by name search and sorts them by points", () => {
    const recs = [
      row(EXAMPLE_PLAYER_IDS.jokic, "22/12/8"),
      row(EXAMPLE_PLAYER_IDS.curry, "40 PTS"),
      row(EXAMPLE_PLAYER_IDS.luka, "18/9/7"),
    ];
    expect(
      filterSuggestedPickerRows(recs, { query: "", sort: "name" }).map(
        (item) => item.id,
      ),
    ).toEqual([
      EXAMPLE_PLAYER_IDS.luka,
      EXAMPLE_PLAYER_IDS.jokic,
      EXAMPLE_PLAYER_IDS.curry,
    ]);
    expect(
      filterSuggestedPickerRows(recs, { query: "curry", sort: "name" }).map(
        (item) => item.id,
      ),
    ).toEqual([EXAMPLE_PLAYER_IDS.curry]);
    expect(
      filterSuggestedPickerRows(recs, { query: "ant", sort: "name" }).map(
        (item) => item.id,
      ),
    ).toEqual([]);
    expect(
      filterSuggestedPickerRows(recs, { query: "", sort: "points" }).map(
        (item) => item.id,
      ),
    ).toEqual([
      EXAMPLE_PLAYER_IDS.curry,
      EXAMPLE_PLAYER_IDS.jokic,
      EXAMPLE_PLAYER_IDS.luka,
    ]);
    expect(
      filterSuggestedPickerRows(recs, {
        query: "",
        sort: "name",
        filters: { ...EMPTY_PLAYER_FILTERS, team: "GSW" },
      }).map((item) => item.id),
    ).toEqual([EXAMPLE_PLAYER_IDS.curry]);
  });
});
