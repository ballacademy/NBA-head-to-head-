import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTopLeaderboard } from "./leaderboard";
import {
  persistMatchOutcome,
  projectRecordAfterMatch,
  resolveRecordForMatchDisplay,
} from "./matchOutcome";
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

  it("does not double-count streaks when display resolves after persist", () => {
    recordMatchResult("win", "headToHead");
    recordMatchResult("win", "headToHead");

    const before = loadPlayerRecord("headToHead");
    expect(before.winStreak).toBe(2);

    persistMatchOutcome("win", { name: "Bulls" }, "match-streak-1", "headToHead");

    const projectedTwice = projectRecordAfterMatch(
      "win",
      "headToHead",
      loadPlayerRecord("headToHead"),
    );
    expect(projectedTwice.winStreak).toBe(4);

    const displayed = resolveRecordForMatchDisplay(
      "win",
      "match-streak-1",
      "headToHead",
    );
    expect(displayed.winStreak).toBe(3);
    expect(displayed.wins).toBe(3);
    expect(loadPlayerRecord("headToHead").winStreak).toBe(3);
  });

  it("projects streaks only before the match id is recorded", () => {
    recordMatchResult("loss", "ranked");
    const projected = resolveRecordForMatchDisplay(
      "loss",
      "match-not-yet",
      "ranked",
    );
    expect(projected.lossStreak).toBe(2);
    expect(loadPlayerRecord("ranked").lossStreak).toBe(1);
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

  it("updates banners without changing streaks for stored-lineup results", () => {
    persistMatchOutcome("win", { name: "Bulls" }, "live-1", "headToHead");
    persistMatchOutcome("win", { name: "Bulls" }, "live-2", "headToHead");

    const before = loadPlayerRecord("headToHead");
    expect(before.winStreak).toBe(2);

    const ghost = persistMatchOutcome(
      "loss",
      { name: "Bulls" },
      "owner-result-1",
      "headToHead",
      { countTowardStreak: false },
    );

    const after = loadPlayerRecord("headToHead");
    expect(after.wins).toBe(2);
    expect(after.losses).toBe(1);
    expect(after.winStreak).toBe(2);
    expect(after.lossStreak).toBe(0);
    expect(ghost.classic?.delta).toBeLessThan(0);
    expect(ghost.classic?.wins).toBe(2);
    expect(ghost.classic?.losses).toBe(1);
    expect(ghost.classic?.winStreak).toBe(2);
    expect(ghost.classic?.lossStreak).toBe(0);
  });
});
