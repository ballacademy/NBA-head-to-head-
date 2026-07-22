import { describe, expect, it, vi } from "vitest";
import {
  fetchGhostOpponent,
  searchGhostOpponent,
  submitStoredLineup,
} from "./ghostMatchmaking";

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
        starCount: 8,
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
        starCount: 8,
      }),
    ).resolves.toEqual({
      id: "lineup-1",
      teamName: "Bulls",
      lineup: ["a", "b", "c", "d", "e"],
      elo: 1180,
      createdAt: "2026-06-26T00:00:00.000Z",
    });
  });

  it("polls for opponents until the search window ends", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 404, ok: false })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          id: "lineup-2",
          teamName: "Celtics",
          lineup: ["a", "b", "c", "d", "e"],
          elo: 1190,
          createdAt: "2026-06-26T00:00:00.000Z",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const searchPromise = searchGhostOpponent(
      {
        mode: "classic",
        playerId: "player-1",
        elo: 1200,
        starCount: 8,
      },
      { searchMs: 5000, pollIntervalMs: 1000 },
    );

    await vi.advanceTimersByTimeAsync(1000);
    const opponent = await searchPromise;

    expect(opponent).toEqual({
      id: "lineup-2",
      teamName: "Celtics",
      lineup: ["a", "b", "c", "d", "e"],
      elo: 1190,
      createdAt: "2026-06-26T00:00:00.000Z",
    });

    vi.useRealTimers();
  });

  it("rejects ghost opponents with fewer than five valid ids", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          id: "lineup-bad",
          teamName: "Incomplete",
          lineup: ["a", "b", "c", "d"],
          elo: 1180,
          createdAt: "2026-06-26T00:00:00.000Z",
        }),
      }),
    );

    await expect(
      fetchGhostOpponent({
        mode: "classic",
        playerId: "player-1",
        elo: 1200,
        starCount: 8,
      }),
    ).resolves.toBeNull();
  });

  it("submits stored lineups to the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "lineup-3",
        createdAt: "2026-06-26T00:00:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      submitStoredLineup({
        mode: "classic",
        playerId: "player-1",
        teamName: "Bulls",
        lineup: ["a", "b", "c", "d", "e"],
        elo: 1200,
        salaryTotal: 120_000_000,
        starCount: 8,
      }),
    ).resolves.toEqual({
      id: "lineup-3",
      createdAt: "2026-06-26T00:00:00.000Z",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/lineups",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not submit practice lineups to the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      submitStoredLineup({
        mode: "ranked",
        playerId: "player-1",
        teamName: "Bulls",
        lineup: ["a", "b", "c", "d", "e"],
        elo: 1200,
        practiceMode: true,
        salaryTotal: 90_000_000,
        starCount: 8,
      }),
    ).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
