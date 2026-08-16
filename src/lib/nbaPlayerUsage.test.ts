import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  backfillNbaPlayerUsageFromDailyScores,
  formatNbaPlayerWinPct,
  getMostDraftedNbaPlayers,
  listNbaPlayerUsageRows,
  loadNbaPlayerUsageStore,
  recordNbaPlayerDailyDraftUsage,
  recordNbaPlayerMatchUsage,
} from "./nbaPlayerUsage";

const storage = new Map<string, string>();

const localStorageMock = {
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
};

describe("nbaPlayerUsage", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("records competitive lineup drafts and win/loss once per match key", () => {
    const lineup = ["a", "b", "c", "d", "e"];
    expect(
      recordNbaPlayerMatchUsage({
        recordKey: "match-1",
        playerIds: lineup,
        mode: "headToHead",
        result: "win",
      }),
    ).toBe(true);
    expect(
      recordNbaPlayerMatchUsage({
        recordKey: "match-1",
        playerIds: lineup,
        mode: "headToHead",
        result: "win",
      }),
    ).toBe(false);

    const rows = listNbaPlayerUsageRows();
    expect(rows).toHaveLength(5);
    expect(rows[0]?.drafts).toBe(1);
    expect(rows[0]?.wins).toBe(1);
    expect(rows[0]?.winPct).toBe(1);
    expect(loadNbaPlayerUsageStore().recordedKeys).toContain("match-1");
  });

  it("ranks most drafted across modes and formats win pct", () => {
    recordNbaPlayerMatchUsage({
      recordKey: "m1",
      playerIds: ["star"],
      mode: "ranked",
      result: "win",
    });
    recordNbaPlayerMatchUsage({
      recordKey: "m2",
      playerIds: ["star", "role"],
      mode: "headToHead",
      result: "loss",
    });
    recordNbaPlayerDailyDraftUsage({
      recordKey: "daily:1",
      playerIds: ["star", "bench"],
    });

    const top = getMostDraftedNbaPlayers(10);
    expect(top[0]?.playerId).toBe("star");
    expect(top[0]?.drafts).toBe(3);
    expect(formatNbaPlayerWinPct(top[0]?.winPct ?? null)).toBe("50%");
    expect(top.map((row) => row.playerId)).toEqual(["star", "role", "bench"]);
  });

  it("backfills daily lineup history once", () => {
    localStorage.setItem(
      "nba-head-to-head-daily-scores",
      JSON.stringify({
        "2026-08-01": [
          {
            playerId: "gm-1",
            goalId: "pts",
            mode: "basic",
            value: 100,
            formattedResult: "100",
            lineup: ["p1", "p2", "p3", "p4", "p5"],
            submittedAt: "2026-08-01T12:00:00.000Z",
          },
        ],
      }),
    );

    expect(backfillNbaPlayerUsageFromDailyScores()).toBe(1);
    expect(backfillNbaPlayerUsageFromDailyScores()).toBe(0);
    expect(getMostDraftedNbaPlayers(5)).toHaveLength(5);
    expect(getMostDraftedNbaPlayers(5)[0]?.byMode.daily?.drafts).toBe(1);
  });
});
