import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushLocalDailyDraftScoresToRemote } from "./dailyDraftScores";

vi.mock("./dailyDraftApi", () => ({
  fetchRemoteDailyDraftScores: vi.fn(),
  submitRemoteDailyDraftScore: vi.fn(),
}));

describe("flushLocalDailyDraftScoresToRemote", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
  });

  it("returns ok when there are no local scores", async () => {
    await expect(
      flushLocalDailyDraftScoresToRemote("player-1"),
    ).resolves.toEqual({ ok: true, submitted: 0 });
  });

  it("submits each local score for the player", async () => {
    const { submitRemoteDailyDraftScore } = await import("./dailyDraftApi");
    vi.mocked(submitRemoteDailyDraftScore).mockResolvedValue({
      playerId: "player-1",
      goalId: "pts",
      value: 100,
      formattedResult: "100.0 PTS",
      submittedAt: "2099-01-01T12:00:00.000Z",
    });

    storage.set(
      "nba-head-to-head-daily-scores",
      JSON.stringify({
        "2099-01-01": [
          {
            playerId: "player-1",
            goalId: "pts",
            mode: "basic",
            value: 100,
            formattedResult: "100.0 PTS",
            lineup: ["a", "b", "c", "d", "e"],
            teamName: "Test",
            submittedAt: "2099-01-01T12:00:00.000Z",
          },
          {
            playerId: "other",
            goalId: "pts",
            mode: "basic",
            value: 90,
            formattedResult: "90.0 PTS",
            submittedAt: "2099-01-01T12:00:00.000Z",
          },
        ],
      }),
    );

    await expect(
      flushLocalDailyDraftScoresToRemote("player-1"),
    ).resolves.toEqual({ ok: true, submitted: 1 });
    expect(submitRemoteDailyDraftScore).toHaveBeenCalledTimes(1);
  });

  it("reports failure when submit returns null", async () => {
    vi.useFakeTimers();
    const { submitRemoteDailyDraftScore } = await import("./dailyDraftApi");
    vi.mocked(submitRemoteDailyDraftScore).mockResolvedValue(null);

    storage.set(
      "nba-head-to-head-daily-scores",
      JSON.stringify({
        "2099-01-01": [
          {
            playerId: "player-1",
            goalId: "pts",
            mode: "basic",
            value: 100,
            formattedResult: "100.0 PTS",
            submittedAt: "2099-01-01T12:00:00.000Z",
          },
        ],
      }),
    );

    const pending = flushLocalDailyDraftScoresToRemote("player-1");
    const resultPromise = pending.then((value) => value);
    await vi.runAllTimersAsync();
    await expect(resultPromise).resolves.toEqual({
      ok: false,
      submitted: 0,
      failed: 1,
    });
    expect(submitRemoteDailyDraftScore.mock.calls.length).toBeGreaterThan(1);
    vi.useRealTimers();
  });

  it("retries a flaky submit before succeeding", async () => {
    vi.useFakeTimers();
    const { submitRemoteDailyDraftScore } = await import("./dailyDraftApi");
    vi.mocked(submitRemoteDailyDraftScore).mockReset();
    let attempts = 0;
    vi.mocked(submitRemoteDailyDraftScore).mockImplementation(async () => {
      attempts += 1;
      if (attempts < 2) {
        return null;
      }
      return {
        playerId: "player-1",
        goalId: "pts",
        value: 100,
        formattedResult: "100.0 PTS",
        submittedAt: "2099-01-01T12:00:00.000Z",
      };
    });

    storage.set(
      "nba-head-to-head-daily-scores",
      JSON.stringify({
        "2099-01-01": [
          {
            playerId: "player-1",
            goalId: "pts",
            mode: "basic",
            value: 100,
            formattedResult: "100.0 PTS",
            submittedAt: "2099-01-01T12:00:00.000Z",
          },
        ],
      }),
    );

    const pending = flushLocalDailyDraftScoresToRemote("player-1");
    const resultPromise = pending.then((value) => value);
    await vi.runAllTimersAsync();
    await expect(resultPromise).resolves.toEqual({ ok: true, submitted: 1 });
    expect(attempts).toBe(2);
    vi.useRealTimers();
  });
});
