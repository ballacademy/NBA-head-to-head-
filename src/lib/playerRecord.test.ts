import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatPlayerRecord,
  loadAllModeRecords,
  loadPlayerRecord,
  recordMatchResult,
} from "./playerRecord";

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

describe("playerRecord", () => {
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

  it("tracks wins, losses, win streak, and loss streak per mode", () => {
    recordMatchResult("win", "headToHead");
    recordMatchResult("win", "headToHead");
    const afterLoss = recordMatchResult("loss", "headToHead");
    recordMatchResult("win", "ranked");

    expect(formatPlayerRecord(afterLoss)).toBe("2-1");
    expect(afterLoss.winStreak).toBe(0);
    expect(afterLoss.lossStreak).toBe(1);
    expect(formatPlayerRecord(loadPlayerRecord("ranked"))).toBe("1-0");
    expect(formatPlayerRecord(loadPlayerRecord("allTime"))).toBe("0-0");
  });

  it("keeps separate records for each competitive mode", () => {
    recordMatchResult("win", "headToHead");
    recordMatchResult("loss", "ranked");
    recordMatchResult("win", "allTime");
    recordMatchResult("win", "allTime");

    const records = loadAllModeRecords();

    expect(formatPlayerRecord(records.headToHead)).toBe("1-0");
    expect(formatPlayerRecord(records.ranked)).toBe("0-1");
    expect(formatPlayerRecord(records.allTime)).toBe("2-0");
  });

  it("records a tie without changing streaks", () => {
    recordMatchResult("win", "headToHead");
    recordMatchResult("win", "headToHead");
    const tied = recordMatchResult("tie", "headToHead");

    expect(formatPlayerRecord(tied)).toBe("2-0-1");
    expect(tied.winStreak).toBe(2);
    expect(tied.lossStreak).toBe(0);
  });
});
