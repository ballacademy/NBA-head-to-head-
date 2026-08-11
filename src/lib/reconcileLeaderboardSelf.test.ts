import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccountLinkCache } from "./accountGate";
import { loadClassicProfile, saveClassicProfile } from "./classicProfile";
import {
  getTopLeaderboard,
  loadLeaderboardEntries,
  upsertLeaderboardEntry,
} from "./leaderboard";
import {
  clearLeaderboardRemoteCacheForTests,
  seedRemoteLeaderboardCache,
} from "./leaderboardRemote";
import { RANKED_STARTING_ELO } from "./rankedElo";
import { getCurrentSeasonId } from "./rankedSeason";
import { reconcileLocalClassicLeaderboardFromRemote } from "./reconcileLeaderboardSelf";

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

describe("reconcileLocalClassicLeaderboardFromRemote", () => {
  beforeEach(() => {
    storage.clear();
    clearLeaderboardRemoteCacheForTests();
    clearAccountLinkCache();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-test-1",
    });
  });

  afterEach(() => {
    clearAccountLinkCache();
    clearLeaderboardRemoteCacheForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("replaces a fabricated local 63-1 with the remote season record", () => {
    const seasonId = getCurrentSeasonId();
    saveClassicProfile({
      playerId: "player-test-1",
      seasonId,
      elo: 900,
      peakElo: 900,
      classicGamesPlayed: 64,
    });
    upsertLeaderboardEntry(
      {
        playerId: "player-test-1",
        name: "Ball Academy",
        publicTag: "817E",
        elo: 900,
        wins: 63,
        losses: 1,
        winStreak: 0,
        lossStreak: 1,
      },
      { sync: false },
    );
    seedRemoteLeaderboardCache({
      mode: "classic",
      seasonId,
      sort: "elo",
      entries: [
        {
          playerId: "player-test-1",
          isYou: true,
          name: "Ball Academy",
          publicTag: "817E",
          username: "ballacademy",
          elo: 394,
          wins: 27,
          losses: 31,
          winStreak: 0,
          lossStreak: 6,
          updatedAt: "2026-08-05T02:46:15.139Z",
        },
      ],
    });

    expect(reconcileLocalClassicLeaderboardFromRemote(seasonId)).toBe(true);

    expect(
      loadLeaderboardEntries().find(
        (entry) => entry.playerId === "player-test-1",
      ),
    ).toMatchObject({
      wins: 27,
      losses: 31,
      elo: 394,
      lossStreak: 6,
    });
    expect(loadClassicProfile().classicGamesPlayed).toBe(58);
    expect(
      getTopLeaderboard("elo").find(
        (entry) => entry.playerId === "player-test-1",
      ),
    ).toMatchObject({
      wins: 27,
      losses: 31,
    });
  });

  it("keeps a one-match local ahead pending remote sync", () => {
    const seasonId = getCurrentSeasonId();
    upsertLeaderboardEntry(
      {
        playerId: "player-test-1",
        name: "Ball Academy",
        publicTag: "817E",
        elo: RANKED_STARTING_ELO + 20,
        wins: 28,
        losses: 31,
        winStreak: 1,
        lossStreak: 0,
      },
      { sync: false },
    );
    seedRemoteLeaderboardCache({
      mode: "classic",
      seasonId,
      sort: "elo",
      entries: [
        {
          playerId: "player-test-1",
          isYou: true,
          name: "Ball Academy",
          publicTag: "817E",
          elo: RANKED_STARTING_ELO,
          wins: 27,
          losses: 31,
          winStreak: 0,
          lossStreak: 6,
          updatedAt: "2026-08-05T02:46:15.139Z",
        },
      ],
    });

    expect(reconcileLocalClassicLeaderboardFromRemote(seasonId)).toBe(false);
    expect(
      loadLeaderboardEntries().find(
        (entry) => entry.playerId === "player-test-1",
      ),
    ).toMatchObject({
      wins: 28,
      losses: 31,
    });
  });
});
