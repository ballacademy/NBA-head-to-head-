import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccountLinkCache, markPlayerAccountLinked } from "./accountGate";
import { readJson, writeJson } from "./browserStorage";
import {
  getOrCreatePlayerIdentity,
  setPlayerIdentity,
} from "./playerIdentity";
import {
  logoutToAnonymousIdentity,
  restorePlayerIdentityFromLogin,
} from "./restorePlayerIdentity";
import { loadLeaderboardEntries } from "./leaderboard";
import { loadRankedLeaderboardEntries } from "./rankedLeaderboard";
import { loadTeamProfile } from "./teamProfile";
import { getCurrentSeasonId } from "./rankedSeason";

vi.mock("./leaderboardApi", () => ({
  fetchRemoteLeaderboard: vi.fn(),
}));

vi.mock("./playerProfileApi", () => ({
  fetchRemotePlayerProfile: vi.fn(),
}));

vi.mock("./collectionRemote", () => ({
  pullAndMergeCollection: vi.fn(async () => null),
}));

vi.mock("./achievementsRemote", () => ({
  pullAndMergeAchievements: vi.fn(async () => null),
}));

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
};

describe("logoutToAnonymousIdentity", () => {
  beforeEach(() => {
    storage.clear();
    clearAccountLinkCache();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-anonymous-new",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mints a new anonymous identity and clears account-bound local state", () => {
    setPlayerIdentity("player-linked-old");
    markPlayerAccountLinked("player-linked-old", "hooper");
    writeJson("nba-head-to-head-team-profile", { name: "Old Team" });
    writeJson("nba-head-to-head-classic-profile", {
      playerId: "player-linked-old",
      elo: 600,
    });
    writeJson("nba-head-to-head-event-profiles", { "event-1": { wins: 2 } });
    writeJson("nba-head-to-head-tier-list", { tiers: [] });
    writeJson("nba-head-to-head-tier-list-library", { lists: [] });
    writeJson("nba-head-to-head-tier-list-public", { entries: [] });
    writeJson("nba-head-to-head-pending-lineup-classic-player-linked-old", {
      storedLineupId: "lineup-1",
      mode: "classic",
      submittedAt: "2026-08-01T00:00:00.000Z",
    });

    const next = logoutToAnonymousIdentity();

    expect(next.playerId).toBe("player-anonymous-new");
    expect(getOrCreatePlayerIdentity().playerId).toBe("player-anonymous-new");
    expect(readJson("nba-head-to-head-team-profile")).toBeNull();
    expect(readJson("nba-head-to-head-classic-profile")).toBeNull();
    expect(readJson("nba-head-to-head-event-profiles")).toBeNull();
    expect(readJson("nba-head-to-head-tier-list")).toBeNull();
    expect(readJson("nba-head-to-head-tier-list-library")).toBeNull();
    expect(readJson("nba-head-to-head-tier-list-public")).toBeNull();
    expect(
      readJson("nba-head-to-head-pending-lineup-classic-player-linked-old"),
    ).toBeNull();
  });
});

describe("restorePlayerIdentityFromLogin", () => {
  beforeEach(() => {
    storage.clear();
    clearAccountLinkCache();
    vi.restoreAllMocks();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-anonymous-new",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("restores team name and seeds local season leaderboard rows", async () => {
    const { fetchRemoteLeaderboard } = await import("./leaderboardApi");
    const { fetchRemotePlayerProfile } = await import("./playerProfileApi");
    const seasonId = getCurrentSeasonId();

    setPlayerIdentity("player-anonymous-old");
    writeJson("nba-head-to-head-team-profile", { name: "Guest Team" });

    vi.mocked(fetchRemoteLeaderboard).mockImplementation(async ({ mode }) => {
      if (mode === "classic") {
        return {
          mode: "classic" as const,
          seasonId,
          sort: "elo" as const,
          entries: [
            {
              playerId: "player-linked",
              isYou: true,
              name: "Night Owls",
              publicTag: "ABCD",
              elo: 520,
              wins: 3,
              losses: 1,
              winStreak: 2,
              lossStreak: 0,
              updatedAt: "2026-08-01T00:00:00.000Z",
            },
          ],
        };
      }

      return {
        mode: "ranked" as const,
        seasonId,
        sort: "elo" as const,
        entries: [
          {
            playerId: "player-linked",
            isYou: true,
            name: "Night Owls",
            publicTag: "ABCD",
            elo: 1510,
            wins: 4,
            losses: 2,
            winStreak: 1,
            lossStreak: 0,
            updatedAt: "2026-08-01T00:00:00.000Z",
          },
        ],
      };
    });

    vi.mocked(fetchRemotePlayerProfile).mockResolvedValue({
      playerId: "player-linked",
      legacy: null,
      currentSeason: {
        seasonId,
        mode: "ranked",
        elo: 1510,
        rank: 12,
        wins: 4,
        losses: 2,
        winStreak: 1,
        lossStreak: 0,
        teamName: "Night Owls",
        publicTag: "ABCD",
      },
    });

    await restorePlayerIdentityFromLogin("player-linked");

    expect(getOrCreatePlayerIdentity().playerId).toBe("player-linked");
    expect(loadTeamProfile()?.name).toBe("Night Owls");

    const classic = loadLeaderboardEntries().find(
      (entry) => entry.playerId === "player-linked",
    );
    expect(classic).toMatchObject({
      name: "Night Owls",
      wins: 3,
      losses: 1,
      winStreak: 2,
    });

    const ranked = loadRankedLeaderboardEntries().find(
      (entry) => entry.playerId === "player-linked",
    );
    expect(ranked).toMatchObject({
      name: "Night Owls",
      wins: 4,
      losses: 2,
      elo: 1510,
    });
  });
});
