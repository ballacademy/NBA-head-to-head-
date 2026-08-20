import { beforeEach, describe, expect, it, vi } from "vitest";
import { markPlayerAccountLinked } from "./accountGate";
import {
  loadNbaPlayerUsageStore,
  recordNbaPlayerMatchUsage,
  saveNbaPlayerUsageStore,
} from "./nbaPlayerUsage";
import {
  pullAndMergeNbaPlayerUsage,
  pushNbaPlayerUsageIfLinked,
  resetNbaPlayerUsagePullGate,
} from "./nbaPlayerUsageRemote";
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

vi.mock("./nbaPlayerUsageApi", () => ({
  fetchRemoteNbaPlayerUsage: vi.fn(),
  pushRemoteNbaPlayerUsage: vi.fn(),
}));

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  resetNbaPlayerUsagePullGate();
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

describe("nbaPlayerUsageRemote", () => {
  it("pulls remote usage and merges local Casual/Pro boards", async () => {
    saveNbaPlayerUsageStore({
      version: 1,
      byPlayerId: {},
      recordedKeys: [],
      dailyBackfillDone: false,
      dailyLineups: {},
    });
    recordNbaPlayerMatchUsage({
      recordKey: "local-match",
      playerIds: ["nba-a"],
      mode: "headToHead",
      result: "win",
    });

    const { fetchRemoteNbaPlayerUsage, pushRemoteNbaPlayerUsage } = await import(
      "./nbaPlayerUsageApi"
    );
    vi.mocked(fetchRemoteNbaPlayerUsage).mockResolvedValue({
      playerId: "player-linked",
      updatedAt: "2026-08-01T00:00:00.000Z",
      usage: {
        version: 1,
        byPlayerId: {
          "nba-b": {
            ranked: { drafts: 2, wins: 1, losses: 1, ties: 0 },
          },
        },
        recordedKeys: ["remote-match"],
        dailyBackfillDone: true,
        dailyLineups: {},
      },
    });
    vi.mocked(pushRemoteNbaPlayerUsage).mockResolvedValue(null);

    const merged = await pullAndMergeNbaPlayerUsage("player-linked");

    expect(merged?.byPlayerId["nba-a"]?.headToHead).toEqual({
      drafts: 1,
      wins: 1,
      losses: 0,
      ties: 0,
    });
    expect(merged?.byPlayerId["nba-b"]?.ranked).toEqual({
      drafts: 2,
      wins: 1,
      losses: 1,
      ties: 0,
    });
    expect(loadNbaPlayerUsageStore().byPlayerId["nba-b"]?.ranked?.drafts).toBe(2);
  });

  it("does not push before a successful pull unless forced", async () => {
    const { pushRemoteNbaPlayerUsage } = await import("./nbaPlayerUsageApi");
    vi.mocked(pushRemoteNbaPlayerUsage).mockResolvedValue(null);

    recordNbaPlayerMatchUsage({
      recordKey: "match-1",
      playerIds: ["nba-a"],
      mode: "ranked",
      result: "loss",
    });

    await expect(pushNbaPlayerUsageIfLinked("player-linked")).resolves.toBe(false);

    vi.mocked(pushRemoteNbaPlayerUsage).mockResolvedValue({
      playerId: "player-linked",
      updatedAt: "2026-08-01T00:00:00.000Z",
      usage: loadNbaPlayerUsageStore(),
    });
    await expect(
      pushNbaPlayerUsageIfLinked("player-linked", { force: true }),
    ).resolves.toBe(true);
  });
});
