import { describe, expect, it } from "vitest";
import catalog from "../../data/every-team-historical-rosters.json";
import {
  hydrateEveryTeamRosters,
  everyTeamCurrentSeason,
  everyTeamSeasons,
} from "../everyTeamComposer/historicalRosters";
import {
  EMPTY_PLAYER_FILTERS,
  NBA_ACTIVE_PLAYERS,
  POINTS_SPAN,
  isEmptyPlayerFilters,
  parsePlayerSearchFilters,
  searchPlayers,
} from "./nbaActivePlayers";
import {
  STATS_WINDOW_CURRENT,
  STATS_WINDOW_RANGE,
  overlayCountingStats,
  parseStatsWindow,
  seasonsForStatsWindow,
  statsWindowLabel,
} from "./statsWindow";

describe("tier list stats window", () => {
  it("defaults to the current season and expands decades plus custom ranges", () => {
    hydrateEveryTeamRosters(
      catalog as unknown as Parameters<typeof hydrateEveryTeamRosters>[0],
    );
    const current = everyTeamCurrentSeason();
    const seasons = everyTeamSeasons();
    expect(current).toBe("2026-27");
    expect(parseStatsWindow(undefined)).toBe(STATS_WINDOW_CURRENT);
    expect(seasonsForStatsWindow({})).toEqual([current]);
    expect(seasonsForStatsWindow({ statsWindow: current })).toEqual([current]);
    expect(seasonsForStatsWindow({ statsWindow: "2025-26" })).toEqual(["2025-26"]);

    const twenties = seasonsForStatsWindow({ statsWindow: "2020s" });
    expect(twenties[0]).toBe("2020-21");
    expect(twenties).toContain("2025-26");
    expect(twenties).toContain("2026-27");
    expect(twenties).not.toContain("2019-20");

    const tens = seasonsForStatsWindow({ statsWindow: "2010s" });
    expect(tens[0]).toBe("2010-11");
    expect(tens.at(-1)).toBe("2019-20");
    expect(tens).not.toContain("2020-21");

    const aughts = seasonsForStatsWindow({ statsWindow: "2000s" });
    expect(aughts[0]).toBe(seasons[0]);
    expect(aughts.at(-1)).toBe("2009-10");

    expect(
      seasonsForStatsWindow({
        statsWindow: STATS_WINDOW_RANGE,
        statsFrom: "2015-16",
        statsTo: "2017-18",
      }),
    ).toEqual(["2015-16", "2016-17", "2017-18"]);
    expect(statsWindowLabel({ statsWindow: STATS_WINDOW_CURRENT })).toBe(
      "2026-27 (current)",
    );
    expect(statsWindowLabel({ statsWindow: "2010s" })).toBe("2010s");
  });

  it("filters populate matching by points in the selected window", () => {
    hydrateEveryTeamRosters(
      catalog as unknown as Parameters<typeof hydrateEveryTeamRosters>[0],
    );
    const lastYear = overlayCountingStats(NBA_ACTIVE_PLAYERS, {
      statsWindow: "2025-26",
    });
    const hot = searchPlayers(
      "",
      { pointsRange: { min: 25, max: POINTS_SPAN.max } },
      lastYear,
    );
    expect(hot.some((player) => player.id === "3945274")).toBe(true);
    expect(hot.every((player) => player.ppg >= 25)).toBe(true);

    const aughts = overlayCountingStats(NBA_ACTIVE_PLAYERS, {
      statsWindow: "2000s",
    });
    const aughtsHot = searchPlayers(
      "",
      { pointsRange: { min: 20, max: POINTS_SPAN.max } },
      aughts,
    );
    expect(aughtsHot.length).toBeGreaterThan(0);
    expect(aughtsHot.every((player) => player.ppg >= 20)).toBe(true);
    expect(aughtsHot.some((player) => player.id === "1966")).toBe(true);
    expect(aughtsHot.some((player) => player.id === "3945274")).toBe(false);

    expect(
      isEmptyPlayerFilters({
        ...EMPTY_PLAYER_FILTERS,
        statsWindow: "2010s",
      }),
    ).toBe(false);
    expect(
      parsePlayerSearchFilters({
        statsWindow: "2010s",
        pointsRange: { min: 15, max: 30 },
        minutesRange: { min: 20, max: 36 },
      }),
    ).toMatchObject({
      statsWindow: "2010s",
      pointsRange: { min: 15, max: 30 },
      minutesRange: { min: 20, max: 36 },
    });
  });
});
