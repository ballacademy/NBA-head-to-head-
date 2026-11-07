import { describe, expect, it } from "vitest";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
  mockTradeLayout,
} from "./mockTradeLayout";
import {
  addMockTradePick,
  addMockTradePlayer,
  addMockTradeTeam,
  defaultMockTradeDraft,
  emptyMockTradeSide,
  fillMockTradePlayer,
  MOCK_TRADE_PICK_MAX,
  MOCK_TRADE_PLAYER_MAX,
  mockTradeCaptionFor,
  mockTradePickLabel,
  mockTradeSalaryTotalsLabel,
  mockTradeTeamCount,
  normalizeMockTradeDraft,
  parseMockTradeRound,
  removeMockTradePick,
  removeMockTradePlayer,
  removeMockTradeTeam,
  setMockTradePhoto,
  setMockTradeSideTeam,
} from "./mockTradeState";

describe("mock trade draft", () => {
  it("starts empty with two teams and one player plus one pick each", () => {
    const draft = defaultMockTradeDraft();
    expect(draft.title).toBe("MOCK TRADE");
    expect(draft.sides).toHaveLength(2);
    expect(draft.sides.every((side) => side.players.length === 1)).toBe(true);
    expect(draft.sides.every((side) => side.picks.length === 1)).toBe(true);
    expect(draft.sides.every((side) => side.players[0]?.photoSrc == null)).toBe(
      true,
    );
    expect(mockTradeTeamCount(draft)).toBe(2);
  });

  it("adds a third team and reflows without dumping 4+6 empty holes", () => {
    let draft = addMockTradeTeam(defaultMockTradeDraft());
    expect(mockTradeTeamCount(draft)).toBe(3);
    expect(draft.sides[2]?.players).toHaveLength(1);
    expect(draft.sides[2]?.picks).toHaveLength(1);
    draft = addMockTradeTeam(draft);
    expect(draft.sides).toHaveLength(3);
    draft = removeMockTradeTeam(draft);
    expect(mockTradeTeamCount(draft)).toBe(2);
  });

  it("treats picks as first-class chips with year, round, from, and swap", () => {
    expect(parseMockTradeRound("2nd")).toBe("2nd");
    expect(parseMockTradeRound("second")).toBe("2nd");
    expect(parseMockTradeRound("1")).toBe("1st");
    const pick = {
      year: 2027,
      round: "1st" as const,
      fromTeamId: "DAL",
      swap: true,
    };
    expect(mockTradePickLabel(pick)).toBe("2027 1ST · SWAP · DAL");
    expect(mockTradePickLabel({ ...pick, swap: false, fromTeamId: null })).toBe(
      "2027 1ST",
    );
    expect(
      mockTradePickLabel({ ...pick, swap: false, top4: true, fromTeamId: null }),
    ).toBe("2027 1ST · TOP-4");
    expect(
      mockTradePickLabel({ ...pick, cash: true, swap: false, fromTeamId: "DAL" }),
    ).toBe("CASH · DAL");
    expect(
      mockTradePickLabel({ ...pick, twoWay: true, swap: false, fromTeamId: null }),
    ).toBe("TWO-WAY");
  });

  it("adds and removes player and pick slots up to the caps", () => {
    let side = emptyMockTradeSide();
    expect(side.players).toHaveLength(1);
    expect(side.picks).toHaveLength(1);
    side = addMockTradePlayer(side);
    side = addMockTradePlayer(side);
    side = addMockTradePlayer(side);
    side = addMockTradePlayer(side);
    expect(side.players).toHaveLength(MOCK_TRADE_PLAYER_MAX);
    side = removeMockTradePlayer(side);
    expect(side.players).toHaveLength(3);
    for (let i = 0; i < 8; i += 1) {
      side = addMockTradePick(side);
    }
    expect(side.picks).toHaveLength(MOCK_TRADE_PICK_MAX);
    side = removeMockTradePick(side);
    expect(side.picks).toHaveLength(5);
    side = removeMockTradePlayer(emptyMockTradeSide(), 0);
    expect(side.players).toHaveLength(0);
  });

  it("fills ESPN headshots and persists a custom crop on the same slot", () => {
    const filled = fillMockTradePlayer(
      {
        id: "4065648",
        name: "Jayson Tatum",
        team: "BOS",
        headshotUrl: "https://a.espncdn.com/i/headshots/nba/players/full/4065648.png",
        age: 27,
        heightInches: 80,
        displayHeight: "",
        position: "F",
        positionGroup: "F",
        division: "Atlantic",
        conference: "East",
        draftYear: 2017,
        draftRound: 1,
        draftPick: 3,
        country: null,
        experienceYears: 8,
        allStar: true,
        ppg: 27,
      },
      defaultMockTradeDraft().sides[0]!.players[0]!,
    );
    expect(filled.photoSrc).toMatch(/4065648\.png/);
    expect(filled.customPhoto).toBe(false);
    expect(filled.lastName).toBe("Tatum");
    const uploaded = setMockTradePhoto(filled, "data:image/png;base64,xx");
    expect(uploaded.customPhoto).toBe(true);
    expect(uploaded.photoSrc).toBe("data:image/png;base64,xx");
  });

  it("keeps the acquiring team when a player is filled", () => {
    const draft = setMockTradeSideTeam(defaultMockTradeDraft(), 0, "BOS");
    expect(draft.sides[0]?.teamId).toBe("BOS");
    expect(mockTradeCaptionFor(draft)).toMatch(/MOCK TRADE/i);
  });

  it("totals salary in vs out per side from the other team's outgoing players", () => {
    const jokic = fillMockTradePlayer(
      {
        id: "3112335",
        name: "Nikola Jokic",
        team: "DEN",
        headshotUrl: "",
        age: 30,
        heightInches: 83,
        displayHeight: "",
        position: "C",
        positionGroup: "C",
        division: "Northwest",
        conference: "West",
        draftYear: 2014,
        draftRound: 2,
        draftPick: 41,
        country: null,
        experienceYears: 10,
        allStar: true,
        ppg: 26,
      },
      defaultMockTradeDraft().sides[0]!.players[0]!,
    );
    const tatum = fillMockTradePlayer(
      {
        id: "4065648",
        name: "Jayson Tatum",
        team: "BOS",
        headshotUrl: "",
        age: 27,
        heightInches: 80,
        displayHeight: "",
        position: "F",
        positionGroup: "F",
        division: "Atlantic",
        conference: "East",
        draftYear: 2017,
        draftRound: 1,
        draftPick: 3,
        country: null,
        experienceYears: 8,
        allStar: true,
        ppg: 27,
      },
      defaultMockTradeDraft().sides[1]!.players[0]!,
    );
    let draft = setMockTradeSideTeam(defaultMockTradeDraft(), 0, "BOS");
    draft = setMockTradeSideTeam(draft, 1, "DEN");
    draft = {
      ...draft,
      sides: [
        { ...draft.sides[0]!, players: [jokic] },
        { ...draft.sides[1]!, players: [tatum] },
      ],
    };
    expect(mockTradeSalaryTotalsLabel(draft, 0)).toMatch(/^IN \$/);
    expect(mockTradeSalaryTotalsLabel(draft, 0)).toMatch(/OUT \$/);
    expect(mockTradeSalaryTotalsLabel(draft, 1)).toMatch(/^IN \$/);
  });

  it("normalizes short or oversized saves", () => {
    const next = normalizeMockTradeDraft({
      title: "",
      sides: [{ teamId: "LAL", players: [], picks: [] }],
    });
    expect(next.title).toBe("MOCK TRADE");
    expect(next.sides).toHaveLength(2);
    expect(next.showBa).toBe(true);
  });
});

describe("mock trade layout", () => {
  it("splits two teams evenly and reflows three columns", () => {
    const two = mockTradeLayout(2, [1, 1], [1, 1]);
    expect(two.columns).toHaveLength(2);
    expect(two.columns[0]!.w).toBeCloseTo(two.columns[1]!.w, 5);
    expect(two.columns[0]!.players).toHaveLength(1);
    expect(two.columns[0]!.picks).toHaveLength(1);
    const three = mockTradeLayout(3, [2, 1, 1], [3, 1, 2], false);
    expect(three.columns).toHaveLength(3);
    expect(three.columns[0]!.w).toBeCloseTo(three.columns[2]!.w, 5);
    expect(three.columns[0]!.w).toBeLessThan(two.columns[0]!.w);
    expect(three.columns[0]!.players).toHaveLength(2);
    expect(three.columns[0]!.picks).toHaveLength(3);
    expect(two.title.w).toBeGreaterThan(1000);
    const stacked = mockTradeLayout(2, [1, 1], [5, 2]);
    const pickXs = new Set(
      stacked.columns[0]!.picks.map((chip) => Math.round(chip.x)),
    );
    expect(pickXs.size).toBeLessThanOrEqual(2);
    expect(stacked.columns[0]!.picks[0]!.w).toBeGreaterThan(180);
  });

  it("exports 4:5 at 1200×1500 and stretches 9:16", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(STORY_DESIGN_HEIGHT).toBe(Math.round((1200 * 16) / 9));
    const story = mockTradeLayout(2, [1, 1], [1, 1], true);
    expect(story.columns[0]!.h).toBeGreaterThan(
      mockTradeLayout(2, [1, 1], [1, 1]).columns[0]!.h,
    );
  });
});
