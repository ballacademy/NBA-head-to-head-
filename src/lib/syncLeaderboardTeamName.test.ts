import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTopLeaderboard, upsertLeaderboardEntry } from "./leaderboard";
import { recordMatchResult } from "./playerRecord";
import { saveClassicProfile } from "./classicProfile";
import { syncTeamNameToLeaderboards } from "./syncLeaderboardTeamName";
import { loadTeamProfile, saveTeamProfile } from "./teamProfile";

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

describe("syncLeaderboardTeamName", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-sync-test",
    });
    recordMatchResult("win", "headToHead");
    saveClassicProfile({
      playerId: "player-sync-test",
      elo: 640,
      peakElo: 640,
      classicGamesPlayed: 1,
    });
    upsertLeaderboardEntry({
      playerId: "player-sync-test",
      name: "Old Name",
      publicTag: "7F3A",
      elo: 640,
      wins: 1,
      losses: 0,
      winStreak: 1,
      lossStreak: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates the classic leaderboard name without changing rank stats", () => {
    syncTeamNameToLeaderboards({ name: "New Name" });

    const entry = getTopLeaderboard("elo").find(
      (candidate) => candidate.playerId === "player-sync-test",
    );

    expect(entry?.name).toBe("New Name");
    expect(entry?.elo).toBe(640);
    expect(entry?.wins).toBe(1);
  });

  it("syncs when saveTeamProfile is called", () => {
    saveTeamProfile({ name: "Saved Name" });

    expect(loadTeamProfile()).toEqual({ name: "Saved Name" });

    const entry = getTopLeaderboard("elo").find(
      (candidate) => candidate.playerId === "player-sync-test",
    );

    expect(entry?.name).toBe("Saved Name");
  });

  it("does not create a leaderboard row for players with no games", () => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-no-games",
    });

    saveTeamProfile({ name: "Fresh Team" });

    expect(getTopLeaderboard("elo")).toEqual([]);
  });

  it("rejects profane names when saving", () => {
    saveTeamProfile({ name: "shit team" });

    expect(loadTeamProfile()).toBeNull();
    expect(
      getTopLeaderboard("elo").find(
        (candidate) => candidate.playerId === "player-sync-test",
      )?.name,
    ).toBe("Old Name");
  });
});
