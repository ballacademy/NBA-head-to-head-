import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLeaderboardRemoteCacheForTests,
  getCachedRemoteLeaderboard,
  mergeLocalSelfIntoRemoteEntries,
  patchCachedRemoteLeaderboardSelf,
  refreshLeaderboardFromApi,
  seedRemoteLeaderboardCache,
} from "./leaderboardRemote";
import { clearAccountLinkCache, markPlayerAccountLinked } from "./accountGate";
import { upsertLeaderboardEntry } from "./leaderboard";
import { RANKED_STARTING_ELO } from "./rankedElo";
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

describe("leaderboard remote integration", () => {
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

  it("caches classic leaderboard entries from the API", async () => {
    const seasonId = getCurrentSeasonId();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          mode: "classic",
          seasonId,
          sort: "elo",
          entries: [
            {
              playerId: "player-a",
              name: "Bulls",
              publicTag: "7F3A",
              elo: 720,
              wins: 10,
              losses: 2,
              winStreak: 3,
              lossStreak: 0,
              updatedAt: "2099-01-01T00:00:00.000Z",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const refreshed = await refreshLeaderboardFromApi({
      mode: "classic",
      sort: "elo",
      limit: 500,
      seasonId,
    });

    expect(refreshed).toBe(true);
    expect(getCachedRemoteLeaderboard("classic", "elo", seasonId)).toEqual([
      expect.objectContaining({
        playerId: "player-a",
        name: "Bulls",
        elo: 720,
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/leaderboards?mode=classic&sort=elo&seasonId=${seasonId}&limit=500&viewerPlayerId=player-test-1`,
      expect.any(Object),
    );
  });

  it("submits local classic upserts to the leaderboard API", async () => {
    const seasonId = getCurrentSeasonId();
    markPlayerAccountLinked("player-test-1", "tester");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ entry: { playerId: "player-test-1" } }), {
        status: 201,
      }),
    );

    upsertLeaderboardEntry({
      playerId: "player-test-1",
      name: "Bulls",
      publicTag: "7F3A",
      elo: RANKED_STARTING_ELO,
      wins: 4,
      losses: 1,
      winStreak: 2,
      lossStreak: 0,
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/leaderboards",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"mode":"classic"'),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/leaderboards",
      expect.objectContaining({
        body: expect.stringContaining(`"seasonId":"${seasonId}"`),
      }),
    );
  });

  it("skips remote leaderboard upserts without a linked account", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ linked: false, playerId: "player-test-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    upsertLeaderboardEntry({
      playerId: "player-test-1",
      name: "Bulls",
      publicTag: "7F3A",
      elo: RANKED_STARTING_ELO,
      wins: 4,
      losses: 1,
      winStreak: 2,
      lossStreak: 0,
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/status?playerId=player-test-1",
      expect.any(Object),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/leaderboards",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("patches remote cache on local upsert so Ranks is not stuck on stale GET", () => {
    const seasonId = getCurrentSeasonId();
    seedRemoteLeaderboardCache({
      mode: "classic",
      seasonId,
      sort: "elo",
      entries: [
        {
          playerId: "player-test-1",
          isYou: true,
          name: "Bulls",
          publicTag: "7F3A",
          elo: 500,
          wins: 1,
          losses: 0,
          winStreak: 1,
          lossStreak: 0,
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    });

    patchCachedRemoteLeaderboardSelf({
      mode: "classic",
      seasonId,
      entry: {
        playerId: "player-test-1",
        name: "Bulls",
        publicTag: "7F3A",
        elo: 520,
        wins: 2,
        losses: 0,
        winStreak: 2,
        lossStreak: 0,
        updatedAt: "2026-08-11T00:00:00.000Z",
      },
    });

    expect(getCachedRemoteLeaderboard("classic", "elo", seasonId)?.[0]).toEqual(
      expect.objectContaining({
        wins: 2,
        winStreak: 2,
        elo: 520,
        isYou: true,
      }),
    );
  });

  it("merges a local-ahead self row into remote entries", () => {
    const merged = mergeLocalSelfIntoRemoteEntries(
      [
        {
          playerId: "player-test-1",
          isYou: true,
          name: "Bulls",
          publicTag: "7F3A",
          elo: 500,
          wins: 1,
          losses: 0,
          winStreak: 1,
          lossStreak: 0,
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      {
        playerId: "player-test-1",
        name: "Bulls",
        publicTag: "7F3A",
        elo: 530,
        wins: 2,
        losses: 0,
        winStreak: 2,
        lossStreak: 0,
        updatedAt: "2026-08-11T00:00:00.000Z",
      },
      "player-test-1",
    );

    expect(merged).toEqual([
      expect.objectContaining({
        wins: 2,
        winStreak: 2,
        isYou: true,
      }),
    ]);
  });

  it("does not let a fabricated multi-game local row override remote", () => {
    const remote = [
      {
        playerId: "player-test-1",
        isYou: true,
        name: "Bulls",
        publicTag: "7F3A",
        elo: 700,
        wins: 40,
        losses: 25,
        winStreak: 2,
        lossStreak: 0,
        updatedAt: "2026-08-10T00:00:00.000Z",
      },
    ];
    const merged = mergeLocalSelfIntoRemoteEntries(
      remote,
      {
        playerId: "player-test-1",
        name: "Bulls",
        publicTag: "7F3A",
        elo: 900,
        wins: 63,
        losses: 1,
        winStreak: 0,
        lossStreak: 1,
        updatedAt: "2026-08-11T00:00:00.000Z",
      },
      "player-test-1",
    );

    expect(merged).toEqual([
      expect.objectContaining({
        wins: 40,
        losses: 25,
      }),
    ]);
  });
});
