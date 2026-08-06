import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTopLeaderboard } from "./leaderboard";
import { persistMatchOutcome } from "./matchOutcome";
import { loadPlayerRecord, recordMatchResult } from "./playerRecord";

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  clear: () => {
    storage.clear();
  },
};

describe("matchOutcome", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-test-1",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ linked: false }), { status: 200 }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("records a match only once per match id", () => {
    const first = persistMatchOutcome("win", { name: "Bulls" }, "match-1", "headToHead");
    persistMatchOutcome("win", { name: "Bulls" }, "match-1", "headToHead");

    expect(first.record.wins).toBe(1);
    expect(first.classic?.elo).toBeGreaterThan(500);
    expect(first.classic?.leaderboardRank).toBeNull();
    expect(loadPlayerRecord("headToHead").wins).toBe(1);
    expect(getTopLeaderboard("elo")[0]?.elo).toBe(first.classic?.elo);
  });

  it("keeps monthly leaderboard W-L season-scoped when career record is larger", () => {
    for (let index = 0; index < 8; index += 1) {
      recordMatchResult("win", "headToHead");
    }

    expect(loadPlayerRecord("headToHead").wins).toBe(8);

    persistMatchOutcome("win", { name: "Bulls" }, "match-season-1", "headToHead");

    const entry = getTopLeaderboard("elo").find(
      (candidate) => candidate.playerId === "player-test-1",
    );

    expect(loadPlayerRecord("headToHead").wins).toBe(9);
    expect(entry?.wins).toBe(1);
    expect(entry?.losses).toBe(0);
    expect(entry?.winStreak).toBe(1);
  });
});
