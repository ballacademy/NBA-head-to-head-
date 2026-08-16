import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  backfillNbaPlayerUsageFromDailyScores,
  canShowMostDraftedBoards,
  formatNbaPlayerWinPct,
  formatPersonalHitRateMeta,
  getMostDraftedNbaPlayers,
  getMostDraftedNbaPlayersForMode,
  getRecordedDraftLineupCount,
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
    vi.stubGlobal("crypto", {
      randomUUID: () => "gm-current",
    });
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

  it("backfills only the current GM identity's daily history", () => {
    localStorage.setItem(
      "nba-head-to-head-daily-scores",
      JSON.stringify({
        "2026-08-01": [
          {
            playerId: "gm-other",
            goalId: "pts",
            mode: "basic",
            value: 100,
            formattedResult: "100",
            lineup: ["x1", "x2", "x3", "x4", "x5"],
            submittedAt: "2026-08-01T12:00:00.000Z",
          },
          {
            playerId: "gm-current",
            goalId: "pts",
            mode: "basic",
            value: 110,
            formattedResult: "110",
            lineup: ["p1", "p2", "p3", "p4", "p5"],
            submittedAt: "2026-08-01T13:00:00.000Z",
          },
        ],
      }),
    );

    expect(backfillNbaPlayerUsageFromDailyScores("gm-current")).toBe(1);
    expect(backfillNbaPlayerUsageFromDailyScores("gm-current")).toBe(0);
    expect(getMostDraftedNbaPlayers(10).map((row) => row.playerId)).toEqual([
      "p1",
      "p2",
      "p3",
      "p4",
      "p5",
    ]);
  });

  it("gates most drafted boards until two lineups are recorded", () => {
    expect(canShowMostDraftedBoards()).toBe(false);
    expect(getRecordedDraftLineupCount()).toBe(0);

    recordNbaPlayerMatchUsage({
      recordKey: "m1",
      playerIds: ["a"],
      mode: "headToHead",
      result: "win",
    });
    expect(getRecordedDraftLineupCount()).toBe(1);
    expect(canShowMostDraftedBoards()).toBe(false);

    recordNbaPlayerDailyDraftUsage({
      recordKey: "daily:1",
      playerIds: ["b"],
    });
    expect(getRecordedDraftLineupCount()).toBe(2);
    expect(canShowMostDraftedBoards()).toBe(true);
  });

  it("ranks most drafted separately for Casual, Pro, and Daily", () => {
    recordNbaPlayerMatchUsage({
      recordKey: "c1",
      playerIds: ["casual-star", "shared"],
      mode: "headToHead",
      result: "win",
    });
    recordNbaPlayerMatchUsage({
      recordKey: "c2",
      playerIds: ["casual-star"],
      mode: "headToHead",
      result: "loss",
    });
    recordNbaPlayerMatchUsage({
      recordKey: "p1",
      playerIds: ["pro-star", "shared"],
      mode: "ranked",
      result: "win",
    });
    recordNbaPlayerDailyDraftUsage({
      recordKey: "daily:1",
      playerIds: ["daily-star", "shared"],
    });
    recordNbaPlayerDailyDraftUsage({
      recordKey: "daily:2",
      playerIds: ["daily-star"],
    });

    expect(
      getMostDraftedNbaPlayersForMode("headToHead", 10).map((row) => row.playerId),
    ).toEqual(["casual-star", "shared"]);
    expect(
      getMostDraftedNbaPlayersForMode("ranked", 10).map((row) => row.playerId),
    ).toEqual(["pro-star", "shared"]);
    expect(
      getMostDraftedNbaPlayersForMode("daily", 10).map((row) => row.playerId),
    ).toEqual(["daily-star", "shared"]);
    expect(getMostDraftedNbaPlayersForMode("headToHead", 10)[0]?.drafts).toBe(2);
  });

  it("replaces daily usage when the canonical lineup changes", () => {
    expect(
      recordNbaPlayerDailyDraftUsage({
        recordKey: "daily:2026-08-01:basic:gm-current",
        playerIds: ["a", "b", "c", "d", "e"],
      }),
    ).toBe(true);
    expect(
      recordNbaPlayerDailyDraftUsage({
        recordKey: "daily:2026-08-01:basic:gm-current",
        playerIds: ["a", "b", "c", "d", "z"],
      }),
    ).toBe(true);

    const rows = Object.fromEntries(
      listNbaPlayerUsageRows().map((row) => [row.playerId, row.drafts]),
    );
    expect(rows.e).toBeUndefined();
    expect(rows.z).toBe(1);
    expect(rows.a).toBe(1);
  });

  it("formats personal hit rate only for Casual/Pro with enough decided games", () => {
    expect(
      formatPersonalHitRateMeta("daily", {
        drafts: 4,
        wins: 0,
        losses: 0,
        winPct: null,
      }),
    ).toBe("4 drafts");

    expect(
      formatPersonalHitRateMeta("headToHead", {
        drafts: 5,
        wins: 1,
        losses: 1,
        winPct: 0.5,
      }),
    ).toBe("5 drafts");

    expect(
      formatPersonalHitRateMeta("ranked", {
        drafts: 6,
        wins: 2,
        losses: 1,
        winPct: 2 / 3,
      }),
    ).toBe("6 drafts · Your hit rate 66.7%");
  });
});
