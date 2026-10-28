import { describe, expect, it } from "vitest";
import catalog from "../../data/every-team-historical-rosters.json";
import {
  hydrateEveryTeamRosters,
} from "../everyTeamComposer/historicalRosters";
import type { LastGameStats } from "../playerOfTheDayComposer/lastGame";
import type { NightStandout } from "../playerOfTheDayComposer/nightStandouts";
import { emptyStats } from "../playerOfTheDayComposer/lastGame";
import {
  emptyLeaderRows,
  fillToLeaderRows,
  formatLeaderValue,
  leaderTitleFor,
  listNightLeaders,
  listSeasonLeaders,
  nightStatValue,
  parseLeaderRowCount,
  visibleLeaderRows,
} from "./leaderboardFill";

hydrateEveryTeamRosters(
  catalog as unknown as Parameters<typeof hydrateEveryTeamRosters>[0],
);

const box = (patch: Partial<LastGameStats>): LastGameStats => ({
  ...emptyStats(),
  ...patch,
});

const standout = (
  id: string,
  name: string,
  teamId: string,
  stats: LastGameStats,
): NightStandout => ({
  athleteId: id,
  name,
  teamId,
  badge: "",
  flags: [],
  line: "",
  score: 0,
  game: {
    eventId: "1",
    gameDate: "2026-10-27",
    teamId,
    opponentId: "BOS",
    opponentAbbrev: "BOS",
    result: "W",
    playerScore: "110",
    opponentScore: "100",
    resultLine: "W 110-100",
    dateLabel: "Oct 27",
    stats,
  },
});

describe("leaderboard fill", () => {
  it("defaults to 8 rows and drops 1:1 to 5", () => {
    expect(parseLeaderRowCount(undefined)).toBe(8);
    expect(parseLeaderRowCount(5)).toBe(5);
    expect(parseLeaderRowCount(10)).toBe(10);
    expect(emptyLeaderRows(8)).toHaveLength(8);
  });

  it("fills season PTS leaders from the real roster table", () => {
    const fills = listSeasonLeaders("2012-13", "points", "regular", 8);
    expect(fills.length).toBeGreaterThan(0);
    expect(fills[0]!.value).toBeGreaterThan(0);
    expect(fills.every((row) => row.playerId && row.name)).toBe(true);
    const ranked = [...fills].sort((a, b) => b.value - a.value);
    expect(fills.map((row) => row.playerId)).toEqual(
      ranked.map((row) => row.playerId),
    );
  });

  it("skips night metrics that are not on the box score — never invents", () => {
    const stats = box({ pts: "42", reb: "8", ast: "6", fg: "15-28" });
    expect(nightStatValue(stats, "points")).toBe(42);
    expect(nightStatValue(stats, "fgPct")).toBeCloseTo(15 / 28);
    expect(nightStatValue(stats, "per")).toBeNull();
    expect(nightStatValue(stats, "usgPct")).toBeNull();
    expect(nightStatValue(stats, "chargesDrawn")).toBeNull();
    const rows = listNightLeaders(
      [standout("1", "Test Player", "NYK", stats)],
      "per",
      8,
    );
    expect(rows).toEqual([]);
    const filled = fillToLeaderRows(emptyLeaderRows(8), rows, "per", "range");
    expect(filled.every((row) => !row.playerId && row.value === "")).toBe(true);
  });

  it("hides empty rows on export and keeps empty photo-first slots in preview", () => {
    const preview = emptyLeaderRows(8);
    expect(visibleLeaderRows(preview, false)).toHaveLength(8);
    expect(visibleLeaderRows(preview, true)).toHaveLength(0);
    const one = fillToLeaderRows(
      preview,
      listNightLeaders(
        [standout("1", "Jalen Brunson", "NYK", box({ pts: "38" }))],
        "points",
        8,
      ),
      "points",
      "range",
    );
    expect(visibleLeaderRows(one, true)).toHaveLength(1);
    expect(one[0]!.value).toBe("38");
    expect(one[1]!.value).toBe("");
  });

  it("formats season titles without inventing a 72", () => {
    expect(leaderTitleFor("points", "season")).toBe("PPG LEADERS");
    expect(leaderTitleFor("assists", "season")).toBe("AST LEADERS");
    expect(formatLeaderValue(null, "points")).toBe("");
    expect(formatLeaderValue(31.1, "points", "season")).toBe("31.1");
  });
});
