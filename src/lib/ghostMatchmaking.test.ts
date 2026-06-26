import { describe, expect, it, vi } from "vitest";
import { fetchGhostOpponent, submitStoredLineup } from "./ghostMatchmaking";

describe("ghostMatchmaking", () => {
  it("returns null when no opponent is available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
      }),
    );

    await expect(
      fetchGhostOpponent({
        mode: "classic",
        playerId: "player-1",
        elo: 1200,
      }),
    ).resolves.toBeNull();
  });

  it("parses a ghost opponent payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          id: "lineup-1",
          teamName: "Bulls",
          lineup: ["a", "b", "c", "d", "e"],
          elo: 1180,
          createdAt: "2026-06-26T00:00:00.000Z",
        }),
      }),
    );

    await expect(
      fetchGhostOpponent({
        mode: "ranked",
        playerId: "player-1",
        elo: 1200,
      }),
    ).resolves.toEqual({
      id: "lineup-1",
      teamName: "Bulls",
      lineup: ["a", "b", "c", "d", "e"],
      elo: 1180,
      createdAt: "2026-06-26T00:00:00.000Z",
    });
  });

  it("submits stored lineups to the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      submitStoredLineup({
        mode: "classic",
        playerId: "player-1",
        teamName: "Bulls",
        lineup: ["a", "b", "c", "d", "e"],
        elo: 1200,
      }),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/lineups",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
