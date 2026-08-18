import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LIMITED_SAMPLE_TOOLTIP_COPY,
  hasSeenLimitedSampleExplainer,
  markLimitedSampleExplainerSeen,
} from "./limitedSampleExplainer";

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
};

describe("limitedSampleExplainer", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  it("starts unseen and remembers dismiss", () => {
    expect(hasSeenLimitedSampleExplainer()).toBe(false);
    markLimitedSampleExplainerSeen();
    expect(hasSeenLimitedSampleExplainer()).toBe(true);
    expect(LIMITED_SAMPLE_TOOLTIP_COPY).toMatch(/conservative/i);
  });
});
