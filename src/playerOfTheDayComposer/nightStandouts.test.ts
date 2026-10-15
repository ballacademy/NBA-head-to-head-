import { describe, expect, it } from "vitest";
import { emptyStats } from "./lastGame";
import {
  nightFlagsFor,
  parseSummaryStandouts,
  rankNightStandouts,
  statsFromBoxRow,
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
});
