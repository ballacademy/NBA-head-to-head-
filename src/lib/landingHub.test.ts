import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isLandingContentTab,
  isLandingPlaySection,
  loadLandingHubTab,
  loadLandingPlaySection,
  saveLandingHubTab,
  saveLandingPlaySection,
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
    expect(isLandingContentTab("events")).toBe(false);
    expect(isLandingContentTab("standings")).toBe(false);
    expect(isLandingContentTab(null)).toBe(false);
  });

  it("validates play sections", () => {
    expect(isLandingPlaySection("chooser")).toBe(true);
    expect(isLandingPlaySection("daily")).toBe(true);
    expect(isLandingPlaySection("play")).toBe(false);
  });

  it("defaults to play when nothing is stored", () => {
    expect(loadLandingHubTab()).toBe("play");
    expect(loadLandingPlaySection()).toBe("chooser");
  });

  it("persists and restores the last content tab", () => {
    saveLandingHubTab("roster");
    expect(loadLandingHubTab()).toBe("roster");

    saveLandingHubTab("account");
    expect(loadLandingHubTab()).toBe("account");
  });

  it("persists play sections under the Play hub", () => {
    saveLandingPlaySection("headToHead");
    expect(loadLandingPlaySection()).toBe("headToHead");

    saveLandingPlaySection("events");
    expect(loadLandingPlaySection()).toBe("events");
  });

  it("migrates legacy daily/events hub tabs into Play", () => {
    sessionStorageMock.setItem("ddgm:landing-hub-tab", "daily");
    expect(loadLandingHubTab()).toBe("play");
    expect(loadLandingPlaySection()).toBe("daily");
  });

  it("ignores invalid stored values", () => {
    sessionStorageMock.setItem("ddgm:landing-hub-tab", "standings");
    expect(loadLandingHubTab()).toBe("play");
  });
});
