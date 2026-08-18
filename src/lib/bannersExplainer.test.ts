import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BANNERS_EXPLAINER_COPY,
  hasSeenBannersExplainer,
  markBannersExplainerSeen,
} from "./bannersExplainer";

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

describe("bannersExplainer", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  it("starts unseen and remembers dismiss", () => {
    expect(hasSeenBannersExplainer()).toBe(false);
    markBannersExplainerSeen();
    expect(hasSeenBannersExplainer()).toBe(true);
    expect(BANNERS_EXPLAINER_COPY).toMatch(/Banners/i);
  });
});
