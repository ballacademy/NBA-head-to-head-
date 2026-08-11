import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markPlayerAccountLinked, clearAccountLinkCache } from "./accountGate";
import { getTopLeaderboard, upsertLeaderboardEntry } from "./leaderboard";
import {
  clearLeaderboardRemoteCacheForTests,
  seedRemoteLeaderboardCache,
} from "./leaderboardRemote";
import { recordMatchResult } from "./playerRecord";
import { saveClassicProfile } from "./classicProfile";
import { getCurrentSeasonId } from "./rankedSeason";
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
    clearAccountLinkCache();
    clearLeaderboardRemoteCacheForTests();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-sync-test",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ linked: false }), { status: 200 }),
      ),
    );
    recordMatchResult("win", "headToHead");
    saveClassicProfile({
      playerId: "player-sync-test",
      seasonId: getCurrentSeasonId(),
      elo: 640,
      peakElo: 640,
      classicGamesPlayed: 1,
    });
    upsertLeaderboardEntry({
      playerId: "player-sync-test",
      name: "Old Name",
      publicTag: "7F3A",
      username: "ballacademy",
      elo: 640,
      wins: 1,
      losses: 0,
      winStreak: 1,
      lossStreak: 0,
    });
  });

  afterEach(() => {
    clearAccountLinkCache();
    clearLeaderboardRemoteCacheForTests();
    vi.unstubAllGlobals();
  });

  it("updates the classic leaderboard name without changing rank stats", () => {
    syncTeamNameToLeaderboards({ name: "New Name" });

    const entry = getTopLeaderboard("elo").find(
      (candidate) => candidate.playerId === "player-sync-test",
    );

    expect(entry?.name).toBe("New Name");
    expect(entry?.username).toBe("ballacademy");
    expect(entry?.elo).toBe(640);
    expect(entry?.wins).toBe(1);
  });

  it("keeps username from the account link cache when the local row lacked it", () => {
    markPlayerAccountLinked("player-sync-test", "ballacademy");
    upsertLeaderboardEntry(
      {
        playerId: "player-sync-test",
        name: "Old Name",
        publicTag: "7F3A",
        elo: 640,
        wins: 1,
        losses: 0,
        winStreak: 1,
        lossStreak: 0,
      },
      { sync: false },
    );

    syncTeamNameToLeaderboards({ name: "Renamed" });

    expect(
      getTopLeaderboard("elo").find(
        (candidate) => candidate.playerId === "player-sync-test",
      ),
    ).toMatchObject({
      name: "Renamed",
      username: "ballacademy",
    });
  });

  it("keeps username when a remote cache row is patched by a rename", () => {
    const seasonId = getCurrentSeasonId();
    seedRemoteLeaderboardCache({
      mode: "classic",
      seasonId,
      sort: "elo",
      entries: [
        {
          playerId: "player-sync-test",
          isYou: true,
          name: "Old Name",
          publicTag: "7F3A",
          username: "ballacademy",
          elo: 640,
          wins: 1,
          losses: 0,
          winStreak: 1,
          lossStreak: 0,
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    });

    syncTeamNameToLeaderboards({ name: "New Name" });

    const entry = getTopLeaderboard("elo").find(
      (candidate) => candidate.playerId === "player-sync-test",
    );

    expect(entry).toMatchObject({
      name: "New Name",
      username: "ballacademy",
    });
  });

  it("syncs when saveTeamProfile is called", () => {
    saveTeamProfile({ name: "Saved Name" });

    expect(loadTeamProfile()).toEqual({ name: "Saved Name" });

    const entry = getTopLeaderboard("elo").find(
      (candidate) => candidate.playerId === "player-sync-test",
    );

    expect(entry?.name).toBe("Saved Name");
    expect(entry?.username).toBe("ballacademy");
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
