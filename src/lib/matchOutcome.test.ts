import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTopLeaderboard } from "./leaderboard";
import { persistMatchOutcome } from "./matchOutcome";
import { loadPlayerRecord } from "./playerRecord";

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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("records a match only once per match id", () => {
    const first = persistMatchOutcome("win", { name: "Bulls" }, "match-1", "headToHead");
    persistMatchOutcome("win", { name: "Bulls" }, "match-1", "headToHead");

    expect(first.record.wins).toBe(1);
    expect(loadPlayerRecord("headToHead").wins).toBe(1);
    expect(getTopLeaderboard("winStreak")[0]?.winStreak).toBe(1);
  });
});
