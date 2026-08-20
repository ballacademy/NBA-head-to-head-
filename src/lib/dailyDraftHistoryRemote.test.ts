import { beforeEach, describe, expect, it, vi } from "vitest";
import { markPlayerAccountLinked } from "./accountGate";
import { getDailyDraftPlayStreak } from "./dailyDraftPlayStreak";
import { pullAndMergeDailyDraftHistory } from "./dailyDraftHistoryRemote";
import { setPlayerIdentity } from "./playerIdentity";

vi.mock("./accountGate", async () => {
  const actual = await vi.importActual<typeof import("./accountGate")>(
    "./accountGate",
  );
  return {
    ...actual,
    isPlayerAccountLinked: vi.fn(async () => true),
  };
});

vi.mock("./dailyDraftApi", () => ({
  fetchRemoteDailyDraftPlayerHistory: vi.fn(),
}));

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  });
  setPlayerIdentity("player-linked");
  markPlayerAccountLinked("player-linked", "hooper");
});

describe("dailyDraftHistoryRemote", () => {
  it("restores multi-day streaks from cloud history", async () => {
    const { fetchRemoteDailyDraftPlayerHistory } = await import("./dailyDraftApi");
    vi.mocked(fetchRemoteDailyDraftPlayerHistory).mockResolvedValue({
      playerId: "player-linked",
      entries: [
        {
          dateKey: "2099-01-03",
          playerId: "player-linked",
          goalId: "basic-goal",
          mode: "basic",
          value: 100,
          formattedResult: "100",
          lineup: ["a", "b", "c", "d", "e"],
          teamName: "Test",
          submittedAt: "2099-01-03T12:00:00.000Z",
        },
        {
          dateKey: "2099-01-02",
          playerId: "player-linked",
          goalId: "basic-goal",
          mode: "basic",
          value: 90,
          formattedResult: "90",
          lineup: ["a", "b", "c", "d", "e"],
          teamName: "Test",
          submittedAt: "2099-01-02T12:00:00.000Z",
        },
        {
          dateKey: "2099-01-01",
          playerId: "player-linked",
          goalId: "basic-goal",
          mode: "basic",
          value: 80,
          formattedResult: "80",
          lineup: ["a", "b", "c", "d", "e"],
          teamName: "Test",
          submittedAt: "2099-01-01T12:00:00.000Z",
        },
      ],
    });

    await pullAndMergeDailyDraftHistory("player-linked");

    expect(getDailyDraftPlayStreak("basic", "2099-01-03", "player-linked")).toEqual(
      expect.objectContaining({
        current: 3,
        active: true,
      }),
    );
  });
});
