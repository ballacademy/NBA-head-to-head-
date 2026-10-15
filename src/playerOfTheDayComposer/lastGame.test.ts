import { describe, expect, it } from "vitest";
import {
  ESPN_ABBREV_TO_TEAM,
  ESPN_GAMELOG_URL,
  emptyStats,
  espnGamelogSeasonYear,
  formatDateLabel,
  formatResultLine,
  parseGamelogGames,
  parseLastGamePayload,
  parseTeamScheduleLastNight,
  resolveTeamId,
  ESPN_TEAM_IDS,
  ESPN_TEAM_SCHEDULE_URL,
  gameOnDate,
  isoDateOnly,
  nbaTodayIso,
  shiftIsoDate,
  toEspnDateParam,
  type EspnGamelogPayload,
} from "./lastGame";

const PRIOR_SEASON = "2025-26";
const CURRENT_SEASON = "2026-27";

const payload = (): EspnGamelogPayload => ({
  labels: [
    "MIN",
    "FG",
    "FG%",
    "3PT",
    "3P%",
    "FT",
    "FT%",
    "REB",
    "AST",
    "BLK",
    "STL",
    "PF",
    "TO",
    "PTS",
  ],
  events: {
    "401873344": {
      id: "401873344",
      gameDate: "2026-05-26T00:00:00.000+00:00",
      homeTeamId: "5",
      awayTeamId: "18",
      homeTeamScore: "93",
      awayTeamScore: "130",
      gameResult: "L",
      opponent: {
        abbreviation: "NY",
        displayName: "New York Knicks",
      },
      team: {
        id: "5",
        abbreviation: "CLE",
        displayName: "Cleveland Cavaliers",
      },
    },
    "401812725": {
      id: "401812725",
      gameDate: "2025-10-08T00:00:00.000+00:00",
      homeTeamId: "12",
      awayTeamId: "5",
      homeTeamScore: "100",
      awayTeamScore: "90",
      gameResult: "W",
      opponent: { abbreviation: "LAC", displayName: "LA Clippers" },
      team: { id: "5", abbreviation: "CLE", displayName: "Cleveland Cavaliers" },
    },
  },
  seasonTypes: [
    {
      displayName: "2025-26 Postseason CLE",
      categories: [
        {
          events: [
            {
              eventId: "401873344",
              stats: [
                "33",
                "2-8",
                "25.0",
                "0-6",
                "0.0",
                "8-9",
                "88.9",
                "4",
                "2",
                "1",
                "1",
                "2",
                "5",
                "12",
              ],
            },
          ],
        },
      ],
    },
    {
      displayName: "2025-26 Preseason",
      categories: [
        {
          events: [
            {
              eventId: "401812725",
              stats: [
                "23",
                "4-10",
                "40.0",
                "0-6",
                "0.0",
                "0-2",
                "0.0",
                "3",
                "3",
                "0",
                "1",
                "3",
                "3",
                "8",
              ],
            },
          ],
        },
      ],
    },
  ],
});

const labels = () => [
  "MIN",
  "FG",
  "FG%",
  "3PT",
  "3P%",
  "FT",
  "FT%",
  "REB",
  "AST",
  "BLK",
  "STL",
  "PF",
  "TO",
  "PTS",
];

const row = (...stats: string[]) => stats;

/** Mixed ESPN payload: 2024-25 14 PTS leftover + two 2026-27 preseason games (older listed first). */
const haliPayload = (): EspnGamelogPayload => ({
  labels: labels(),
  events: {
    "401717013": {
      id: "401717013",
      gameDate: "2024-10-17T23:00:00.000+00:00",
      homeTeamId: "11",
      awayTeamId: "30",
      homeTeamScore: "111",
      awayTeamScore: "99",
      gameResult: "W",
      opponent: { abbreviation: "CHA", displayName: "Charlotte Hornets" },
      team: { id: "11", abbreviation: "IND", displayName: "Indiana Pacers" },
    },
    "401914123": {
      id: "401914123",
      gameDate: "2026-10-07T23:00:00.000+00:00",
      homeTeamId: "16",
      awayTeamId: "11",
      homeTeamScore: "120",
      awayTeamScore: "110",
      gameResult: "W",
      opponent: { abbreviation: "MIN", displayName: "Minnesota Timberwolves" },
      team: { id: "11", abbreviation: "IND", displayName: "Indiana Pacers" },
    },
    "401908621": {
      id: "401908621",
      gameDate: "2026-10-14T00:00:00.000+00:00",
      homeTeamId: "25",
      awayTeamId: "11",
      homeTeamScore: "114",
      awayTeamScore: "112",
      gameResult: "L",
      opponent: { abbreviation: "OKC", displayName: "Oklahoma City Thunder" },
      team: { id: "11", abbreviation: "IND", displayName: "Indiana Pacers" },
    },
    leftoverRs: {
      id: "leftoverRs",
      gameDate: "2026-04-10T00:00:00.000+00:00",
      homeTeamId: "11",
      awayTeamId: "5",
      homeTeamScore: "100",
      awayTeamScore: "90",
      gameResult: "W",
      opponent: { abbreviation: "CLE", displayName: "Cleveland Cavaliers" },
      team: { id: "11", abbreviation: "IND", displayName: "Indiana Pacers" },
    },
  },
  seasonTypes: [
    {
      displayName: "2024-25 Preseason",
      categories: [
        {
          events: [
            {
              eventId: "401717013",
              stats: row(
                "22",
                "5-12",
                "41.7",
                "2-6",
                "33.3",
                "2-2",
                "100.0",
                "7",
                "8",
                "0",
                "1",
                "2",
                "3",
                "14",
              ),
            },
          ],
        },
      ],
    },
    {
      displayName: "2026-27 Preseason",
      categories: [
        {
          events: [
            {
              eventId: "401914123",
              stats: row(
                "16",
                "3-8",
                "37.5",
                "1-3",
                "33.3",
                "0-0",
                "0.0",
                "0",
                "6",
                "2",
                "1",
                "0",
                "1",
                "7",
              ),
            },
            {
              eventId: "401908621",
              stats: row(
                "18",
                "9-14",
                "64.3",
                "4-6",
                "66.7",
                "2-3",
                "66.7",
                "3",
                "3",
                "2",
                "0",
                "1",
                "4",
                "24",
              ),
            },
          ],
        },
      ],
    },
    {
      displayName: "2026-27 Regular Season",
      categories: [
        {
          events: [
            {
              eventId: "leftoverRs",
              stats: row(
                "32",
                "10-20",
                "50.0",
                "3-8",
                "37.5",
                "4-4",
                "100.0",
                "5",
                "9",
                "0",
                "2",
                "2",
                "3",
                "27",
              ),
            },
          ],
        },
      ],
    },
  ],
});

describe("last NBA game parsing", () => {
  it("maps ESPN abbreviations onto our 3-letter clubs", () => {
    expect(resolveTeamId("NY", "New York Knicks")).toBe("NYK");
    expect(resolveTeamId("GS")).toBe("GSW");
    expect(resolveTeamId("SA")).toBe("SAS");
    expect(resolveTeamId("NO")).toBe("NOP");
    expect(ESPN_ABBREV_TO_TEAM.WSH).toBe("WAS");
    expect(resolveTeamId("PHI", "Philadelphia 76ers")).toBe("PHI");
  });

  it("asks ESPN for the current season's ending year", () => {
    expect(espnGamelogSeasonYear(CURRENT_SEASON)).toBe(2027);
    expect(espnGamelogSeasonYear("2025-26")).toBe(2026);
    expect(ESPN_GAMELOG_URL("4396993")).toContain("?season=2027");
    expect(ESPN_GAMELOG_URL("4396993", 2027)).toBe(
      "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/4396993/gamelog?season=2027",
    );
  });

  it("prefers the most recent preseason game by default", () => {
    const game = parseLastGamePayload(payload(), "preseason", PRIOR_SEASON);
    expect(game?.eventId).toBe("401812725");
    expect(game?.resultLine).toBe("90-100 W VS LAC");
    expect(game?.home).toBe(false);
    expect(game?.dateLabel).toBe("10/8");
    expect(game?.stats.min).toBe("23");
    expect(game?.stats.pts).toBe("8");
  });

  it("uses the latest 2026-27 preseason game, not an older year or earlier camp game", () => {
    const game = parseLastGamePayload(haliPayload(), "preseason", CURRENT_SEASON);
    expect(game?.eventId).toBe("401908621");
    expect(game?.stats.pts).toBe("24");
    expect(game?.stats.min).toBe("18");
    expect(game?.stats.reb).toBe("3");
    expect(game?.stats.ast).toBe("3");
    expect(game?.stats.blk).toBe("2");
    expect(game?.stats.stl).toBe("0");
    expect(game?.stats.fg).toBe("9-14");
    expect(game?.stats.three).toBe("4-6");
    expect(game?.stats.tov).toBe("4");
    expect(game?.resultLine).toBe("112-114 L VS OKC");
    expect(game?.dateLabel).toBe("10/14");
    expect(game?.teamId).toBe("IND");
    expect(game?.opponentId).toBe("OKC");
    const games = parseGamelogGames(haliPayload(), "preseason", CURRENT_SEASON);
    expect(games.map((item) => item.eventId)).toEqual([
      "401908621",
      "401914123",
    ]);
    expect(games[1]?.stats.pts).toBe("7");
  });

  it("does not treat a 2024-25 14-point preseason game as last night", () => {
    const game = parseLastGamePayload(
      haliPayload(),
      "preseason",
      CURRENT_SEASON,
    );
    expect(game?.stats.pts).not.toBe("14");
    expect(
      parseLastGamePayload(haliPayload(), "preseason", "2024-25")?.stats.pts,
    ).toBe("14");
  });

  it("does not fall back to regular season when the sample is preseason", () => {
    const onlyRegular: EspnGamelogPayload = {
      labels: haliPayload().labels,
      events: { leftoverRs: haliPayload().events!.leftoverRs! },
      seasonTypes: [haliPayload().seasonTypes![2]!],
    };
    expect(parseLastGamePayload(onlyRegular, "preseason", CURRENT_SEASON)).toBeNull();
    expect(
      parseLastGamePayload(onlyRegular, "regular", CURRENT_SEASON)?.stats.pts,
    ).toBe("27");
  });

  it("uses regular or postseason games when the sample is regular", () => {
    const game = parseLastGamePayload(payload(), "regular", PRIOR_SEASON);
    expect(game?.eventId).toBe("401873344");
    expect(game?.teamId).toBe("CLE");
    expect(game?.opponentId).toBe("NYK");
    expect(game?.opponentAbbrev).toBe("NYK");
    expect(game?.playerScore).toBe("93");
    expect(game?.opponentScore).toBe("130");
    expect(game?.result).toBe("L");
    expect(game?.resultLine).toBe("93-130 L VS NYK");
    expect(game?.dateLabel).toBe("5/26");
    expect(game?.stats.pts).toBe("12");
    expect(game?.stats.reb).toBe("4");
    expect(game?.stats.ast).toBe("2");
    expect(game?.stats.stl).toBe("1");
    expect(game?.stats.blk).toBe("1");
    expect(game?.stats.fg).toBe("2-8");
    expect(game?.stats.three).toBe("0-6");
    expect(game?.stats.tov).toBe("5");
  });

  it("lists recent box scores so a game can be picked, not only the latest", () => {
    const games = parseGamelogGames(payload(), "regular", PRIOR_SEASON);
    expect(games.map((game) => game.eventId)).toEqual(["401873344"]);
    expect(games[0]?.dateLabel).toBe("5/26");
    const withPre = parseGamelogGames(
      {
        ...payload(),
        seasonTypes: [
          payload().seasonTypes![0]!,
          {
            displayName: "2025-26 Regular Season",
            categories: payload().seasonTypes![1]!.categories,
          },
        ],
      },
      "regular",
      PRIOR_SEASON,
    );
    expect(withPre.map((game) => game.eventId)).toEqual([
      "401873344",
      "401812725",
    ]);
    expect(withPre[1]?.dateLabel).toBe("10/8");
  });

  it("falls back to preseason when regular-season sample has no games", () => {
    const onlyPre: EspnGamelogPayload = {
      labels: payload().labels,
      events: { "401812725": payload().events!["401812725"]! },
      seasonTypes: [payload().seasonTypes![1]!],
    };
    const game = parseLastGamePayload(onlyPre, "regular", PRIOR_SEASON);
    expect(game?.eventId).toBe("401812725");
    expect(game?.resultLine).toBe("90-100 W VS LAC");
  });

  it("formats date and result helpers", () => {
    expect(isoDateOnly("2026-10-14T23:00:00Z")).toBe("2026-10-14");
    expect(toEspnDateParam("2026-10-14")).toBe("20261014");
    expect(shiftIsoDate("2026-10-15", -1)).toBe("2026-10-14");
    expect(nbaTodayIso(new Date("2026-10-15T18:00:00-04:00"))).toBe("2026-10-15");
    expect(formatDateLabel("2026-10-20T00:00:00Z")).toBe("10/20");
    expect(formatResultLine("88", "90", "L", "MIL")).toBe("88-90 L VS MIL");
    expect(emptyStats().fg).toBe("0-0");
    expect(parseLastGamePayload(null)).toBeNull();
    expect(parseLastGamePayload({ events: {}, seasonTypes: [] })).toBeNull();
    const games = parseGamelogGames(payload(), "regular", PRIOR_SEASON);
    expect(gameOnDate(games, "2026-05-26")?.eventId).toBe("401873344");
    expect(gameOnDate(games, "2026-10-14")).toBeNull();
  });

  it("reads the last completed team schedule game and running W-L", () => {
    expect(ESPN_TEAM_IDS.SAS).toBe(24);
    expect(ESPN_TEAM_SCHEDULE_URL(24, 2027, 1)).toContain("seasontype=1");
    const night = parseTeamScheduleLastNight(
      {
        events: [
          {
            id: "1",
            date: "2026-10-08T00:00:00Z",
            competitions: [
              {
                status: { type: { completed: true } },
                competitors: [
                  {
                    score: "111",
                    winner: true,
                    team: { abbreviation: "SA", displayName: "San Antonio Spurs" },
                  },
                  {
                    score: "109",
                    winner: false,
                    team: { abbreviation: "OKC", displayName: "Oklahoma City Thunder" },
                  },
                ],
              },
            ],
          },
          {
            id: "2",
            date: "2026-10-14T00:00:00Z",
            competitions: [
              {
                status: { type: { completed: false } },
                competitors: [
                  { team: { abbreviation: "SA" } },
                  { team: { abbreviation: "HOU" } },
                ],
              },
            ],
          },
        ],
      },
      "SAS",
    );
    expect(night.game?.opponentId).toBe("OKC");
    expect(night.game?.playerScore).toBe("111");
    expect(night.game?.opponentScore).toBe("109");
    expect(night.game?.result).toBe("W");
    expect(night.record).toEqual({ wins: 1, losses: 0 });
  });
});
