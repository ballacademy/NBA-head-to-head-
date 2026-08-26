import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  QUEUED_OWNER_DETAIL_COPY,
  QUEUED_OWNER_INBOX_COPY,
  fetchDeliverableOwnerResult,
  fetchDeliverableOwnerResults,
  finalizeDeliveredOwnerResult,
  finalizeDeliveredOwnerResults,
} from "./pendingOwnerResults";

vi.mock("./ghostMatchmaking", () => ({
  fetchPendingMatchmakingStatus: vi.fn(),
  acknowledgePendingOwnerResult: vi.fn(),
  acknowledgePendingOwnerResults: vi.fn(),
}));

vi.mock("./pendingLineup", () => ({
  clearPendingLineupState: vi.fn(),
}));

vi.mock("./leaderboardRemote", () => ({
  confirmRemoteLeaderboardRank: vi.fn().mockResolvedValue({
    ok: false,
    reason: "not-linked",
  }),
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

vi.mock("./nbaPlayerUsage", () => ({
  recordNbaPlayerMatchUsage: vi.fn(() => true),
}));

import {
  acknowledgePendingOwnerResults,
  fetchPendingMatchmakingStatus,
} from "./ghostMatchmaking";
import { clearPendingLineupState } from "./pendingLineup";
import { persistMatchOutcome } from "./matchOutcome";
import { recordNbaPlayerMatchUsage } from "./nbaPlayerUsage";

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

const sampleResult = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  lineupId: `lineup-${id}`,
  mode: "classic" as const,
  ownerResult: "win" as const,
  opponentTeamName: "Challengers",
  opponentElo: 1000,
  ownerLineup: ["a", "b", "c", "d", "e"],
  ownerScore: 101.4,
  opponentScore: 98.2,
  createdAt: "2026-08-01T00:00:00.000Z",
  ...overrides,
});

describe("pendingOwnerResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    stubStorage();
  });

  it("applies unacked owner results with the result id as matchId", async () => {
    vi.mocked(fetchPendingMatchmakingStatus).mockResolvedValue({
      queuedLineup: null,
      pendingResults: [sampleResult("result-1")],
      pendingResult: sampleResult("result-1"),
    });

    const delivery = await fetchDeliverableOwnerResult("classic", "player-1");

    expect(delivery?.result.id).toBe("result-1");
    expect(persistMatchOutcome).toHaveBeenCalledWith(
      "win",
      { name: "Test Team" },
      "result-1",
      "headToHead",
      { opponentElo: 1000, countTowardStreak: false },
    );
    expect(recordNbaPlayerMatchUsage).toHaveBeenCalledWith({
      recordKey: "result-1",
      playerIds: ["a", "b", "c", "d", "e"],
      mode: "headToHead",
      result: "win",
    });
  });

  it("delivers every pending result in order", async () => {
    vi.mocked(fetchPendingMatchmakingStatus).mockResolvedValue({
      queuedLineup: null,
      pendingResults: [
        sampleResult("result-1"),
        sampleResult("result-2", {
          ownerResult: "loss",
          opponentTeamName: "Visitors",
          ownerScore: 90,
          opponentScore: 95,
        }),
      ],
      pendingResult: sampleResult("result-1"),
    });

    const deliveries = await fetchDeliverableOwnerResults("classic", "player-1");

    expect(deliveries.ok).toBe(true);
    expect(deliveries.deliveries.map((delivery) => delivery.result.id)).toEqual([
      "result-1",
      "result-2",
    ]);
    expect(persistMatchOutcome).toHaveBeenCalledTimes(2);
  });

  it("returns ok:false when pending status cannot be fetched", async () => {
    vi.mocked(fetchPendingMatchmakingStatus).mockResolvedValue(null);

    const result = await fetchDeliverableOwnerResults("classic", "player-1");
    expect(result).toEqual({ ok: false, deliveries: [] });
    expect(persistMatchOutcome).not.toHaveBeenCalled();
  });

  it("acks and clears local pending lineup state on finalize", async () => {
    vi.mocked(acknowledgePendingOwnerResults).mockResolvedValue(true);

    await expect(
      finalizeDeliveredOwnerResult(
        {
          mode: "ranked",
          result: sampleResult("result-2", {
            mode: "ranked",
            ownerResult: "loss",
            opponentTeamName: "Visitors",
            opponentElo: 1200,
            ownerScore: 90,
            opponentScore: 95,
          }),
        },
        "player-1",
      ),
    ).resolves.toBe(true);

    expect(clearPendingLineupState).toHaveBeenCalledWith("ranked", "player-1");
    expect(acknowledgePendingOwnerResults).toHaveBeenCalledWith({
      resultIds: ["result-2"],
      playerId: "player-1",
    });
  });

  it("keeps pending lineup state when ack fails after retries", async () => {
    vi.useFakeTimers();
    vi.mocked(acknowledgePendingOwnerResults).mockResolvedValue(false);

    const pending = finalizeDeliveredOwnerResult(
      {
        mode: "classic",
        result: sampleResult("result-3"),
      },
      "player-1",
    );
    const resultPromise = pending.then((value) => value);
    await vi.runAllTimersAsync();
    await expect(resultPromise).resolves.toBe(false);

    expect(clearPendingLineupState).not.toHaveBeenCalled();
    expect(vi.mocked(acknowledgePendingOwnerResults).mock.calls.length).toBeGreaterThan(1);
    vi.useRealTimers();
  });

  it("batch-acks every delivered result id on finalize", async () => {
    vi.mocked(acknowledgePendingOwnerResults).mockResolvedValue(true);

    await expect(
      finalizeDeliveredOwnerResults(
        [
          {
            mode: "classic",
            result: sampleResult("result-1"),
          },
          {
            mode: "ranked",
            result: sampleResult("result-2", { mode: "ranked" }),
          },
        ],
        "player-1",
      ),
    ).resolves.toBe(true);

    expect(clearPendingLineupState).toHaveBeenCalledWith("classic", "player-1");
    expect(clearPendingLineupState).toHaveBeenCalledWith("ranked", "player-1");
    expect(acknowledgePendingOwnerResults).toHaveBeenCalledWith({
      resultIds: ["result-1", "result-2"],
      playerId: "player-1",
    });
  });

  it("tells owners that queued results already moved Banners and month W–L, not streaks", () => {
    expect(QUEUED_OWNER_INBOX_COPY).toContain("already updated");
    expect(QUEUED_OWNER_INBOX_COPY).toContain("Banners");
    expect(QUEUED_OWNER_INBOX_COPY).toContain("this month's W–L");
    expect(QUEUED_OWNER_INBOX_COPY).toContain("Win/loss streaks");
    expect(QUEUED_OWNER_DETAIL_COPY).toContain("already updated");
    expect(QUEUED_OWNER_DETAIL_COPY).toContain("did not");
  });
});
