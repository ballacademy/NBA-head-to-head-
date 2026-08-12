import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyLandingDeepLinksFromSearch,
  isLandingContentTab,
  isLandingPlaySection,
  loadLandingHubTab,
  loadLandingPlaySection,
  parseLandingHubParam,
  parseLandingPlayParam,
  saveLandingHubTab,
  saveLandingPlaySection,
  syncLandingDeepLinkUrl,
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

  it("parses hub and play deep-link aliases", () => {
    expect(parseLandingHubParam("ranks")).toBe("ranks");
    expect(parseLandingHubParam("standings")).toBe("ranks");
    expect(parseLandingHubParam("leaderboard")).toBe("ranks");
    expect(parseLandingHubParam("community")).toBe("community");
    expect(parseLandingHubParam("tier-list")).toBe("community");
    expect(parseLandingPlayParam("h2h")).toBe("headToHead");
    expect(parseLandingPlayParam("daily-draft")).toBe("daily");
    expect(parseLandingPlayParam("weekly")).toBe("events");
    expect(parseLandingPlayParam("modes")).toBe("chooser");
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

  it("applies hub/play query params into session storage", () => {
    const boot = applyLandingDeepLinksFromSearch("?hub=play&play=daily");
    expect(boot.contentTab).toBe("play");
    expect(boot.playSection).toBe("daily");
    expect(boot.feature).toBeNull();
    expect(loadLandingHubTab()).toBe("play");
    expect(loadLandingPlaySection()).toBe("daily");
  });

  it("maps community/ranks hubs to feature deep links", () => {
    expect(applyLandingDeepLinksFromSearch("?hub=community").feature).toBe(
      "tierList",
    );
    expect(applyLandingDeepLinksFromSearch("?hub=ranks").feature).toBe(
      "leaderboard",
    );
  });

  it("syncs hub/play into the URL while preserving tierList", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: {
        href: "https://example.test/?tierList=abc123",
        pathname: "/",
        search: "?tierList=abc123",
        hash: "",
      },
      history: {
        state: null,
        replaceState,
      },
    });

    syncLandingDeepLinkUrl({ hub: "play", play: "events" });

    expect(replaceState).toHaveBeenCalled();
    const nextUrl = String(replaceState.mock.calls[0]?.[2] ?? "");
    expect(nextUrl).toContain("hub=play");
    expect(nextUrl).toContain("play=events");
    expect(nextUrl).toContain("tierList=abc123");
  });
});
