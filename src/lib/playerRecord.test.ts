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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tracks wins, losses, win streak, and loss streak per mode", () => {
    recordMatchResult(true, "headToHead");
    recordMatchResult(true, "headToHead");
    const afterLoss = recordMatchResult(false, "headToHead");
    recordMatchResult(true, "ranked");

    expect(formatPlayerRecord(afterLoss)).toBe("2-1");
    expect(afterLoss.winStreak).toBe(0);
    expect(afterLoss.lossStreak).toBe(1);
    expect(formatPlayerRecord(loadPlayerRecord("ranked"))).toBe("1-0");
    expect(formatPlayerRecord(loadPlayerRecord("allTime"))).toBe("0-0");
  });

  it("keeps separate records for each competitive mode", () => {
    recordMatchResult(true, "headToHead");
    recordMatchResult(false, "ranked");
    recordMatchResult(true, "allTime");
    recordMatchResult(true, "allTime");

    const records = loadAllModeRecords();

    expect(formatPlayerRecord(records.headToHead)).toBe("1-0");
    expect(formatPlayerRecord(records.ranked)).toBe("0-1");
    expect(formatPlayerRecord(records.allTime)).toBe("2-0");
  });
});
