import { describe, expect, it, vi } from "vitest";
import { planHeadToHeadMatchmaking } from "./matchmaking";
import { LIVE_OPPONENT_ONLY_MIN_ELO, requiresLiveOpponentOnly } from "./rankedElo";

vi.mock("./ghostMatchmaking", () => ({
  fetchGhostOpponent: vi.fn(),
  fetchPendingMatchmakingStatus: vi.fn(),
}));

vi.mock("./liveMatchmaking", () => ({
  searchLiveOpponent: vi.fn(),
}));

vi.mock("./pendingLineup", () => ({
  loadPendingLineupState: vi.fn(() => null),
  savePendingLineupState: vi.fn(),
  clearPendingLineupState: vi.fn(),
}));

import { fetchGhostOpponent, fetchPendingMatchmakingStatus } from "./ghostMatchmaking";
import { searchLiveOpponent } from "./liveMatchmaking";

describe("matchmaking", () => {
  it("requires live opponents at 1500+ banners", () => {
    expect(requiresLiveOpponentOnly(LIVE_OPPONENT_ONLY_MIN_ELO - 1)).toBe(false);
    expect(requiresLiveOpponentOnly(LIVE_OPPONENT_ONLY_MIN_ELO)).toBe(true);
  });

  it("pairs with a live opponent when another player is searching", async () => {
    vi.mocked(fetchPendingMatchmakingStatus).mockResolvedValue({
      queuedLineup: null,
      pendingResult: null,
    });
    vi.mocked(searchLiveOpponent).mockResolvedValue({
      matchId: "match-1",
      teamName: "Bulls",
      elo: 1180,
      playerId: "player-2",
    });
    vi.mocked(fetchGhostOpponent).mockResolvedValue(null);

    await expect(
      planHeadToHeadMatchmaking({
        mode: "classic",
        playerId: "player-1",
        playerElo: 1200,
        teamName: "Lakers",
      }),
    ).resolves.toEqual({
      ok: true,
      plan: {
        kind: "live",
        live: {
          matchId: "match-1",
          teamName: "Bulls",
          elo: 1180,
          playerId: "player-2",
        },
      },
    });
  });

  it("falls back to stored lineups instantly when no live opponent is found", async () => {
    vi.mocked(fetchPendingMatchmakingStatus).mockResolvedValue({
      queuedLineup: null,
      pendingResult: null,
    });
    vi.mocked(searchLiveOpponent).mockResolvedValue(null);
    vi.mocked(fetchGhostOpponent).mockResolvedValue({
      id: "lineup-1",
      teamName: "Celtics",
      lineup: ["a", "b", "c", "d", "e"],
      elo: 1210,
      createdAt: "2026-06-26T00:00:00.000Z",
    });

    await expect(
      planHeadToHeadMatchmaking({
        mode: "classic",
        playerId: "player-1",
        playerElo: 1200,
        teamName: "Lakers",
      }),
    ).resolves.toEqual({
      ok: true,
      plan: {
        kind: "ghost",
        ghost: {
          id: "lineup-1",
          teamName: "Celtics",
          lineup: ["a", "b", "c", "d", "e"],
          elo: 1210,
          createdAt: "2026-06-26T00:00:00.000Z",
        },
      },
    });
  });

  it("falls back to npc opponents below 1500 banners", async () => {
    vi.mocked(fetchPendingMatchmakingStatus).mockResolvedValue({
      queuedLineup: null,
      pendingResult: null,
    });
    vi.mocked(searchLiveOpponent).mockResolvedValue(null);
    vi.mocked(fetchGhostOpponent).mockResolvedValue(null);

    await expect(
      planHeadToHeadMatchmaking({
        mode: "classic",
        playerId: "player-1",
        playerElo: 1200,
        teamName: "Lakers",
      }),
    ).resolves.toEqual({ ok: true, plan: { kind: "npc" } });
  });

  it("queues live-only players when no ghost is found", async () => {
    vi.mocked(fetchPendingMatchmakingStatus).mockResolvedValue({
      queuedLineup: null,
      pendingResult: null,
    });
    vi.mocked(searchLiveOpponent).mockResolvedValue(null);
    vi.mocked(fetchGhostOpponent).mockResolvedValue(null);

    await expect(
      planHeadToHeadMatchmaking({
        mode: "ranked",
        playerId: "player-1",
        playerElo: 1600,
        teamName: "Lakers",
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
        teamName: "Lakers",
      }),
    ).resolves.toEqual({ ok: false, error: "pending_lineup_locked" });
  });
});
