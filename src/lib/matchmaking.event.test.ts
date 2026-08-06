import { describe, expect, it, vi } from "vitest";
import { planEventLiveMatchmaking } from "./matchmaking";

vi.mock("./liveMatchmaking", () => ({
  searchLiveOpponent: vi.fn(async (_params, options) => {
    if (options?.isCancelled?.()) {
      return null;
    }

    return {
      matchId: "match-1",
      teamName: "Live Event GM",
      elo: 1100,
      playerId: "opponent-1",
    };
  }),
  searchLiveOpponentDetailed: vi.fn(async (_params, options) => {
    if (options?.isCancelled?.()) {
      return { status: "cancelled" };
    }

    return {
      status: "matched",
      opponent: {
        matchId: "match-1",
        teamName: "Live Event GM",
        elo: 1100,
        playerId: "opponent-1",
      },
    };
  }),
}));

describe("planEventLiveMatchmaking", () => {
  it("returns a live opponent and never falls back to NPC/ghost", async () => {
    const resolution = await planEventLiveMatchmaking({
      playerId: "player-1",
      playerElo: 1000,
      teamName: "Event GM",
    });

    expect(resolution.ok).toBe(true);
    if (!resolution.ok) {
      return;
    }

    expect(resolution.plan.kind).toBe("live");
    expect(resolution.plan.live.teamName).toBe("Live Event GM");
  });

  it("stops after repeated live search unavailability", async () => {
    const { searchLiveOpponentDetailed } = await import("./liveMatchmaking");
    vi.mocked(searchLiveOpponentDetailed).mockResolvedValue({
      status: "unavailable",
    });

    const resolution = await planEventLiveMatchmaking({
      playerId: "player-1",
      playerElo: 1000,
      teamName: "Event GM",
    });

    expect(resolution).toEqual({
      ok: false,
      error: "matchmaking_unavailable",
    });
  });
});
