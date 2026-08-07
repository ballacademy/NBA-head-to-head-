import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  fetchDeliverableOwnerResult,
  finalizeDeliveredOwnerResult,
} from "./pendingOwnerResults";

vi.mock("./ghostMatchmaking", () => ({
  fetchPendingMatchmakingStatus: vi.fn(),
  acknowledgePendingOwnerResult: vi.fn(),
}));

vi.mock("./pendingLineup", () => ({
  clearPendingLineupState: vi.fn(),
}));

vi.mock("./leaderboardRemote", () => ({
  confirmRemoteLeaderboardRank: vi.fn().mockResolvedValue(null),
}));

vi.mock("./teamProfile", () => ({
  loadTeamProfile: vi.fn(() => ({ name: "Test Team" })),
}));

vi.mock("./matchOutcome", async () => {
  const actual = await vi.importActual<typeof import("./matchOutcome")>(
    "./matchOutcome",
  );
  return {
    ...actual,
    persistMatchOutcome: vi.fn(() => ({
      record: {
        playerId: "player-1",
        wins: 1,
        losses: 0,
        ties: 0,
        winStreak: 1,
        lossStreak: 0,
      },
      classic: {
        delta: 12,
        elo: 1012,
        tierLabel: "Starter",
        opponentElo: 1000,
        wins: 1,
        losses: 0,
        winStreak: 1,
        lossStreak: 0,
        leaderboardRank: null,
      },
    })),
  };
});

import {
  acknowledgePendingOwnerResult,
  fetchPendingMatchmakingStatus,
} from "./ghostMatchmaking";
import { clearPendingLineupState } from "./pendingLineup";
import { persistMatchOutcome } from "./matchOutcome";

const stubStorage = () => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
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
  });
};

describe("pendingOwnerResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubStorage();
  });

  it("applies unacked owner results with the result id as matchId", async () => {
    vi.mocked(fetchPendingMatchmakingStatus).mockResolvedValue({
      queuedLineup: null,
      pendingResult: {
        id: "result-1",
        lineupId: "lineup-1",
        mode: "classic",
        ownerResult: "win",
        opponentTeamName: "Challengers",
        opponentElo: 1000,
        ownerLineup: ["a", "b", "c", "d", "e"],
        ownerScore: 101.4,
        opponentScore: 98.2,
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    });

    const delivery = await fetchDeliverableOwnerResult("classic", "player-1");

    expect(delivery?.result.id).toBe("result-1");
    expect(persistMatchOutcome).toHaveBeenCalledWith(
      "win",
      { name: "Test Team" },
      "result-1",
      "headToHead",
      { opponentElo: 1000 },
    );
  });

  it("acks and clears local pending lineup state on finalize", async () => {
    vi.mocked(acknowledgePendingOwnerResult).mockResolvedValue(true);

    await finalizeDeliveredOwnerResult(
      {
        mode: "ranked",
        result: {
          id: "result-2",
          lineupId: "lineup-2",
          mode: "ranked",
          ownerResult: "loss",
          opponentTeamName: "Visitors",
          opponentElo: 1200,
          ownerLineup: ["a", "b", "c", "d", "e"],
          ownerScore: 90,
          opponentScore: 95,
          createdAt: "2026-08-01T00:00:00.000Z",
        },
      },
      "player-1",
    );

    expect(clearPendingLineupState).toHaveBeenCalledWith("ranked", "player-1");
    expect(acknowledgePendingOwnerResult).toHaveBeenCalledWith("result-2");
  });
});
