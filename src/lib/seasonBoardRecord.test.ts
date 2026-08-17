import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { persistMatchOutcome } from "./matchOutcome";
import {
  loadSelfSeasonBoardRecord,
  projectSelfSeasonBoardRecordAfterMatch,
} from "./seasonBoardRecord";

vi.mock("./careerStatsRemote", () => ({
  pushCareerStatsIfLinked: vi.fn(async () => undefined),
}));

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

describe("seasonBoardRecord", () => {
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

  it("tracks classic season win streaks separately from empty boards", () => {
    expect(loadSelfSeasonBoardRecord("classic")).toEqual({
      wins: 0,
      losses: 0,
      ties: 0,
      winStreak: 0,
      lossStreak: 0,
    });

    const projected = projectSelfSeasonBoardRecordAfterMatch("classic", "win");
    expect(projected).toEqual({
      wins: 1,
      losses: 0,
      ties: 0,
      winStreak: 1,
      lossStreak: 0,
    });

    persistMatchOutcome("win", { name: "Bulls" }, "m1", "headToHead");
    persistMatchOutcome("win", { name: "Bulls" }, "m2", "headToHead");
    persistMatchOutcome("loss", { name: "Bulls" }, "m3", "headToHead");

    expect(loadSelfSeasonBoardRecord("classic")).toEqual({
      wins: 2,
      losses: 1,
      ties: 0,
      winStreak: 0,
      lossStreak: 1,
    });
  });

  it("resets win streak and starts loss streak on a projected loss", () => {
    persistMatchOutcome("win", { name: "Bulls" }, "r1", "ranked");
    persistMatchOutcome("win", { name: "Bulls" }, "r2", "ranked");

    expect(loadSelfSeasonBoardRecord("ranked").winStreak).toBe(2);

    const projected = projectSelfSeasonBoardRecordAfterMatch("ranked", "loss");
    expect(projected.winStreak).toBe(0);
    expect(projected.lossStreak).toBe(1);
    expect(projected.wins).toBe(2);
    expect(projected.losses).toBe(1);
  });
});
