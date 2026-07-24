import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isLandingContentTab,
  loadLandingHubTab,
  saveLandingHubTab,
} from "./landingHub";

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    clear: () => {
      store = {};
    },
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

describe("landingHub", () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    vi.stubGlobal("sessionStorage", sessionStorageMock);
  });

  it("validates content tabs", () => {
    expect(isLandingContentTab("play")).toBe(true);
    expect(isLandingContentTab("standings")).toBe(false);
    expect(isLandingContentTab(null)).toBe(false);
  });

  it("defaults to play when nothing is stored", () => {
    expect(loadLandingHubTab()).toBe("play");
  });

  it("persists and restores the last content tab", () => {
    saveLandingHubTab("daily");
    expect(loadLandingHubTab()).toBe("daily");

    saveLandingHubTab("account");
    expect(loadLandingHubTab()).toBe("account");
  });

  it("ignores invalid stored values", () => {
    sessionStorageMock.setItem("ddgm:landing-hub-tab", "standings");
    expect(loadLandingHubTab()).toBe("play");
  });
});
