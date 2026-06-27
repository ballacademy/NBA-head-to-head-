import { describe, expect, it, vi } from "vitest";
import { planHeadToHeadMatchmaking } from "./matchmaking";
import { LIVE_OPPONENT_ONLY_MIN_ELO, requiresLiveOpponentOnly } from "./rankedElo";

vi.mock("./ghostMatchmaking", () => ({
  searchGhostOpponent: vi.fn(),
  fetchPendingMatchmakingStatus: vi.fn(),
}));

vi.mock("./pendingLineup", () => ({
  loadPendingLineupState: vi.fn(() => null),
  savePendingLineupState: vi.fn(),
  clearPendingLineupState: vi.fn(),
}));

import { searchGhostOpponent, fetchPendingMatchmakingStatus } from "./ghostMatchmaking";

describe("matchmaking", () => {
  it("requires live opponents at 1500+ banners", () => {
    expect(requiresLiveOpponentOnly(LIVE_OPPONENT_ONLY_MIN_ELO - 1)).toBe(false);
    expect(requiresLiveOpponentOnly(LIVE_OPPONENT_ONLY_MIN_ELO)).toBe(true);
  });

  it("falls back to npc opponents below 1500 banners", async () => {
    vi.mocked(fetchPendingMatchmakingStatus).mockResolvedValue({
      queuedLineup: null,
      pendingResult: null,
    });
    vi.mocked(searchGhostOpponent).mockResolvedValue(null);

    await expect(
      planHeadToHeadMatchmaking({
        mode: "classic",
        playerId: "player-1",
        playerElo: 1200,
      }),
    ).resolves.toEqual({ ok: true, plan: { kind: "npc" } });
  });

  it("queues live-only players when no ghost is found", async () => {
    vi.mocked(fetchPendingMatchmakingStatus).mockResolvedValue({
      queuedLineup: null,
      pendingResult: null,
    });
    vi.mocked(searchGhostOpponent).mockResolvedValue(null);

    await expect(
      planHeadToHeadMatchmaking({
        mode: "ranked",
        playerId: "player-1",
        playerElo: 1600,
      }),
    ).resolves.toEqual({ ok: true, plan: { kind: "queue_for_live" } });
  });

  it("blocks live-only players with a queued lineup", async () => {
    vi.mocked(fetchPendingMatchmakingStatus).mockResolvedValue({
      queuedLineup: { id: "lineup-1", createdAt: "2026-06-26T00:00:00.000Z" },
      pendingResult: null,
    });

    await expect(
      planHeadToHeadMatchmaking({
        mode: "ranked",
        playerId: "player-1",
        playerElo: 1600,
      }),
    ).resolves.toEqual({ ok: false, error: "pending_lineup_locked" });
  });
});
