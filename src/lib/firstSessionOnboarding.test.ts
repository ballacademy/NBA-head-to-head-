import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearFirstSessionGuideSeen,
  hasSeenFirstSessionGuide,
  markFirstSessionGuideSeen,
} from "./firstSessionOnboarding";

const store = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
};

describe("firstSessionOnboarding", () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    clearFirstSessionGuideSeen();
  });

  it("starts unseen and marks seen", () => {
    expect(hasSeenFirstSessionGuide()).toBe(false);
    markFirstSessionGuideSeen();
    expect(hasSeenFirstSessionGuide()).toBe(true);
  });
});
