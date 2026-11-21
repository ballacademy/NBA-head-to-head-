import { describe, expect, it } from "vitest";
import { GRAPHIC_HEIGHT } from "../standingsComposer/rankingState";
import {
  ESPN_SCOREBOARD_URL,
  SCHEDULE_POST_GAME_MAX,
  capScheduleGames,
  parseScoreboardGames,
  scheduleBackToBackEventIds,
  scheduleFillLayout,
  scheduleGroups,
} from "./scheduleState";

describe("schedule poster", () => {
  it("loads the scoreboard from the CORS-safe ESPN host", () => {
    expect(ESPN_SCOREBOARD_URL("2026-11-01")).toContain("site.web.api.espn.com");
    expect(ESPN_SCOREBOARD_URL("2026-11-01")).not.toContain("site.api.espn.com");
  });

  it("reads logos and tip times from an ESPN scoreboard night", () => {
    const games = parseScoreboardGames(
      {
        events: [
          {
            id: "401",
            date: "2026-10-18T23:30:00Z",
            competitions: [
              {
                competitors: [
                  { homeAway: "away", score: "0", team: { abbreviation: "NY" } },
                  { homeAway: "home", score: "0", team: { abbreviation: "BOS" } },
                ],
              },
            ],
            status: { type: { shortDetail: "7:30 PM ET", name: "STATUS_SCHEDULED" } },
          },
        ],
      },
      "2026-10-18",
    );
    expect(games).toHaveLength(1);
    expect(games[0]?.awayId).toBe("NYK");
    expect(games[0]?.homeId).toBe("BOS");
    expect(games[0]?.timeLabel).toContain("7:30");
    expect(scheduleGroups(games)[0]?.games).toHaveLength(1);
    expect(scheduleBackToBackEventIds(games).size).toBe(0);
  });

  it("groups late ET tips on the Eastern date, not UTC midnight", () => {
    const games = parseScoreboardGames(
      {
        events: [
          {
            id: "402",
            date: "2026-10-21T02:30:00Z",
            competitions: [
              {
                competitors: [
                  { homeAway: "away", score: "0", team: { abbreviation: "DEN" } },
                  { homeAway: "home", score: "0", team: { abbreviation: "LAL" } },
                ],
              },
            ],
            status: {
              type: { shortDetail: "10/20 - 10:30 PM ET", name: "STATUS_SCHEDULED" },
            },
          },
        ],
      },
      "2026-10-20",
    );
    expect(games[0]?.date).toBe("2026-10-20");
    expect(games[0]?.timeLabel).toBe("10:30 PM ET");
    expect(games[0]?.dateLabel).toContain("OCT 20");
  });

  it("fills the 4:5 by stretching each day so the week is not a short card", () => {
    const groups = [
      { games: [1, 2] },
      { games: [3] },
      { games: [4, 5, 6] },
      { games: [7] },
      { games: [8, 9] },
      { games: [10] },
      { games: [11, 12] },
    ];
    const fill = scheduleFillLayout(groups);
    expect(fill.days).toBe(7);
    expect(fill.listH / GRAPHIC_HEIGHT).toBeGreaterThan(0.72);
    expect(fill.listTop + fill.listH + fill.listBottom).toBe(GRAPHIC_HEIGHT);
    expect(fill.logo).toBeGreaterThanOrEqual(32);
    expect(fill.type).toBeGreaterThanOrEqual(14);
    expect(fill.dayH * fill.days + fill.dayGap * (fill.days - 1)).toBeCloseTo(
      fill.listH,
    );
    expect(fill.logo).toBeGreaterThanOrEqual(36);
    expect(fill.type).toBeGreaterThanOrEqual(16);
  });

  it("caps This week so the 4:5 is not 51 packed games", () => {
    const games = Array.from({ length: 51 }, (_, index) => ({
      eventId: `g-${index}`,
      date: `2026-11-${String((index % 7) + 1).padStart(2, "0")}`,
      timeLabel: "7:00 PM ET",
      dateLabel: "NOV",
      homeId: "BOS",
      awayId: "NYK",
      homeScore: "",
      awayScore: "",
      status: "STATUS_SCHEDULED",
    }));
    const capped = capScheduleGames(games);
    expect(capped).toHaveLength(SCHEDULE_POST_GAME_MAX);
    expect(capped[0]?.date <= capped[capped.length - 1]!.date).toBe(true);
    const fill = scheduleFillLayout(scheduleGroups(capped));
    expect(fill.dayLayouts.length).toBeGreaterThan(0);
    expect(fill.type).toBeGreaterThanOrEqual(16);
  });
});
