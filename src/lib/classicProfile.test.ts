import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyClassicMatchResult,
  ensureCurrentClassicSeason,
  saveClassicProfile,
} from "./classicProfile";
import {
  getLeaderboardFootnote,
  getTopLeaderboard,
  upsertLeaderboardEntry,
} from "./leaderboard";
import { RANKED_STARTING_ELO, RATING_LABEL } from "./rankedElo";
import { getCurrentSeasonId } from "./rankedSeason";

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  clear: () => {
    storage.clear();
  },
};

describe("classic profile and leaderboard", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-classic-1",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts classic players at 500 banners", () => {
    expect(ensureCurrentClassicSeason().elo).toBe(RANKED_STARTING_ELO);
  });

  it("resets banners when the calendar month changes", () => {
    saveClassicProfile({
      playerId: "player-classic-1",
      seasonId: "2020-01",
      elo: 1200,
      peakElo: 1200,
      classicGamesPlayed: 8,
    });

    const profile = ensureCurrentClassicSeason();

    expect(profile.seasonId).toBe(getCurrentSeasonId());
    expect(profile.elo).toBe(RANKED_STARTING_ELO);
    expect(profile.classicGamesPlayed).toBe(0);
  });

  it("updates banners after classic matches and surfaces the player on the leaderboard", () => {
    const result = applyClassicMatchResult({
      result: "win",
      opponentElo: 500,
      winStreak: 1,
      lossStreak: 0,
    });

    upsertLeaderboardEntry({
      playerId: "player-classic-1",
      name: "Bulls",
      elo: result.profile.elo,
      wins: 1,
      losses: 0,
      winStreak: 1,
      lossStreak: 0,
    });

    expect(result.delta).toBeGreaterThan(0);
    expect(result.profile.elo).not.toBe(RANKED_STARTING_ELO);
    expect(
      getTopLeaderboard("elo").some(
        (entry) => entry.playerId === "player-classic-1",
      ),
    ).toBe(true);
  });

  it("matches the Pro-style monthly leaderboard subtitle", () => {
    expect(getLeaderboardFootnote("elo")).toContain(
      "ratings reset at the start of each calendar month",
    );
    expect(getLeaderboardFootnote("elo")).toContain(`Sorted by ${RATING_LABEL}.`);
    expect(getLeaderboardFootnote("winStreak")).toContain(
      "Sorted by active win streak.",
    );
  });
});
