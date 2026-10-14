import { describe, expect, it } from "vitest";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";
import {
  BA_LOGO_SRC,
  baBadgeRect,
  cellGridPosition,
  cellMetrics,
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
  ADD_CHIP_COMPACT,
  addChipPlacement,
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
  evenChunkSizes,
  EXAMPLE_TIER_PLACEMENT,
  exportTierFilename,
  fillMatchingIds,
  groupIdsByValues,
  isTierDraft,
  MAX_TIERS,
  MIN_TIERS,
  placeTeamAt,
  removeLastTier,
  removeTeamFromRow,
  replaceTeamInRow,
  DEFAULT_TIER_COLOR,
  DEFAULT_TIER_PALETTE,
  fillForBlackInk,
  hexToRgba,
  inkOnTierColor,
  isDefaultTierColor,
  parseTierColor,
  resolvedTierColor,
  setTierColor,
  setTierLabel,
  splitTeamCellName,
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
    expect(
      isTierDraft({ title: DEFAULT_TIER_TITLE, rows, showNames: true }),
    ).toBe(true);
    expect(isTierDraft({ title: "x", rows: [] })).toBe(false);
    expect(usedTeamIds(rows).size).toBe(30);
    expect(EXAMPLE_TIER_PLACEMENT).toHaveLength(6);
    expect(usedLabelsForPicker(rows, 0, "LAL").LAL).toBe("This slot");
    expect(usedLabelsForPicker(rows, 0).CHI).toBe("On A");
  });

  it("splits team names into a centered city + nickname stack", () => {
    expect(splitTeamCellName("Golden State Warriors", "Warriors")).toEqual({
      firstName: "Golden State",
      lastName: "Warriors",
    });
    expect(splitTeamCellName("Portland Trail Blazers", "Trail Blazers")).toEqual({
      firstName: "Portland",
      lastName: "Trail Blazers",
    });
    expect(splitTeamCellName("Minnesota Timberwolves", "Timberwolves")).toEqual({
      firstName: "Minnesota",
      lastName: "Timberwolves",
    });
    expect(splitTeamCellName("LA Clippers", "Clippers")).toEqual({
      firstName: "LA",
      lastName: "Clippers",
    });
  });

  it("populates matching ids onto empty S, then groups highest into S", () => {
    const empty = createDefaultRows();
    const filled = fillMatchingIds(empty, ["OKC", "CHA", "BOS", "NYK", "LAL", "MIA"]);
    expect(filled.added).toBe(6);
    expect(filled.rows[0]!.teams).toEqual([
      "OKC",
      "CHA",
      "BOS",
      "NYK",
      "LAL",
      "MIA",
    ]);
    expect(fillMatchingIds(filled.rows, ["OKC", "CHI"]).added).toBe(1);
    expect(evenChunkSizes(15, 6)).toEqual([3, 3, 3, 2, 2, 2]);
    expect(evenChunkSizes(3, 6)).toEqual([1, 1, 1, 0, 0, 0]);
    const values = new Map<string, number | null>([
      ["OKC", 120],
      ["BOS", 110],
      ["NYK", 100],
      ["LAL", 90],
      ["MIA", 80],
      ["CHA", 70],
    ]);
    const grouped = groupIdsByValues(filled.rows, values);
    expect(grouped[0]!.teams).toEqual(["OKC"]);
    expect(grouped[1]!.teams).toEqual(["BOS"]);
    expect(grouped[2]!.teams).toEqual(["NYK"]);
    expect(grouped[5]!.teams).toEqual(["CHA"]);
    const withGap = groupIdsByValues(filled.rows, new Map([
      ["OKC", 120],
      ["BOS", 110],
      ["NYK", null],
      ["LAL", 90],
      ["MIA", 80],
      ["CHA", 70],
    ]));
    expect(withGap[0]!.teams).toEqual(["OKC"]);
    expect(withGap[5]!.teams).toContain("NYK");
  });
});

describe("tier layout", () => {
  it("uses the circled BA lockup, not a drawn circle", () => {
    expect(BA_LOGO_SRC).toBe("/ba-logo-circled.png");
    expect(TIER_BADGE_SIZE).toBeGreaterThanOrEqual(72);
    expect(TIER_HEADER_H).toBeGreaterThan(128);
    expect(TIER_HEADER_H).toBeLessThan(168);
    expect(TIER_HEADER_H / GRAPHIC_HEIGHT).toBeLessThan(0.12);
    expect(TIER_TITLE_SIZE).toBe(50);
    const twoLineTitleH = TIER_TITLE_SIZE * 1.12 * 2;
    expect(twoLineTitleH + 16).toBeLessThan(TIER_HEADER_H);
  });

  it("pads the BA lockup equally from the top and right edges", () => {
    const badge = baBadgeRect();
    expect(TIER_BADGE_INSET).toBe((TIER_HEADER_H - TIER_BADGE_SIZE) / 2);
    expect(badge.y).toBe(TIER_BADGE_INSET);
    expect(GRAPHIC_WIDTH - badge.x - badge.size).toBe(TIER_BADGE_INSET);
    expect(TIER_BADGE_INSET).toBeGreaterThan(TIER_PAD_RIGHT);
  });

  it("keeps sparse cells square and packed cells as tall as the lane", () => {
    const { rowH } = rowMetrics(6);
    const empty = cellMetrics(rowH, 1000, 1);
    const packed = cellMetrics(rowH, 1000, 8);
    expect(empty.width).toBeLessThanOrEqual(TIER_CELL_MAX);
    expect(empty.width).toBe(empty.height);
    expect(packed.width).toBeLessThan(empty.width);
    expect(packed.height).toBe(empty.height);
    expect(packed.height).toBeGreaterThan(packed.width);
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
    expect(nine.cellW).toBe(nine.size);
    expect(nine.cellH).toBeGreaterThan(nine.cellW);
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

  it("grows square cells as the board has fewer tiers", () => {
    const three = tierBoardLayout([3, 3, 3]);
    const six = tierBoardLayout([3, 3, 3, 3, 3, 3]);
    const ten = tierBoardLayout(Array.from({ length: 10 }, () => 3));
    expect(three.size).toBeGreaterThan(six.size);
    expect(six.size).toBeGreaterThan(ten.size);
    expect(three.cols).toBe(3);
    const packed = tierBoardLayout([8, 8, 8, 8, 8, 8]);
    expect(packed.cols).toBe(TIER_WRAP_COLS);
    expect(
      packed.cellW * TIER_WRAP_COLS + TIER_CELL_GAP * (TIER_WRAP_COLS - 1),
    ).toBeLessThanOrEqual(packed.contentW + 0.01);
    expect(packed.cellH).toBeGreaterThan(packed.cellW);
    expect(TIER_CELL_GAP).toBeGreaterThan(0);
    expect(TIER_CELL_GAP).toBeLessThan(4);
    expect(tierLaneCount(8)).toBe(1);
    expect(tierLaneCount(9)).toBe(2);
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

  it("collapses empty tiers so filled rows eat leftover board", () => {
    const even = tierBoardLayout([1, 1, 1, 1, 1, 1]);
    const mixed = tierBoardLayout([8, 0, 0, 4, 0, 0]);
    expect(even.lanes.every((lane) => lane === 1)).toBe(true);
    expect(mixed.lanes[0]).toBe(1);
    expect(mixed.lanes[1]).toBeLessThan(1);
    expect(mixed.lanes[3]).toBe(1);
    expect(mixed.lanes[0]! * mixed.laneH).toBeGreaterThan(
      even.lanes[0]! * even.laneH,
    );
    const allEmpty = tierBoardLayout([0, 0, 0, 0, 0, 0]);
    expect(allEmpty.lanes.every((lane) => lane === 1)).toBe(true);
  });

  it("packs preview from filled cells only so an editor + cannot wrap a new lane", () => {
    const eight = tierBoardLayout([8, 2, 0, 0, 0, 0]);
    expect(eight.lanes[0]).toBe(1);
    expect(eight.cols).toBe(8);
    expect(addChipPlacement(8, eight.cols).kind).toBe("compact");
    expect(addChipPlacement(3, eight.cols)).toEqual({
      kind: "slot",
      col: 3,
      wrapRow: 0,
    });
    expect(addChipPlacement(0, eight.cols)).toEqual({
      kind: "compact",
      empty: true,
      wrapRow: 0,
    });
    const sparse = tierBoardLayout([3, 3, 3, 3, 3, 3]);
    expect(sparse.cols).toBe(3);
    expect(addChipPlacement(3, sparse.cols).kind).toBe("compact");
    expect(addChipPlacement(2, sparse.cols)).toEqual({
      kind: "slot",
      col: 2,
      wrapRow: 0,
    });
    expect(ADD_CHIP_COMPACT).toBe(48);
  });

  it("keeps empty plus chips off the packed board used by the PNG", () => {
    const packed = tierBoardLayout([8, 2, 0, 0, 0, 0]);
    expect(packed.lanes[0]).toBe(1);
    expect(addChipPlacement(8, packed.cols).kind).toBe("compact");
    expect(addChipPlacement(0, packed.cols).kind).toBe("compact");
    expect(tierBoardLayout([8, 2, 0, 0, 0, 0]).cols).toBe(8);
  });
});

describe("tier colors", () => {
  it("fills the label column from a gold-to-blue palette, not an outline ring", () => {
    expect(parseTierColor(undefined)).toBe(DEFAULT_TIER_COLOR);
    expect(parseTierColor("#F90")).toBe("#ff9900");
    expect(parseTierColor("nope")).toBe(DEFAULT_TIER_COLOR);
    expect(isDefaultTierColor("#FFFFFF")).toBe(true);
    expect(hexToRgba("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
    const rows = createDefaultRows();
    expect(rows.map((row) => row.color)).toEqual([
      DEFAULT_TIER_PALETTE.S,
      DEFAULT_TIER_PALETTE.A,
      DEFAULT_TIER_PALETTE.B,
      DEFAULT_TIER_PALETTE.C,
      DEFAULT_TIER_PALETTE.D,
      DEFAULT_TIER_PALETTE.F,
    ]);
    expect(resolvedTierColor("S", undefined, 0)).toBe(DEFAULT_TIER_PALETTE.S);
    expect(inkOnTierColor(DEFAULT_TIER_PALETTE.S!)).toBe("#111111");
    expect(inkOnTierColor(DEFAULT_TIER_PALETTE.A!)).toBe("#111111");
    expect(inkOnTierColor("#111111")).toBe("#111111");
    const dark = fillForBlackInk("#1a1020");
    expect(inkOnTierColor(dark)).toBe("#111111");
    const lum = (hex: string) => {
      const n = Number.parseInt(hex.slice(1), 16);
      const r = (n >> 16) & 255;
      const g = (n >> 8) & 255;
      const b = n & 255;
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    };
    expect(lum(dark)).toBeGreaterThan(0.57);
    const custom = setTierColor(rows, 0, "#E2B007");
    expect(custom[0]!.color).toBe("#e2b007");
    expect(setTierColor(custom, 0, "#fff")[0]!.color).toBeUndefined();
    expect(resolvedTierColor("S", undefined, 0)).toBe(DEFAULT_TIER_PALETTE.S);
  });
});
