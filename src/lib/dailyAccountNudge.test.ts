import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasDismissedDailyAccountNudge,
  markDailyAccountNudgeDismissed,
  shouldShowDailyAccountNudge,
} from "./dailyAccountNudge";

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

describe("dailyAccountNudge", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows only for known signed-out GMs who have not dismissed", () => {
    expect(shouldShowDailyAccountNudge({ accountLinked: null })).toBe(false);
    expect(shouldShowDailyAccountNudge({ accountLinked: true })).toBe(false);
    expect(shouldShowDailyAccountNudge({ accountLinked: false })).toBe(true);

    markDailyAccountNudgeDismissed();
    expect(hasDismissedDailyAccountNudge()).toBe(true);
    expect(shouldShowDailyAccountNudge({ accountLinked: false })).toBe(false);
  });
});
