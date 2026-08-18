import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearDailyDraftRemoteCacheForTests,
  findPlayerDailyDraftEntry,
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
    expect(result.adoptedExisting).toBe(false);
    expect(result.entry.value).toBe(40);
  });

  it("passes mode when refreshing remote daily scores", async () => {
    stubPlayerStorage();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        dateKey: "2099-01-03",
        goalId: "adv-example",
        values: [],
        totalDrafters: 1,
        entry: null,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await refreshDailyDraftScoresFromApi(
      "2099-01-03",
      "adv-example",
      "player-test-1",
      "advanced",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0] ?? "");
    expect(url).toContain("mode=advanced");
    expect(url).toContain("goalId=adv-example");
  });

  it("adopts the first attempt when the API returns 409", async () => {
    const storage = stubPlayerStorage();
    const goal = DAILY_DRAFT_GOALS[0]!;
    const firstEntry = {
      playerId: "player-test-1",
      goalId: goal.id,
      mode: "basic",
      value: 55,
      formattedResult: "55.0",
      lineup: ["p1", "p2", "p3", "p4", "p5"],
      teamName: "First Team",
      submittedAt: "2026-06-26T00:00:00.000Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ entry: firstEntry }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          dateKey: "2099-01-04",
          goalId: goal.id,
          values: [10, 20],
          totalDrafters: 2,
          entry: firstEntry,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitDailyDraftScore(
      "2099-01-04",
      goal,
      12,
      "12.0",
      [10, 20, 30],
      ["a", "b", "c", "d", "e"],
      "Second Team",
    );

    expect(result.adoptedExisting).toBe(true);
    expect(result.entry.value).toBe(55);
    expect(result.entry.lineup).toEqual(["p1", "p2", "p3", "p4", "p5"]);

    const saved = JSON.parse(
      storage.get("nba-head-to-head-daily-scores") ?? "{}",
    )["2099-01-04"][0];
    expect(saved.value).toBe(55);
    expect(saved.lineup).toEqual(["p1", "p2", "p3", "p4", "p5"]);
  });

  it("keeps a stored percentile when the API entry has none", async () => {
    const storage = stubPlayerStorage();
    const goal = DAILY_DRAFT_GOALS[0]!;
    storage.set(
      "nba-head-to-head-daily-scores",
      JSON.stringify({
        "2099-01-05": [
          {
            playerId: "player-test-1",
            goalId: goal.id,
            mode: "basic",
            value: 40,
            formattedResult: "40.0",
            percentile: 81,
            lineup: ["a", "b", "c", "d", "e"],
            teamName: "Test Team",
            submittedAt: "2026-06-26T00:00:00.000Z",
          },
        ],
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          dateKey: "2099-01-05",
          goalId: goal.id,
          values: [10, 20, 30],
          totalDrafters: 4,
          entry: {
            playerId: "player-test-1",
            goalId: goal.id,
            value: 40,
            formattedResult: "40.0",
            lineup: ["a", "b", "c", "d", "e"],
            teamName: "Test Team",
            submittedAt: "2026-06-26T00:00:00.000Z",
          },
        }),
      }),
    );

    await refreshDailyDraftScoresFromApi("2099-01-05", goal.id);
    const entry = findPlayerDailyDraftEntry(
      "2099-01-05",
      "player-test-1",
      "basic",
    );

    expect(entry?.percentile).toBe(81);
  });
});
