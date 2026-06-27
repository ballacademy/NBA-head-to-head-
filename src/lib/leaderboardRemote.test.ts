import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLeaderboardRemoteCacheForTests,
  getCachedRemoteLeaderboard,
  refreshLeaderboardFromApi,
} from "./leaderboardRemote";
import { upsertLeaderboardEntry } from "./leaderboard";
import { RANKED_STARTING_ELO } from "./rankedElo";

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
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-test-1",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("caches classic leaderboard entries from the API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          mode: "classic",
          seasonId: "",
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
      limit: 100,
    });

    expect(refreshed).toBe(true);
    expect(getCachedRemoteLeaderboard("classic", "elo")).toEqual([
      expect.objectContaining({
        playerId: "player-a",
        name: "Bulls",
        elo: 720,
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/leaderboards?mode=classic&sort=elo&limit=100",
      expect.any(Object),
    );
  });

  it("submits local classic upserts to the leaderboard API", async () => {
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
  });
});
