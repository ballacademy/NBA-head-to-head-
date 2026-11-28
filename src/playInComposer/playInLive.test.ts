import { describe, expect, it } from "vitest";
import {
  applyLivePlayInScores,
  parsePlayInScoreboard,
  scoresFromLiveGames,
} from "./playInLive";
import { defaultPlayInDraft } from "./playInState";

describe("play-in live scores", () => {
  it("maps a finished 7v8 and 9v10 onto the board and advances 9v10", () => {
    const games = parsePlayInScoreboard({
      events: [
        {
          status: { type: { completed: true, state: "post" } },
          competitions: [
            {
              competitors: [
                {
                  homeAway: "home",
                  score: "112",
                  team: { abbreviation: "BOS" },
                },
                {
                  homeAway: "away",
                  score: "104",
                  team: { abbreviation: "NYK" },
                },
              ],
            },
          ],
        },
        {
          status: { type: { completed: true, state: "post" } },
          competitions: [
            {
              competitors: [
                {
                  homeAway: "home",
                  score: "98",
                  team: { abbreviation: "ATL" },
                },
                {
                  homeAway: "away",
                  score: "121",
                  team: { abbreviation: "CHI" },
                },
              ],
            },
          ],
        },
      ],
    });
    const ids = ["BOS", "NYK", "ATL", "CHI"];
    const scores = scoresFromLiveGames(ids, 8, games);
    expect(scores.sevenEight).toEqual(["112", "104"]);
    expect(scores.nineTen).toEqual(["98", "121"]);
    const next = applyLivePlayInScores(
      { ...defaultPlayInDraft(), east: ids },
      games,
    );
    expect(next.eastScores?.sevenEight).toEqual(["112", "104"]);
    expect(next.eastScores?.nineTen).toEqual(["98", "121"]);
  });
});
