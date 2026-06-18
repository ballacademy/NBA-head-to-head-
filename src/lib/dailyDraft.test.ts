import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import {
  filterPlayersForDailyChallenge,
  getDailyChallenge,
  getDailyDateKey,
  getDailyDraftSetup,
  playerMatchesDailyFilter,
} from "./dailyDraft";

describe("dailyDraft", () => {
  it("returns the same challenge and slots for a given date", () => {
    const first = getDailyDraftSetup("2026-06-15");
    const second = getDailyDraftSetup("2026-06-15");

    expect(first.challenge.id).toBe(second.challenge.id);
    expect(first.slots).toEqual(second.slots);
  });

  it("filters players for the active daily challenge", () => {
    const challenge = getDailyChallenge("2026-06-15");
    const eligible = filterPlayersForDailyChallenge(players, challenge);

    expect(eligible.length).toBeGreaterThan(0);
    expect(
      eligible.every((player) =>
        playerMatchesDailyFilter(player, challenge.filter),
      ),
    ).toBe(true);
  });

  it("uses the current date key by default", () => {
    expect(getDailyDateKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
