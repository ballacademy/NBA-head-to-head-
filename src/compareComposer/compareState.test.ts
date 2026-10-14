import { describe, expect, it } from "vitest";
import catalog from "../../data/every-team-historical-rosters.json";
import {
  hydrateEveryTeamRosters,
  statsSeasonFor,
} from "../everyTeamComposer/historicalRosters";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  applySideStatValues,
  autoCompareStatsLabel,
  defaultCompareDraft,
  defaultCompareStats,
  fillCompareSide,
  leadingSide,
  numericStat,
  parseCompareStatsMode,
  statsFromLastGame,
  statsFromSeason,
} from "./compareState";

hydrateEveryTeamRosters(
  catalog as unknown as Parameters<typeof hydrateEveryTeamRosters>[0],
);

describe("compare composer recs", () => {
  it("starts empty-photo with this-season averages and stacked default stats", () => {
    const draft = defaultCompareDraft();
    expect(draft.sides[0]?.photoSrc).toBeNull();
    expect(draft.sides[1]?.photoSrc).toBeNull();
    expect(draft.statsMode).toBe("season");
    expect(draft.stats.map((stat) => stat.label)).toEqual([
      "PTS",
      "FG%",
      "3P%",
      "REB",
      "AST",
    ]);
    expect(parseCompareStatsMode(undefined)).toBe("season");
    expect(autoCompareStatsLabel("season", "2026-27")).toBe(
      `${statsSeasonFor("2026-27")} AVG`,
    );
    expect(autoCompareStatsLabel("game", "2026-27")).toBe("LAST GAME");
  });

  it("fills a side without a mugshot and highlights the leader", () => {
    const luka = getPlayer("3945274")!;
    const next = fillCompareSide(luka, defaultCompareDraft().sides[0]!);
    expect(next.playerId).toBe(luka.id);
    expect(next.photoSrc).toBeNull();
    expect(next.lastName.toUpperCase()).toContain("DONCIC");
    expect(leadingSide("31.1", "24.2")).toBe(0);
    expect(leadingSide("24.2", "31.1")).toBe(1);
    expect(leadingSide("24.2", "24.2")).toBeNull();
    expect(numericStat("47.2%")).toBeCloseTo(47.2);
  });

  it("reads season averages through last-year fallback", () => {
    const sga = getPlayer("4278073");
    const id = sga?.id ?? "4278073";
    const values = statsFromSeason(id, "OKC", "2026-27", defaultCompareStats());
    expect(values[0]).toMatch(/^\d/);
    const game = statsFromLastGame(
      {
        eventId: "1",
        gameDate: "2026-10-13",
        teamId: "OKC",
        opponentId: "MIN",
        opponentAbbrev: "MIN",
        result: "W",
        playerScore: "120",
        opponentScore: "110",
        resultLine: "W",
        dateLabel: "10/13",
        stats: {
          pts: "33",
          reb: "6",
          ast: "8",
          stl: "1",
          blk: "1",
          fg: "12-22",
          three: "3-8",
          tov: "2",
        },
      },
      defaultCompareStats(),
    );
    expect(game[0]).toBe("33");
    expect(game[1]).toBe("54.5");
    const patched = applySideStatValues(defaultCompareStats(), 0, game);
    expect(patched[0]?.left).toBe("33");
    expect(patched[0]?.right).toBe("");
  });
});
