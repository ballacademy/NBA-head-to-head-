import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setPlayerIdentity } from "./playerIdentity";
import {
  countCompetitiveMatchGames,
  countDailyScoredGames,
  FRANCHISE_UNLOCK_SCORED_GAMES,
  getHubTabLockPrompt,
  getHubUnlockProgress,
  getFeatureLockPrompt,
  RANKS_UNLOCK_COMPETITIVE_GAMES,
} from "./hubUnlockProgress";
import { recordMatchResult } from "./playerRecord";
import { persistEventMatchOutcome } from "./eventProfile";

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

describe("hubUnlockProgress", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-hub-unlock",
    });
    setPlayerIdentity("player-hub-unlock");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts locked until the player completes a scored experience", () => {
    expect(getHubUnlockProgress()).toMatchObject({
      totalScoredGames: 0,
      franchiseUnlocked: false,
      ranksUnlocked: false,
      playModesExpanded: false,
    });
    expect(getHubTabLockPrompt("roster")).not.toBeNull();
    expect(getHubTabLockPrompt("standings")).not.toBeNull();
    expect(getHubTabLockPrompt("community")).toBeNull();
  });

  it("unlocks Franchise after one Daily score", () => {
    localStorageMock.setItem(
      "nba-head-to-head-daily-scores",
      JSON.stringify({
        "2099-01-01": [
          {
            playerId: "player-hub-unlock",
            goalId: "pts",
            value: 120,
            formattedResult: "120.0 PTS",
            submittedAt: "2099-01-01T12:00:00.000Z",
          },
        ],
      }),
    );

    expect(countDailyScoredGames()).toBe(1);
    expect(getHubUnlockProgress()).toMatchObject({
      totalScoredGames: 1,
      franchiseUnlocked: true,
      ranksUnlocked: false,
      playModesExpanded: true,
    });
    expect(getHubTabLockPrompt("roster")).toBeNull();
    expect(getHubTabLockPrompt("standings")).not.toBeNull();
  });

  it("unlocks Ranks after two competitive matches", () => {
    recordMatchResult("win", "headToHead");
    expect(getHubUnlockProgress().ranksUnlocked).toBe(false);

    recordMatchResult("loss", "ranked");
    expect(countCompetitiveMatchGames()).toBe(2);
    expect(getHubUnlockProgress()).toMatchObject({
      competitiveMatchGames: 2,
      ranksUnlocked: true,
    });
    expect(getHubTabLockPrompt("standings")).toBeNull();
  });

  it("counts event matches toward competitive unlock", () => {
    persistEventMatchOutcome("event-a", "win", "match-1");
    persistEventMatchOutcome("event-a", "loss", "match-2");

    expect(getHubUnlockProgress()).toMatchObject({
      competitiveMatchGames: 2,
      franchiseUnlocked: true,
      ranksUnlocked: true,
    });
  });

  it("uses the documented unlock thresholds", () => {
    expect(FRANCHISE_UNLOCK_SCORED_GAMES).toBe(1);
    expect(RANKS_UNLOCK_COMPETITIVE_GAMES).toBe(2);
  });

  it("maps Franchise and Ranks feature pages to the same locks", () => {
    expect(getFeatureLockPrompt("leaderboard")?.kind).toBe("ranks");
    expect(getFeatureLockPrompt("stats")?.kind).toBe("franchise");
    expect(getFeatureLockPrompt("achievements")?.kind).toBe("franchise");
    expect(getFeatureLockPrompt("gmStats")?.kind).toBe("franchise");
    expect(getFeatureLockPrompt("weeklyRecap")?.kind).toBe("franchise");
    expect(getFeatureLockPrompt("tierList")).toBeNull();
    expect(getFeatureLockPrompt("gameLog")).toBeNull();
    expect(getFeatureLockPrompt("beta")).toBeNull();
  });
});
