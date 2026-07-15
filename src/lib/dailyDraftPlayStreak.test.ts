import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatDailyDraftPlayStreak,
  getDailyDraftPlayStreak,
} from "./dailyDraftPlayStreak";

const stubStorage = (playerId = "player-streak-1") => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    clear: () => {
      storage.clear();
    },
  });
  storage.set(
    "nba-head-to-head-player-identity",
    JSON.stringify({ playerId }),
  );
  return storage;
};

describe("dailyDraftPlayStreak", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("counts consecutive days played for a mode", () => {
    const storage = stubStorage();
    storage.set(
      "nba-head-to-head-daily-scores",
      JSON.stringify({
        "2099-01-01": [
          {
            playerId: "player-streak-1",
            goalId: "ppg",
            mode: "basic",
            value: 1,
            formattedResult: "1",
            lineup: ["a", "b", "c", "d", "e"],
            submittedAt: "2099-01-01T12:00:00.000Z",
          },
        ],
        "2099-01-02": [
          {
            playerId: "player-streak-1",
            goalId: "ppg",
            mode: "basic",
            value: 1,
            formattedResult: "1",
            lineup: ["a", "b", "c", "d", "e"],
            submittedAt: "2099-01-02T12:00:00.000Z",
          },
        ],
        "2099-01-03": [
          {
            playerId: "player-streak-1",
            goalId: "ppg",
            mode: "basic",
            value: 1,
            formattedResult: "1",
            lineup: ["a", "b", "c", "d", "e"],
            submittedAt: "2099-01-03T12:00:00.000Z",
          },
        ],
      }),
    );

    expect(getDailyDraftPlayStreak("basic", "2099-01-03").current).toBe(3);
    expect(formatDailyDraftPlayStreak(getDailyDraftPlayStreak("basic", "2099-01-03"))).toBe(
      "3-day streak",
    );
  });

  it("keeps an active streak when today is not played yet but yesterday was", () => {
    const storage = stubStorage();
    storage.set(
      "nba-head-to-head-daily-scores",
      JSON.stringify({
        "2099-02-01": [
          {
            playerId: "player-streak-1",
            goalId: "ppg",
            mode: "basic",
            value: 1,
            formattedResult: "1",
            lineup: ["a", "b", "c", "d", "e"],
            submittedAt: "2099-02-01T12:00:00.000Z",
          },
        ],
        "2099-02-02": [
          {
            playerId: "player-streak-1",
            goalId: "ppg",
            mode: "basic",
            value: 1,
            formattedResult: "1",
            lineup: ["a", "b", "c", "d", "e"],
            submittedAt: "2099-02-02T12:00:00.000Z",
          },
        ],
      }),
    );

    const streak = getDailyDraftPlayStreak("basic", "2099-02-03");
    expect(streak.current).toBe(2);
    expect(streak.active).toBe(true);
  });

  it("breaks the streak after a missed day", () => {
    const storage = stubStorage();
    storage.set(
      "nba-head-to-head-daily-scores",
      JSON.stringify({
        "2099-03-01": [
          {
            playerId: "player-streak-1",
            goalId: "ppg",
            mode: "basic",
            value: 1,
            formattedResult: "1",
            lineup: ["a", "b", "c", "d", "e"],
            submittedAt: "2099-03-01T12:00:00.000Z",
          },
        ],
      }),
    );

    const streak = getDailyDraftPlayStreak("basic", "2099-03-03");
    expect(streak.current).toBe(0);
    expect(streak.active).toBe(false);
    expect(formatDailyDraftPlayStreak(streak)).toBe("No streak");
  });

  it("tracks basic and advanced streaks separately", () => {
    const storage = stubStorage();
    storage.set(
      "nba-head-to-head-daily-scores",
      JSON.stringify({
        "2099-04-01": [
          {
            playerId: "player-streak-1",
            goalId: "ppg",
            mode: "basic",
            value: 1,
            formattedResult: "1",
            lineup: ["a", "b", "c", "d", "e"],
            submittedAt: "2099-04-01T12:00:00.000Z",
          },
          {
            playerId: "player-streak-1",
            goalId: "adv-ast-tov",
            mode: "advanced",
            value: 2,
            formattedResult: "2",
            lineup: ["a", "b", "c", "d", "e"],
            submittedAt: "2099-04-01T12:00:00.000Z",
          },
        ],
        "2099-04-02": [
          {
            playerId: "player-streak-1",
            goalId: "adv-ast-tov",
            mode: "advanced",
            value: 2,
            formattedResult: "2",
            lineup: ["a", "b", "c", "d", "e"],
            submittedAt: "2099-04-02T12:00:00.000Z",
          },
        ],
      }),
    );

    expect(getDailyDraftPlayStreak("basic", "2099-04-02").current).toBe(1);
    expect(getDailyDraftPlayStreak("advanced", "2099-04-02").current).toBe(2);
  });
});
