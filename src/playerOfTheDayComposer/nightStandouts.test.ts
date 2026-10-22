import { describe, expect, it } from "vitest";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { emptyStats } from "./lastGame";
import {
  completedNightRows,
  espnEventIsFinal,
  espnEventIsLive,
  isFreakNonScoringNight,
  isNotableNight,
  isRoughNight,
  isSurpriseNight,
  mergeRangeProduction,
  mergeWeekStandouts,
  nightFlagsFor,
  nightStandoutFromBox,
  parseSummaryStandouts,
  rankNightDuds,
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

  it("uses Minnesota's 131 vs Miami, not the home Heat row listed first", () => {
    const rows = parseSummaryStandouts(
      {
        header: {
          competitions: [
            {
              competitors: [
                {
                  score: "106",
                  winner: false,
                  homeAway: "home",
                  team: {
                    id: "14",
                    abbreviation: "MIA",
                    displayName: "Miami Heat",
                  },
                },
                {
                  score: { value: 131 },
                  winner: true,
                  homeAway: "away",
                  team: {
                    id: "16",
                    abbreviation: "MIN",
                    displayName: "Minnesota Timberwolves",
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
                id: "16",
                abbreviation: "MIN",
                displayName: "Minnesota Timberwolves",
              },
              statistics: [
                {
                  keys: KEYS,
                  athletes: [
                    {
                      athlete: {
                        id: "4594268",
                        displayName: "Anthony Edwards",
                      },
                      stats: box("33", "45", "10", "3", "1", "2"),
                    },
                  ],
                },
              ],
            },
            {
              team: {
                id: "14",
                abbreviation: "MIA",
                displayName: "Miami Heat",
              },
              statistics: [
                {
                  keys: KEYS,
                  athletes: [
                    {
                      athlete: { id: "4066261", displayName: "Bam Adebayo" },
                      stats: box("34", "22", "8", "4", "1", "1"),
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      "401909091",
      "2026-10-21",
    );
    const ant = rows.find((row) => row.athleteId === "4594268");
    expect(ant?.teamId).toBe("MIN");
    expect(ant?.game.opponentAbbrev).toBe("MIA");
    expect(ant?.game.home).toBe(false);
    expect(ant?.game.playerScore).toBe("131");
    expect(ant?.game.opponentScore).toBe("106");
    expect(ant?.game.result).toBe("W");
    expect(ant?.game.resultLine).toBe("131-106 W @ MIA");
  });

  it("treats only ESPN finals as done — Q4 and OT stay live", () => {
    const q4 = {
      status: {
        type: {
          completed: false,
          state: "in",
          name: "STATUS_IN_PROGRESS",
          description: "Q4",
          detail: "3:11 - 4th Qtr",
        },
      },
    };
    const ot = {
      status: {
        type: {
          completed: false,
          state: "in",
          name: "STATUS_IN_PROGRESS",
          description: "OT",
          detail: "1:02 - OT",
        },
      },
    };
    const final = {
      status: {
        type: {
          completed: true,
          state: "post",
          name: "STATUS_FINAL",
          description: "Final",
        },
      },
    };
    const finalOt = {
      status: {
        type: {
          completed: true,
          state: "post",
          name: "STATUS_FINAL_OT",
          description: "Final/OT",
        },
      },
    };
    expect(espnEventIsLive(q4)).toBe(true);
    expect(espnEventIsFinal(q4)).toBe(false);
    expect(espnEventIsLive(ot)).toBe(true);
    expect(espnEventIsFinal(ot)).toBe(false);
    expect(espnEventIsLive(final)).toBe(false);
    expect(espnEventIsFinal(final)).toBe(true);
    expect(espnEventIsLive(finalOt)).toBe(false);
    expect(espnEventIsFinal(finalOt)).toBe(true);
    expect(
      completedNightRows([
        { live: true, final: false },
        { live: false, final: true },
        {},
      ]),
    ).toEqual([{ live: false, final: true }, {}]);
  });

  it("ranks star stinkers and bricks, skips camp 2-point nights and live games", () => {
    const luka = getPlayer("3945274");
    const tatum = getPlayer("4065648");
    const barnhizer = getPlayer("4684208");
    expect(luka?.name).toMatch(/Doncic/);
    expect(tatum?.name).toMatch(/Tatum/);
    expect(barnhizer?.name).toMatch(/Barnhizer/);
    expect(usualLineFor("3945274").pts).toBeGreaterThanOrEqual(15);
    expect(usualLineFor("4065648").pts).toBeGreaterThanOrEqual(15);

    const brick = gameRow(
      "3945274",
      "Luka Doncic",
      {
        pts: "22",
        reb: "7",
        ast: "9",
        min: "36",
        fg: "8-18",
        three: "2-10",
        ft: "4-6",
        tov: "8",
      },
      10,
    );
    const stinker = gameRow(
      "4065648",
      "Jayson Tatum",
      {
        pts: "6",
        reb: "4",
        ast: "3",
        min: "34",
        fg: "2-12",
        three: "0-6",
        ft: "2-2",
        tov: "3",
      },
      4,
    );
    const camp = gameRow(
      "4684208",
      "Brooks Barnhizer",
      {
        pts: "2",
        reb: "1",
        ast: "0",
        min: "22",
        fg: "1-6",
        three: "0-3",
        ft: "0-0",
        tov: "1",
      },
      2,
    );
    const liveStar = {
      ...gameRow(
        "1966",
        "LeBron James",
        {
          pts: "8",
          reb: "3",
          ast: "2",
          min: "28",
          fg: "3-16",
          three: "0-7",
          ft: "2-2",
          tov: "7",
        },
        3,
      ),
      live: true,
      final: false,
    };
    expect(isRoughNight(brick.game.stats, usualLineFor("3945274"), "3945274")).toBe(
      true,
    );
    expect(
      isRoughNight(stinker.game.stats, usualLineFor("4065648"), "4065648"),
    ).toBe(true);
    expect(
      isRoughNight(camp.game.stats, usualLineFor("4684208"), "4684208"),
    ).toBe(false);
    const ranked = rankNightDuds([brick, stinker, camp, liveStar]);
    expect(ranked.map((row) => row.athleteId).sort()).toEqual([
      "3945274",
      "4065648",
    ]);
    const lukaRow = ranked.find((row) => row.athleteId === "3945274");
    const tatumRow = ranked.find((row) => row.athleteId === "4065648");
    expect(lukaRow?.badge).toBe("Turnovers");
    expect(lukaRow?.line).toContain("8-18 FG");
    expect(lukaRow?.line).toContain("8 TO");
    expect(tatumRow?.badge).toMatch(/Bricks|Stinker/);
    expect(ranked.map((row) => row.athleteId)).not.toContain("4684208");
    expect(ranked.map((row) => row.athleteId)).not.toContain("1966");
  });
});
