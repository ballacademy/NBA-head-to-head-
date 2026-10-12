import { describe, expect, it } from "vitest";
import {
  ESPN_ABBREV_TO_TEAM,
  emptyStats,
  formatDateLabel,
  formatResultLine,
  parseLastGamePayload,
  resolveTeamId,
  type EspnGamelogPayload,
} from "./lastGame";

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

describe("last NBA game parsing", () => {
  it("maps ESPN abbreviations onto our 3-letter clubs", () => {
    expect(resolveTeamId("NY", "New York Knicks")).toBe("NYK");
    expect(resolveTeamId("GS")).toBe("GSW");
    expect(resolveTeamId("SA")).toBe("SAS");
    expect(resolveTeamId("NO")).toBe("NOP");
    expect(ESPN_ABBREV_TO_TEAM.WSH).toBe("WAS");
    expect(resolveTeamId("PHI", "Philadelphia 76ers")).toBe("PHI");
  });

  it("takes the most recent non-preseason game and formats the result line", () => {
    const game = parseLastGamePayload(payload());
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

  it("falls back to preseason only when that is the whole log", () => {
    const onlyPre: EspnGamelogPayload = {
      labels: payload().labels,
      events: { "401812725": payload().events!["401812725"]! },
      seasonTypes: [payload().seasonTypes![1]!],
    };
    const game = parseLastGamePayload(onlyPre);
    expect(game?.eventId).toBe("401812725");
    expect(game?.resultLine).toBe("90-100 W VS LAC");
  });

  it("formats date and result helpers", () => {
    expect(formatDateLabel("2026-10-20T00:00:00Z")).toBe("10/20");
    expect(formatResultLine("88", "90", "L", "MIL")).toBe("88-90 L VS MIL");
    expect(emptyStats().fg).toBe("0-0");
    expect(parseLastGamePayload(null)).toBeNull();
    expect(parseLastGamePayload({ events: {}, seasonTypes: [] })).toBeNull();
  });
});
