import { describe, expect, it } from "vitest";
import { parseScoreboardGames, scheduleGroups } from "./scheduleState";

describe("schedule poster", () => {
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
  });
});
