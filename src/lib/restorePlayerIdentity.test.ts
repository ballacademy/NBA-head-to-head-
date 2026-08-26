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
import { loadAllModeRecords } from "./playerRecord";
import { loadClassicProfile } from "./classicProfile";
import { loadRankedProfile } from "./rankedProfile";
import { loadGmLegacyStats } from "./gmLegacyStats";
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
  pushCollectionIfLinked: vi.fn(async () => true),
  resetCollectionPullGate: vi.fn(),
}));

vi.mock("./achievementsRemote", () => ({
  pullAndMergeAchievements: vi.fn(async () => null),
  pushAchievementsIfLinked: vi.fn(async () => true),
  resetAchievementsPullGate: vi.fn(),
}));

vi.mock("./careerStatsRemote", () => ({
  pullAndMergeCareerStats: vi.fn(async () => null),
  pushCareerStatsIfLinked: vi.fn(async () => true),
  resetCareerPullGate: vi.fn(),
}));

vi.mock("./nbaPlayerUsageRemote", () => ({
  pullAndMergeNbaPlayerUsage: vi.fn(async () => null),
  pushNbaPlayerUsageIfLinked: vi.fn(async () => true),
  resetNbaPlayerUsagePullGate: vi.fn(),
}));

vi.mock("./eventProfileRemote", () => ({
  pullAndMergeEventProfiles: vi.fn(async () => null),
  pushEventProfilesIfLinked: vi.fn(async () => true),
  resetEventProfilesPullGate: vi.fn(),
}));

vi.mock("./tierListLibraryRemote", () => ({
  pullAndMergeTierListLibrary: vi.fn(async () => null),
  pushTierListLibraryIfLinked: vi.fn(async () => true),
  resetTierListLibraryPullGate: vi.fn(),
}));

vi.mock("./dailyDraftHistoryRemote", () => ({
  pullAndMergeDailyDraftHistory: vi.fn(async () => null),
}));

vi.mock("./dailyDraftScores", async () => {
  const actual = await vi.importActual<typeof import("./dailyDraftScores")>(
    "./dailyDraftScores",
  );
  return {
    ...actual,
    refreshDailyDraftScoresFromApi: vi.fn(async () => true),
    flushLocalDailyDraftScoresToRemote: vi.fn(async () => ({
      ok: true,
      submitted: 0,
    })),
  };
});

vi.mock("./accountApi", () => ({
  logoutAccount: vi.fn(async () => ({ ok: true })),
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

  it("mints a new anonymous identity and clears account-bound local state", async () => {
    setPlayerIdentity("player-linked-old");
    markPlayerAccountLinked("player-linked-old", "hooper");
    writeJson("nba-head-to-head-team-profile", { name: "Old Team" });
    writeJson("nba-head-to-head-classic-profile", {
      playerId: "player-linked-old",
      elo: 600,
    });
    writeJson("nba-head-to-head-daily-scores", {
      "2099-01-01": [
        {
          playerId: "player-linked-old",
          goalId: "pts",
          value: 120,
          formattedResult: "120.0 PTS",
          submittedAt: "2099-01-01T12:00:00.000Z",
        },
      ],
    });
    writeJson("nba-head-to-head-recorded-match-ids", ["match-old-1"]);
    writeJson("nba-head-to-head-all-time-profile", {
      playerId: "player-linked-old",
      elo: 900,
      peakElo: 1100,
      gamesPlayed: 12,
    });
    writeJson("nba-head-to-head-event-profiles", { "event-1": { wins: 2 } });
    writeJson("nba-head-to-head-tier-list", { tiers: [] });
    writeJson("nba-head-to-head-tier-list-library", { lists: [] });
    writeJson("nba-head-to-head-tier-list-public", { entries: [] });
    writeJson("nba-head-to-head-community-shareables", [{ kind: "lineup" }]);
    writeJson("nba-head-to-head-community-muted-players", ["player-2"]);
    writeJson("nba-head-to-head-community-posts", { posts: [] });
    writeJson("nba-head-to-head-community-rate", { "player-linked-old": 1 });
    writeJson("ddgm:weekly-recap-seen", { "2026-08-11": true });
    writeJson("nba-head-to-head-pending-lineup-classic-player-linked-old", {
      storedLineupId: "lineup-1",
      mode: "classic",
      submittedAt: "2026-08-01T00:00:00.000Z",
    });

    const next = await logoutToAnonymousIdentity();

    expect(next.ok).toBe(true);
    if (!next.ok) {
      return;
    }
    expect(next.identity.playerId).toBe("player-anonymous-new");
    expect(getOrCreatePlayerIdentity().playerId).toBe("player-anonymous-new");
    expect(readJson("nba-head-to-head-team-profile")).toBeNull();
    expect(readJson("nba-head-to-head-classic-profile")).toBeNull();
    expect(readJson("nba-head-to-head-daily-scores")).toBeNull();
    expect(readJson("nba-head-to-head-recorded-match-ids")).toBeNull();
    expect(readJson("nba-head-to-head-all-time-profile")).toBeNull();
    expect(readJson("nba-head-to-head-event-profiles")).toBeNull();
    expect(readJson("nba-head-to-head-tier-list")).toBeNull();
    expect(readJson("nba-head-to-head-tier-list-library")).toBeNull();
    expect(readJson("nba-head-to-head-tier-list-public")).toBeNull();
    expect(readJson("nba-head-to-head-community-shareables")).toBeNull();
    expect(readJson("nba-head-to-head-community-muted-players")).toBeNull();
    expect(readJson("nba-head-to-head-community-posts")).toBeNull();
    expect(readJson("nba-head-to-head-community-rate")).toBeNull();
    expect(readJson("ddgm:weekly-recap-seen")).toBeNull();
    expect(readJson("ddgm:match-game-log")).toBeNull();
    expect(readJson("ddgm:weekly-h2h")).toBeNull();
    expect(readJson("nba-head-to-head-nba-player-usage")).toBeNull();
    expect(
      readJson("nba-head-to-head-pending-lineup-classic-player-linked-old"),
    ).toBeNull();
  });

  it("blocks logout when Daily flush fails unless forced", async () => {
    const { flushLocalDailyDraftScoresToRemote } = await import(
      "./dailyDraftScores"
    );
    vi.mocked(flushLocalDailyDraftScoresToRemote).mockResolvedValueOnce({
      ok: false,
      submitted: 0,
      failed: 1,
    });

    setPlayerIdentity("player-linked-old");
    writeJson("nba-head-to-head-daily-scores", {
      "2099-01-01": [
        {
          playerId: "player-linked-old",
          goalId: "pts",
          value: 120,
          formattedResult: "120.0 PTS",
          submittedAt: "2099-01-01T12:00:00.000Z",
        },
      ],
    });

    const blocked = await logoutToAnonymousIdentity();
    expect(blocked.ok).toBe(false);
    expect(getOrCreatePlayerIdentity().playerId).toBe("player-linked-old");
    expect(readJson("nba-head-to-head-daily-scores")).not.toBeNull();

    const forced = await logoutToAnonymousIdentity({ force: true });
    expect(forced.ok).toBe(true);
    if (forced.ok) {
      expect(forced.identity.playerId).toBe("player-anonymous-new");
    }
    expect(readJson("nba-head-to-head-daily-scores")).toBeNull();
  });

  it("blocks logout when cloud progress flush fails unless forced", async () => {
    const { pushCareerStatsIfLinked } = await import("./careerStatsRemote");
    vi.mocked(pushCareerStatsIfLinked).mockResolvedValueOnce(false);
    markPlayerAccountLinked("player-linked-old", "hooper");
    setPlayerIdentity("player-linked-old");

    const blocked = await logoutToAnonymousIdentity();
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.pendingCloudCount).toBeGreaterThan(0);
      expect(blocked.error).toContain("cloud progress");
    }
    expect(getOrCreatePlayerIdentity().playerId).toBe("player-linked-old");

    vi.mocked(pushCareerStatsIfLinked).mockResolvedValue(true);
    const forced = await logoutToAnonymousIdentity({ force: true });
    expect(forced.ok).toBe(true);
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

  it("does not seed career mode records from monthly boards", async () => {
    const { fetchRemoteLeaderboard } = await import("./leaderboardApi");
    const { fetchRemotePlayerProfile } = await import("./playerProfileApi");
    const seasonId = getCurrentSeasonId();

    setPlayerIdentity("player-anonymous-old");
    writeJson("nba-head-to-head-player-records-by-mode", {
      headToHead: { wins: 40, losses: 10, winStreak: 3, lossStreak: 0 },
      ranked: { wins: 25, losses: 8, winStreak: 1, lossStreak: 0 },
      allTime: { wins: 5, losses: 2, winStreak: 0, lossStreak: 1 },
    });

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
        teamName: "Night Owls",
        publicTag: "ABCD",
      },
    });

    await restorePlayerIdentityFromLogin("player-linked");

    const records = loadAllModeRecords();
    expect(records.headToHead).toMatchObject({ wins: 0, losses: 0 });
    expect(records.ranked).toMatchObject({ wins: 0, losses: 0 });
    expect(records.allTime).toMatchObject({ wins: 0, losses: 0 });
  });

  it("restores career mode records from cloud career stats", async () => {
    const { fetchRemoteLeaderboard } = await import("./leaderboardApi");
    const { fetchRemotePlayerProfile } = await import("./playerProfileApi");
    const { pullAndMergeCareerStats } = await import("./careerStatsRemote");
    const { replaceModePlayerRecords } = await import("./playerRecord");
    const { saveAllTimeProfile } = await import("./allTimeProfile");
    const seasonId = getCurrentSeasonId();

    setPlayerIdentity("player-anonymous-old");

    vi.mocked(fetchRemoteLeaderboard).mockResolvedValue({
      mode: "ranked",
      seasonId,
      sort: "elo",
      entries: [],
    });
    vi.mocked(fetchRemotePlayerProfile).mockResolvedValue({
      playerId: "player-linked",
      legacy: null,
    });
    vi.mocked(pullAndMergeCareerStats).mockImplementation(async () => {
      replaceModePlayerRecords({
        headToHead: {
          wins: 40,
          losses: 10,
          ties: 0,
          winStreak: 3,
          lossStreak: 0,
        },
        ranked: {
          wins: 25,
          losses: 8,
          ties: 0,
          winStreak: 1,
          lossStreak: 0,
        },
        allTime: {
          wins: 5,
          losses: 2,
          ties: 0,
          winStreak: 0,
          lossStreak: 1,
        },
      });
      saveAllTimeProfile({
        playerId: "player-linked",
        elo: 900,
        peakElo: 1200,
        gamesPlayed: 7,
      });
      return null;
    });

    await restorePlayerIdentityFromLogin("player-linked");

    expect(loadAllModeRecords().headToHead).toMatchObject({
      wins: 40,
      losses: 10,
    });
    expect(loadAllModeRecords().ranked).toMatchObject({ wins: 25, losses: 8 });
    expect(loadAllModeRecords().allTime).toMatchObject({ wins: 5, losses: 2 });
  });

  it("keeps daily scores on login and seeds season peak from current Elo only", async () => {
    const { fetchRemoteLeaderboard } = await import("./leaderboardApi");
    const { fetchRemotePlayerProfile } = await import("./playerProfileApi");
    const { refreshDailyDraftScoresFromApi } = await import("./dailyDraftScores");
    const seasonId = getCurrentSeasonId();

    setPlayerIdentity("player-anonymous-old");
    writeJson("nba-head-to-head-daily-scores", {
      "2099-01-01": [
        {
          playerId: "player-linked",
          goalId: "pts",
          value: 99,
          formattedResult: "99.0 PTS",
          percentile: 88,
          submittedAt: "2099-01-01T12:00:00.000Z",
        },
      ],
    });

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
              elo: 480,
              wins: 2,
              losses: 3,
              winStreak: 0,
              lossStreak: 1,
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
            elo: 1400,
            wins: 4,
            losses: 2,
            winStreak: 0,
            lossStreak: 1,
            updatedAt: "2026-08-01T00:00:00.000Z",
          },
        ],
      };
    });

    vi.mocked(fetchRemotePlayerProfile).mockResolvedValue({
      playerId: "player-linked",
      legacy: {
        playerId: "player-linked",
        peakElo: 2100,
        peakEloSeasonId: "2026-01",
        bestMonthlyRank: 3,
        bestMonthlyRankSeasonId: "2026-01",
        updatedAt: "2026-01-15T00:00:00.000Z",
      },
      currentSeason: {
        seasonId,
        mode: "ranked",
        elo: 1400,
        rank: 40,
        wins: 4,
        losses: 2,
        teamName: "Night Owls",
        publicTag: "ABCD",
      },
    });

    await restorePlayerIdentityFromLogin("player-linked");

    expect(readJson("nba-head-to-head-daily-scores")).toMatchObject({
      "2099-01-01": [
        expect.objectContaining({
          playerId: "player-linked",
          value: 99,
        }),
      ],
    });
    expect(refreshDailyDraftScoresFromApi).toHaveBeenCalled();
    expect(loadRankedProfile().peakElo).toBe(1400);
    expect(loadClassicProfile().peakElo).toBe(480);
    expect(loadGmLegacyStats().peakElo).toBe(2100);
    expect(loadGmLegacyStats().bestMonthlyRank).toBe(3);
  });

  it("does not mint a random starter collection during login restore", async () => {
    const { fetchRemoteLeaderboard } = await import("./leaderboardApi");
    const { fetchRemotePlayerProfile } = await import("./playerProfileApi");
    const { loadPlayerCollection } = await import("./playerCollection");
    const { getRecentAllStarUnlockPlayerIds } = await import("./allStars");
    const seasonId = getCurrentSeasonId();

    setPlayerIdentity("player-anonymous-old");

    vi.mocked(fetchRemoteLeaderboard).mockResolvedValue({
      mode: "ranked",
      seasonId,
      sort: "elo",
      entries: [],
    });
    vi.mocked(fetchRemotePlayerProfile).mockResolvedValue({
      playerId: "player-linked",
      legacy: null,
    });

    await restorePlayerIdentityFromLogin("player-linked");

    expect(new Set(loadPlayerCollection().unlockedIds)).toEqual(
      new Set(getRecentAllStarUnlockPlayerIds()),
    );
  });

  it("restores most drafted usage from cloud on login", async () => {
    const { fetchRemoteLeaderboard } = await import("./leaderboardApi");
    const { fetchRemotePlayerProfile } = await import("./playerProfileApi");
    const { pullAndMergeNbaPlayerUsage } = await import("./nbaPlayerUsageRemote");
    const { loadNbaPlayerUsageStore, saveNbaPlayerUsageStore } = await import(
      "./nbaPlayerUsage"
    );
    const seasonId = getCurrentSeasonId();

    setPlayerIdentity("player-anonymous-old");
    saveNbaPlayerUsageStore({
      version: 1,
      byPlayerId: {
        "nba-local": {
          headToHead: { drafts: 1, wins: 1, losses: 0, ties: 0 },
        },
      },
      recordedKeys: ["local-match"],
      dailyBackfillDone: false,
      dailyLineups: {},
    });

    vi.mocked(fetchRemoteLeaderboard).mockResolvedValue({
      mode: "ranked",
      seasonId,
      sort: "elo",
      entries: [],
    });
    vi.mocked(fetchRemotePlayerProfile).mockResolvedValue({
      playerId: "player-linked",
      legacy: null,
    });
    vi.mocked(pullAndMergeNbaPlayerUsage).mockImplementation(async () => {
      saveNbaPlayerUsageStore({
        version: 1,
        byPlayerId: {
          "nba-local": {
            headToHead: { drafts: 1, wins: 1, losses: 0, ties: 0 },
          },
          "nba-remote": {
            ranked: { drafts: 3, wins: 2, losses: 1, ties: 0 },
          },
        },
        recordedKeys: ["local-match", "remote-match"],
        dailyBackfillDone: true,
        dailyLineups: {},
      });
      return loadNbaPlayerUsageStore();
    });

    await restorePlayerIdentityFromLogin("player-linked");

    expect(pullAndMergeNbaPlayerUsage).toHaveBeenCalledWith("player-linked");
    expect(loadNbaPlayerUsageStore().byPlayerId["nba-remote"]?.ranked?.drafts).toBe(
      3,
    );
  });

  it("restores event profiles and tier lists from cloud on login", async () => {
    const { fetchRemoteLeaderboard } = await import("./leaderboardApi");
    const { fetchRemotePlayerProfile } = await import("./playerProfileApi");
    const { pullAndMergeEventProfiles } = await import("./eventProfileRemote");
    const { pullAndMergeTierListLibrary } = await import(
      "./tierListLibraryRemote"
    );
    const { saveEventProfilesPayload } = await import("./eventProfile");
    const {
      applyTierListAccountLocally,
      normalizeTierListState,
      createDefaultTier,
    } = await import("./tierList");
    const seasonId = getCurrentSeasonId();

    vi.mocked(fetchRemoteLeaderboard).mockResolvedValue({
      mode: "ranked",
      seasonId,
      sort: "elo",
      entries: [],
    });
    vi.mocked(fetchRemotePlayerProfile).mockResolvedValue({
      playerId: "player-linked",
      legacy: null,
    });
    vi.mocked(pullAndMergeEventProfiles).mockImplementation(async () => {
      const payload = {
        byEventId: {
          "event-remote": {
            eventId: "event-remote",
            wins: 2,
            losses: 0,
            ties: 0,
            matchesPlayed: 2,
            winStreak: 2,
            lossStreak: 0,
            elo: 1032,
            badges: [],
          },
        },
      };
      saveEventProfilesPayload(payload);
      return payload;
    });
    vi.mocked(pullAndMergeTierListLibrary).mockImplementation(async () => {
      const payload = {
        current: normalizeTierListState({
          title: "Restored board",
          tiers: createDefaultTier(),
        }),
        currentUpdatedAt: 500,
        library: {
          documents: [
            {
              id: "restored-doc",
              title: "Restored saved",
              tiers: createDefaultTier(),
              savedAt: 400,
            },
          ],
        },
      };
      applyTierListAccountLocally(payload);
      return payload;
    });

    await restorePlayerIdentityFromLogin("player-linked");

    expect(pullAndMergeEventProfiles).toHaveBeenCalledWith("player-linked");
    expect(pullAndMergeTierListLibrary).toHaveBeenCalledWith("player-linked");
  });
});
