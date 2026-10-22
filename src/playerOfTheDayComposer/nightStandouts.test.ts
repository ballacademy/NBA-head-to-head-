import { describe, expect, it } from "vitest";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { emptyStats } from "./lastGame";
import {
  isFreakNonScoringNight,
  isNotableNight,
  isSurpriseNight,
  mergeRangeProduction,
  mergeWeekStandouts,
  nightFlagsFor,
  nightStandoutFromBox,
  parseSummaryStandouts,
  rankNightStandouts,
  statsFromBoxRow,
  usualLineFor,
  type NightStandout,
} from "./nightStandouts";

const KEYS = [
  "minutes",
  "points",
  "fieldGoalsMade-fieldGoalsAttempted",
  "threePointFieldGoalsMade-threePointFieldGoalsAttempted",
  "freeThrowsMade-freeThrowsAttempted",
  "rebounds",
  "assists",
  "turnovers",
  "steals",
  "blocks",
];

const box = (
  min: string,
  pts: string,
  reb: string,
  ast: string,
  stl: string,
  blk: string,
) => [min, pts, "10-18", "2-5", "4-4", reb, ast, "3", stl, blk];

describe("night standouts", () => {
  it("reads ESPN box rows into last-game stats", () => {
    const stats = statsFromBoxRow(KEYS, box("34", "32", "14", "11", "2", "1"));
    expect(stats.pts).toBe("32");
    expect(stats.reb).toBe("14");
    expect(stats.ast).toBe("11");
    expect(stats.min).toBe("34");
    expect(stats.stl).toBe("2");
    expect(stats.blk).toBe("1");
    expect(stats.ft).toBe("4-4");
  });

  it("flags triple-doubles, 30-point nights, and big stocks", () => {
    const triple = nightFlagsFor({
      ...emptyStats(),
      pts: "32",
      reb: "14",
      ast: "11",
      stl: "2",
      blk: "1",
      min: "34",
    });
    expect(triple.flags).toContain("Triple-double");
    expect(triple.flags).toContain("30+ PTS");
    const stocks = nightFlagsFor({
      ...emptyStats(),
      pts: "18",
      reb: "6",
      ast: "3",
      stl: "3",
      blk: "4",
      min: "28",
    });
    expect(stocks.flags).toContain("Big stocks");
    const pra = nightFlagsFor({
      ...emptyStats(),
      pts: "28",
      reb: "8",
      ast: "7",
      stl: "1",
      blk: "0",
      min: "36",
    });
    expect(pra.flags).toContain("High PRA");
  });

  it("parses a summary box and ranks PTS / PRA / stocks", () => {
    const rows = parseSummaryStandouts(
      {
        header: {
          competitions: [
            {
              competitors: [
                {
                  score: "120",
                  winner: true,
                  team: {
                    abbreviation: "DEN",
                    displayName: "Denver Nuggets",
                  },
                },
                {
                  score: "110",
                  winner: false,
                  team: {
                    abbreviation: "LAL",
                    displayName: "Los Angeles Lakers",
                  },
                },
              ],
            },
          ],
        },
        boxscore: {
          players: [
            {
              team: { abbreviation: "DEN", displayName: "Denver Nuggets" },
              statistics: [
                {
                  keys: KEYS,
                  athletes: [
                    {
                      athlete: { id: "3112335", displayName: "Nikola Jokic" },
                      stats: box("36", "32", "14", "11", "1", "1"),
                    },
                  ],
                },
              ],
            },
            {
              team: {
                abbreviation: "LAL",
                displayName: "Los Angeles Lakers",
              },
              statistics: [
                {
                  keys: KEYS,
                  athletes: [
                    {
                      athlete: { id: "1966", displayName: "LeBron James" },
                      stats: box("32", "12", "4", "5", "4", "2"),
                    },
                    {
                      athlete: {
                        id: "4066354",
                        displayName: "Sit this one",
                      },
                      stats: box("0", "0", "0", "0", "0", "0"),
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      "1",
      "2026-10-14",
    );
    expect(rows.map((row) => row.athleteId)).toEqual(["3112335", "1966"]);
    expect(rows[0]?.badge).toBe("Triple-double");
    expect(rows[0]?.game.stats.pts).toBe("32");
    expect(rows[1]?.flags).toContain("Big stocks");
    const ranked = rankNightStandouts(rows as NightStandout[]);
    expect(ranked[0]?.athleteId).toBe("3112335");
    expect(ranked.map((row) => row.athleteId)).toContain("1966");
  });

  const gameRow = (
    id: string,
    name: string,
    stats: Partial<ReturnType<typeof emptyStats>>,
    score = 0,
    flags: string[] = [],
  ): NightStandout => {
    const line = { ...emptyStats(), ...stats };
    const extra = nightFlagsFor(line);
    return {
      athleteId: id,
      name,
      teamId: "PHX",
      badge: flags[0] ?? extra.flags[0] ?? "Standout",
      flags: flags.length ? flags : extra.flags,
      line: `${line.pts} PTS`,
      score: score || extra.score,
      game: {
        eventId: "1",
        gameDate: "2026-10-14",
        teamId: "PHX",
        opponentId: "SAS",
        opponentAbbrev: "SAS",
        result: "L",
        playerScore: "100",
        opponentScore: "110",
        resultLine: "L 100-110 SAS",
        dateLabel: "10/14",
        stats: line,
      },
    };
  };

  it("keeps a low-average surprise night like Bouyea 15/4/8 on the slate", () => {
    const bouyea = getPlayer("4280245");
    expect(bouyea?.name).toMatch(/Bouyea/);
    expect(bouyea?.ppg ?? 0).toBeLessThan(10);
    const usual = usualLineFor("4280245");
    const extra = nightFlagsFor({
      ...emptyStats(),
      pts: "15",
      reb: "4",
      ast: "8",
      min: "28",
    });
    expect(isSurpriseNight(extra, usual)).toBe(true);
    expect(isNotableNight(extra, usual)).toBe(true);
    const stars = Array.from({ length: 16 }, (_, index) =>
      gameRow(
        `star-${index}`,
        `Star ${index}`,
        { pts: String(28 + index), reb: "8", ast: "6", min: "32" },
        80 + index,
        ["30+ PTS"],
      ),
    );
    const bouyeaRow = nightStandoutFromBox(
      "4280245",
      "Jamaree Bouyea",
      "PHX",
      { id: "SAS", abbrev: "SAS", score: "110" },
      { score: "100", winner: false },
      "1",
      "2026-10-14",
      { ...emptyStats(), pts: "15", reb: "4", ast: "8", min: "28" },
    );
    expect(bouyeaRow?.flags).toContain("Hot night");
    const ranked = rankNightStandouts([...stars, bouyeaRow!]);
    expect(ranked.length).toBeGreaterThan(12);
    expect(ranked.map((row) => row.athleteId)).toContain("4280245");
  });

  it("drops 5-or-fewer point nights unless the line is freakish", () => {
    const quiet = nightFlagsFor({
      ...emptyStats(),
      pts: "4",
      reb: "8",
      ast: "2",
      stl: "2",
      blk: "2",
      min: "22",
    });
    expect(isFreakNonScoringNight(quiet)).toBe(false);
    expect(isNotableNight(quiet, usualLineFor("4280245"))).toBe(false);
    expect(
      nightStandoutFromBox(
        "4280245",
        "Jamaree Bouyea",
        "PHX",
        { id: "SAS", abbrev: "SAS", score: "110" },
        { score: "100", winner: false },
        "1",
        "2026-10-14",
        { ...emptyStats(), pts: "4", reb: "8", ast: "2", stl: "2", blk: "2", min: "22" },
      ),
    ).toBeNull();

    const boards = nightFlagsFor({
      ...emptyStats(),
      pts: "5",
      reb: "10",
      ast: "2",
      min: "28",
    });
    expect(isFreakNonScoringNight(boards)).toBe(true);
    expect(isNotableNight(boards, usualLineFor("3112335"))).toBe(true);

    const tenBlocks = nightFlagsFor({
      ...emptyStats(),
      pts: "3",
      reb: "9",
      ast: "1",
      blk: "10",
      min: "30",
    });
    expect(isFreakNonScoringNight(tenBlocks)).toBe(true);
    expect(isNotableNight(tenBlocks, usualLineFor("3112335"))).toBe(true);

    const hugeStocks = nightFlagsFor({
      ...emptyStats(),
      pts: "2",
      reb: "6",
      ast: "1",
      stl: "5",
      blk: "4",
      min: "28",
    });
    expect(isFreakNonScoringNight(hugeStocks)).toBe(true);
    expect(isNotableNight(hugeStocks, usualLineFor("3112335"))).toBe(true);

    const ranked = rankNightStandouts([
      gameRow("quiet", "Quiet", {
        pts: "4",
        reb: "8",
        ast: "2",
        stl: "2",
        blk: "4",
        min: "22",
      }),
      gameRow("gobert", "Gobert", {
        pts: "4",
        reb: "12",
        ast: "1",
        blk: "10",
        min: "32",
      }),
      gameRow("bouyea", "Bouyea", {
        pts: "15",
        reb: "4",
        ast: "8",
        min: "28",
      }),
    ]);
    expect(ranked.map((row) => row.athleteId)).toEqual(["gobert", "bouyea"]);
  });

  it("flags Simmons-type dime/board nights with little scoring", () => {
    const simmons = nightFlagsFor({
      ...emptyStats(),
      pts: "4",
      reb: "11",
      ast: "10",
      stl: "1",
      blk: "0",
      min: "32",
      fg: "2-4",
    });
    expect(isFreakNonScoringNight(simmons)).toBe(true);
    expect(isNotableNight(simmons, usualLineFor("3907387"))).toBe(true);
    const row = nightStandoutFromBox(
      "3907387",
      "Ben Simmons",
      "SAC",
      { id: "SAS", abbrev: "SAS", score: "114" },
      { score: "109", winner: false },
      "401898843",
      "2026-10-16",
      {
        ...emptyStats(),
        pts: "4",
        reb: "11",
        ast: "10",
        min: "32",
        fg: "2-4",
      },
    );
    expect(row).not.toBeNull();
    expect(row?.athleteId).toBe("3907387");
    expect(row?.flags.join(" ")).toMatch(/Dimes|Boards|Double-double/);
    const ranked = rankNightStandouts([row!]);
    expect(ranked.map((item) => item.athleteId)).toEqual(["3907387"]);
  });

  it("keeps each athlete's best night across a week", () => {
    const quiet = gameRow(
      "quiet",
      "Quiet",
      { pts: "4", reb: "8", ast: "2", min: "22" },
      10,
    );
    const gobert = gameRow(
      "gobert",
      "Gobert",
      { pts: "4", reb: "12", ast: "1", blk: "10", min: "32" },
      40,
    );
    const louder = { ...quiet, score: 80 };
    const merged = mergeWeekStandouts([[quiet, gobert], [louder]]);
    expect(merged[0]?.athleteId).toBe("quiet");
    expect(merged.map((row) => row.athleteId)).toEqual(["quiet", "gobert"]);
  });

  it("averages every appearance in a range so one loud night does not become the week", () => {
    const blowup = gameRow(
      "4433159",
      "Dalen Terry",
      { pts: "23", reb: "8", ast: "9", stl: "4", min: "43" },
      80,
    );
    const quiet = gameRow(
      "4433159",
      "Dalen Terry",
      { pts: "4", reb: "1", ast: "1", min: "8" },
      8,
    );
    const bench = gameRow(
      "4433159",
      "Dalen Terry",
      { pts: "0", reb: "3", ast: "1", min: "4" },
      2,
    );
    const merged = mergeRangeProduction([[blowup, quiet, bench]]);
    expect(merged).toHaveLength(1);
    expect(Number.parseFloat(merged[0]!.game.stats.pts)).toBeCloseTo(9, 0);
    expect(merged[0]!.score).toBeLessThan(blowup.score);
    expect(merged[0]!.games).toBe(3);
  });

  it("sums shooting splits across the range so TS% is the week, not one night", () => {
    const first = gameRow(
      "3945274",
      "Luka Doncic",
      { pts: "30", reb: "8", ast: "9", min: "36", fg: "10-24", three: "2-10", ft: "8-10" },
      40,
    );
    const second = gameRow(
      "3945274",
      "Luka Doncic",
      { pts: "10", reb: "4", ast: "3", min: "28", fg: "4-16", three: "0-8", ft: "2-2" },
      12,
    );
    const merged = mergeRangeProduction([[first, second]]);
    expect(merged[0]!.games).toBe(2);
    expect(merged[0]!.game.stats.fg).toBe("7-20");
    expect(merged[0]!.game.stats.three).toBe("1-9");
    expect(merged[0]!.game.stats.ft).toBe("5-6");
    expect(merged[0]!.game.stats.pts).toBe("20");
  });

  it("uses the player's club score vs Orlando even if the home row is listed first without winner", () => {
    const rows = parseSummaryStandouts(
      {
        header: {
          competitions: [
            {
              competitors: [
                {
                  score: "125",
                  homeAway: "home",
                  team: {
                    id: "19",
                    abbreviation: "ORL",
                    displayName: "Orlando Magic",
                  },
                },
                {
                  score: "132",
                  homeAway: "away",
                  team: {
                    id: "1",
                    abbreviation: "ATL",
                    displayName: "Atlanta Hawks",
                  },
                },
              ],
            },
          ],
        },
        boxscore: {
          players: [
            {
              team: {
                id: "1",
                abbreviation: "ATL",
                displayName: "Atlanta Hawks",
              },
              statistics: [
                {
                  keys: KEYS,
                  athletes: [
                    {
                      athlete: {
                        id: "4278039",
                        displayName: "Nickeil Alexander-Walker",
                      },
                      stats: box("34", "31", "4", "5", "1", "1"),
                    },
                  ],
                },
              ],
            },
            {
              team: {
                id: "19",
                abbreviation: "ORL",
                displayName: "Orlando Magic",
              },
              statistics: [
                {
                  keys: KEYS,
                  athletes: [
                    {
                      athlete: { id: "4433134", displayName: "Paolo Banchero" },
                      stats: box("36", "28", "8", "4", "1", "1"),
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      "401909834",
      "2026-10-21",
    );
    const naw = rows.find((row) => row.athleteId === "4278039");
    expect(naw?.teamId).toBe("ATL");
    expect(naw?.game.opponentAbbrev).toBe("ORL");
    expect(naw?.game.home).toBe(false);
    expect(naw?.game.playerScore).toBe("132");
    expect(naw?.game.opponentScore).toBe("125");
    expect(naw?.game.result).toBe("W");
  });
});
