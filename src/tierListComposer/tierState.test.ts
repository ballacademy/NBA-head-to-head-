import { describe, expect, it } from "vitest";
import {
  BA_LOGO_SRC,
  cellSize,
  rowMetrics,
  TIER_BADGE_SIZE,
  TIER_CELL_MAX,
} from "./tierLayout";
import {
  addTeamToRow,
  addTier,
  createDefaultRows,
  createExampleRows,
  DEFAULT_TIER_TITLE,
  EXAMPLE_TIER_PLACEMENT,
  exportTierFilename,
  isTierDraft,
  MAX_TIERS,
  MIN_TIERS,
  placeTeamAt,
  removeLastTier,
  removeTeamFromRow,
  replaceTeamInRow,
  setTierLabel,
  splitTierTitle,
  usedLabelsForPicker,
  usedTeamIds,
} from "./tierState";

describe("tier rows", () => {
  it("defaults to six S–F rows", () => {
    const rows = createDefaultRows();
    expect(rows).toHaveLength(6);
    expect(rows.map((row) => row.label)).toEqual(["S", "A", "B", "C", "D", "F"]);
    expect(rows.every((row) => row.teams.length === 0)).toBe(true);
  });

  it("adds tiers up to 10 and will not go below 3", () => {
    let rows = createDefaultRows();
    for (let i = 0; i < 8; i += 1) {
      rows = addTier(rows);
    }
    expect(rows).toHaveLength(MAX_TIERS);
    expect(rows.slice(6).map((row) => row.label)).toEqual(["G", "H", "I", "J"]);
    expect(addTier(rows)).toHaveLength(MAX_TIERS);

    for (let i = 0; i < 12; i += 1) {
      rows = removeLastTier(rows);
    }
    expect(rows).toHaveLength(MIN_TIERS);
    expect(rows.map((row) => row.label)).toEqual(["S", "A", "B"]);
  });

  it("adds, moves, replaces, and removes logos", () => {
    let rows = createDefaultRows();
    rows = addTeamToRow(rows, 0, "LAL");
    rows = addTeamToRow(rows, 0, "BOS");
    rows = addTeamToRow(rows, 1, "LAL");
    expect(rows[0]!.teams).toEqual(["BOS"]);
    expect(rows[1]!.teams).toEqual(["LAL"]);
    rows = replaceTeamInRow(rows, 1, "LAL", "CHI");
    expect(rows[1]!.teams).toEqual(["CHI"]);
    rows = removeTeamFromRow(rows, 0, "BOS");
    expect(rows[0]!.teams).toEqual([]);
    expect([...usedTeamIds(rows)]).toEqual(["CHI"]);
  });

  it("reorders within a row and across rows", () => {
    let rows = createDefaultRows();
    rows = addTeamToRow(rows, 0, "LAL");
    rows = addTeamToRow(rows, 0, "BOS");
    rows = addTeamToRow(rows, 0, "NYK");
    rows = placeTeamAt(rows, 0, 0, "NYK");
    expect(rows[0]!.teams).toEqual(["NYK", "LAL", "BOS"]);
    rows = placeTeamAt(rows, 2, 0, "LAL");
    expect(rows[0]!.teams).toEqual(["NYK", "BOS"]);
    expect(rows[2]!.teams).toEqual(["LAL"]);
  });

  it("edits labels and titles", () => {
    const rows = setTierLabel(createDefaultRows(), 0, "ELITE!!!");
    expect(rows[0]!.label).toBe("ELITE!!!");
    expect(setTierLabel(rows, 0, "TOOLONGNAME")[0]!.label).toHaveLength(8);
    expect(splitTierTitle(DEFAULT_TIER_TITLE)).toEqual([
      "GUESS THE NBA",
      "TIER LIST",
    ]);
    expect(splitTierTitle("WESTERN")).toEqual(["WESTERN"]);
    expect(exportTierFilename(DEFAULT_TIER_TITLE)).toBe(
      "guess-the-nba-tier-list.png",
    );
  });

  it("accepts a stored draft and labels used teams for the picker", () => {
    const rows = createExampleRows();
    expect(isTierDraft({ title: DEFAULT_TIER_TITLE, rows })).toBe(true);
    expect(isTierDraft({ title: "x", rows: [] })).toBe(false);
    expect(usedTeamIds(rows).size).toBe(30);
    expect(EXAMPLE_TIER_PLACEMENT).toHaveLength(6);
    expect(usedLabelsForPicker(rows, 0, "LAL").LAL).toBe("This slot");
    expect(usedLabelsForPicker(rows, 0).CHI).toBe("On A");
  });
});

describe("tier layout", () => {
  it("uses the circled BA lockup, not a drawn circle", () => {
    expect(BA_LOGO_SRC).toBe("/ba-logo-circled.png");
    expect(TIER_BADGE_SIZE).toBeGreaterThanOrEqual(100);
  });

  it("keeps cells square and capped", () => {
    const { rowH } = rowMetrics(6);
    const empty = cellSize(rowH, 1000, 1);
    const packed = cellSize(rowH, 1000, 8);
    expect(empty).toBeLessThanOrEqual(TIER_CELL_MAX);
    expect(packed).toBeLessThan(empty);
    expect(rowMetrics(10).rowH).toBeLessThan(rowMetrics(3).rowH);
  });
});
