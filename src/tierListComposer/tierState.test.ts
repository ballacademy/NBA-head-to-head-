import { describe, expect, it } from "vitest";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";
import {
  BA_LOGO_SRC,
  baBadgeRect,
  cellGridPosition,
  cellSize,
  rowMetrics,
  TIER_BADGE_INSET,
  TIER_BADGE_SIZE,
  TIER_CELL_GAP,
  TIER_CELL_MAX,
  PLAYER_LOGO_WATERMARK_ALPHA,
  TIER_FOOTER,
  TIER_HEADER_H,
  TIER_LABEL_MAX_LENGTH,
  TIER_LABEL_SIZE_ONE,
  TIER_TITLE_SIZE,
  TIER_PAD_RIGHT,
  TIER_WRAP_COLS,
  labelFontSize,
  layoutTierLabel,
  tierBoardLayout,
  tierLaneCount,
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
  DEFAULT_TIER_COLOR,
  hexToRgba,
  isDefaultTierColor,
  parseTierColor,
  setTierColor,
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
    expect(setTierLabel(rows, 0, "All-Stars")[0]!.label).toBe("All-Stars");
    expect(setTierLabel(rows, 0, "Role Players")[0]!.label).toBe("Role Players");
    expect(setTierLabel(rows, 0, "ROLE PLAYERS")[0]!.label).toBe("ROLE PLAYERS");
    expect(setTierLabel(rows, 0, "All NBA First Team")[0]!.label).toBe(
      "All NBA First Team",
    );
    expect(TIER_LABEL_MAX_LENGTH).toBeGreaterThanOrEqual(48);
    expect(setTierLabel(rows, 0, "x".repeat(80))[0]!.label).toHaveLength(
      TIER_LABEL_MAX_LENGTH,
    );
    const titleLines = splitTierTitle(DEFAULT_TIER_TITLE);
    expect(titleLines).toHaveLength(2);
    expect(`${titleLines[0]} ${titleLines[1]}`).toBe(DEFAULT_TIER_TITLE);
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
    expect(TIER_BADGE_SIZE).toBeGreaterThanOrEqual(72);
    expect(TIER_HEADER_H).toBeGreaterThan(128);
    expect(TIER_HEADER_H).toBeLessThan(200);
    expect(TIER_HEADER_H / GRAPHIC_HEIGHT).toBeLessThan(0.14);
    expect(TIER_TITLE_SIZE).toBeGreaterThan(32);
    expect(TIER_TITLE_SIZE).toBeLessThan(50);
  });

  it("pads the BA lockup equally from the top and right edges", () => {
    const badge = baBadgeRect();
    expect(TIER_BADGE_INSET).toBe((TIER_HEADER_H - TIER_BADGE_SIZE) / 2);
    expect(badge.y).toBe(TIER_BADGE_INSET);
    expect(GRAPHIC_WIDTH - badge.x - badge.size).toBe(TIER_BADGE_INSET);
    expect(TIER_BADGE_INSET).toBeGreaterThan(TIER_PAD_RIGHT);
  });

  it("keeps cells square and capped", () => {
    const { rowH } = rowMetrics(6);
    const empty = cellSize(rowH, 1000, 1);
    const packed = cellSize(rowH, 1000, 8);
    expect(empty).toBeLessThanOrEqual(TIER_CELL_MAX);
    expect(packed).toBeLessThan(empty);
    expect(rowMetrics(10).rowH).toBeLessThan(rowMetrics(3).rowH);
  });

  it("grows a tier and wraps after 8 logos instead of shrinking", () => {
    expect(TIER_WRAP_COLS).toBe(8);
    expect(tierLaneCount(0)).toBe(1);
    expect(tierLaneCount(8)).toBe(1);
    expect(tierLaneCount(9)).toBe(2);
    expect(tierLaneCount(16)).toBe(2);
    expect(tierLaneCount(17)).toBe(3);
    expect(cellGridPosition(7)).toEqual({ col: 7, wrapRow: 0 });
    expect(cellGridPosition(8)).toEqual({ col: 0, wrapRow: 1 });

    const eight = tierBoardLayout([8, 1, 1, 1, 1, 1]);
    const nine = tierBoardLayout([9, 1, 1, 1, 1, 1]);
    expect(eight.lanes[0]).toBe(1);
    expect(nine.lanes[0]).toBe(2);
    expect(nine.totalLanes).toBe(eight.totalLanes + 1);
    expect(nine.gridTemplate).toBe("2fr 1fr 1fr 1fr 1fr 1fr");
    expect(nine.lanes[0]! * nine.laneH).toBeGreaterThan(eight.laneH);
    expect(nine.size).toBe(cellSize(nine.laneH, nine.contentW, TIER_WRAP_COLS));
    const squeezedOntoOneRow =
      (nine.contentW - TIER_CELL_GAP * 8) / 9;
    expect(nine.size).toBeGreaterThan(squeezedOntoOneRow);
  });

  it("fits player watermark logos to the shared cell size", () => {
    expect(PLAYER_LOGO_WATERMARK_ALPHA).toBe(0.22);
    const wrapped = tierBoardLayout([9, 1, 1, 1, 1, 1]);
    expect(wrapped.size).toBe(
      cellSize(wrapped.laneH, wrapped.contentW, TIER_WRAP_COLS),
    );
  });

  it("gives every one-letter label the same size and wraps long names", () => {
    const letters = ["S", "A", "B", "C", "D", "F"].map((letter) =>
      layoutTierLabel(letter),
    );
    expect(letters.every((item) => item.fontSize === TIER_LABEL_SIZE_ONE)).toBe(
      true,
    );
    expect(labelFontSize("S")).toBe(labelFontSize("A"));
    const allStars = layoutTierLabel("All-Stars");
    expect(allStars.lines.join("")).toMatch(/ALL-STARS/i);
    expect(allStars.fontSize).toBeGreaterThanOrEqual(16);
    const role = layoutTierLabel("ROLE PLAYERS");
    expect(role.lines.length).toBeGreaterThan(1);
    expect(role.lines.join(" ")).toMatch(/ROLE PLAYERS/i);
    const firstTeam = layoutTierLabel("All NBA First Team");
    expect(firstTeam.lines.length).toBeGreaterThan(1);
    expect(firstTeam.lines.join(" ").replace(/\s+/g, " ")).toMatch(
      /ALL NBA FIRST TEAM/i,
    );
    const grown = tierBoardLayout(
      [1, 1, 1, 1, 1, 1],
      role.lines.length > 1 ? [role.lines.length, 1, 1, 1, 1, 1] : undefined,
    );
    const even = tierBoardLayout([1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1]);
    expect(grown.lanes[0]).toBeGreaterThan(even.lanes[0]!);
    expect(even.size).toBeGreaterThan(120);
  });

  it("fills the 4:5 body for 3, 6, and 10 tiers", () => {
    const three = tierBoardLayout([1, 1, 1]);
    const six = tierBoardLayout([1, 1, 1, 1, 1, 1]);
    const ten = tierBoardLayout(Array.from({ length: 10 }, () => 1));
    for (const layout of [three, six, ten]) {
      expect(layout.laneH * layout.totalLanes).toBeCloseTo(layout.bodyH, 8);
      expect(layout.bodyH).toBe(GRAPHIC_HEIGHT - TIER_HEADER_H - TIER_FOOTER);
      expect(layout.gridTemplate.split(" ").every((part) => part.endsWith("fr"))).toBe(
        true,
      );
    }
    expect(three.laneH).toBeGreaterThan(six.laneH);
    expect(six.laneH).toBeGreaterThan(ten.laneH);
    expect(three.gridTemplate).toBe("1fr 1fr 1fr");
  });
});

describe("tier colors", () => {
  it("defaults to white and stores a picked hex", () => {
    expect(parseTierColor(undefined)).toBe(DEFAULT_TIER_COLOR);
    expect(parseTierColor("#F90")).toBe("#ff9900");
    expect(parseTierColor("nope")).toBe(DEFAULT_TIER_COLOR);
    expect(isDefaultTierColor("#FFFFFF")).toBe(true);
    expect(hexToRgba("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
    const gold = setTierColor(createDefaultRows(), 0, "#E2B007");
    expect(gold[0]!.color).toBe("#e2b007");
    expect(setTierColor(gold, 0, "#fff")[0]!.color).toBeUndefined();
    expect(createDefaultRows().every((row) => row.color === undefined)).toBe(
      true,
    );
  });
});
