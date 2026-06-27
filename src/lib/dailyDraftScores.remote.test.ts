import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearDailyDraftRemoteCacheForTests,
  getDailyDraftPercentile,
  refreshDailyDraftScoresFromApi,
  submitDailyDraftScore,
} from "./dailyDraftScores";
import { DAILY_DRAFT_GOALS } from "./dailyDraftGoals";

const stubPlayerStorage = (playerId = "player-test-1") => {
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

describe("dailyDraftScores remote integration", () => {
  afterEach(() => {
    clearDailyDraftRemoteCacheForTests();
    vi.unstubAllGlobals();
  });

  it("uses remote submission values when the API cache is populated", async () => {
    stubPlayerStorage();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          dateKey: "2099-01-01",
          goalId: DAILY_DRAFT_GOALS[0]!.id,
          values: [10, 20, 30],
          totalDrafters: 4,
          entry: null,
        }),
      }),
    );

    const goal = DAILY_DRAFT_GOALS[0]!;
    await refreshDailyDraftScoresFromApi("2099-01-01", goal.id);

    const result = getDailyDraftPercentile("2099-01-01", 40, goal, [5], "player-test-1");

    expect(result.sampleSize).toBe(5);
    expect(result.totalDrafters).toBe(4);
    expect(result.percentile).toBe(90);
  });

  it("submits to the API and refreshes the remote cache", async () => {
    stubPlayerStorage();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ entry: {} }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          dateKey: "2099-01-02",
          goalId: DAILY_DRAFT_GOALS[0]!.id,
          values: [15, 25],
          totalDrafters: 3,
          entry: {
            playerId: "player-test-1",
            goalId: DAILY_DRAFT_GOALS[0]!.id,
            value: 40,
            formattedResult: "40.0",
            lineup: ["a", "b", "c", "d", "e"],
            teamName: "Test Team",
            submittedAt: "2026-06-26T00:00:00.000Z",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const goal = DAILY_DRAFT_GOALS[0]!;
    const result = await submitDailyDraftScore(
      "2099-01-02",
      goal,
      40,
      "40.0",
      [10, 20, 30],
      ["a", "b", "c", "d", "e"],
      "Test Team",
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.totalDrafters).toBe(3);
    expect(result.sampleSize).toBe(6);
  });
});
