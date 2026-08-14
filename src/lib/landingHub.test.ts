import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyLandingDeepLinksFromSearch,
  buildCommunityHubShareUrl,
  buildCommunityPostShareUrl,
  buildRanksHubShareUrl,
  isLandingContentTab,
  isLandingH2hMode,
  isLandingPlaySection,
  loadLandingH2hMode,
  loadLandingHubTab,
  loadLandingPlaySection,
  parseLandingHubParam,
  parseLandingPlayParam,
  parseLandingPlayWithH2h,
  saveLandingH2hMode,
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
    expect(parseLandingPlayWithH2h("ranked")).toEqual({
      section: "headToHead",
      h2hMode: "ranked",
    });
    expect(parseLandingPlayWithH2h("pro")).toEqual({
      section: "headToHead",
      h2hMode: "ranked",
    });
    expect(parseLandingPlayWithH2h("classic")).toEqual({
      section: "headToHead",
      h2hMode: "classic",
    });
    expect(parseLandingPlayWithH2h("casual")).toEqual({
      section: "headToHead",
      h2hMode: "classic",
    });
  });

  it("persists and restores H2H mode aliases", () => {
    expect(isLandingH2hMode("classic")).toBe(true);
    expect(isLandingH2hMode("ranked")).toBe(true);
    expect(isLandingH2hMode("pro")).toBe(false);

    saveLandingH2hMode("ranked");
    expect(loadLandingH2hMode()).toBe("ranked");

    saveLandingPlaySection("daily");
    expect(loadLandingH2hMode()).toBeNull();
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
    expect(boot.h2hMode).toBeNull();
    expect(boot.feature).toBeNull();
    expect(loadLandingHubTab()).toBe("play");
    expect(loadLandingPlaySection()).toBe("daily");
  });

  it("maps ranked/classic play aliases to H2H mode", () => {
    const ranked = applyLandingDeepLinksFromSearch("?hub=play&play=ranked");
    expect(ranked.playSection).toBe("headToHead");
    expect(ranked.h2hMode).toBe("ranked");
    expect(loadLandingH2hMode()).toBe("ranked");

    sessionStorageMock.clear();
    const classic = applyLandingDeepLinksFromSearch("?hub=play&play=classic");
    expect(classic.playSection).toBe("headToHead");
    expect(classic.h2hMode).toBe("classic");
    expect(loadLandingH2hMode()).toBe("classic");
  });

  it("maps community/ranks hubs to feature deep links", () => {
    expect(applyLandingDeepLinksFromSearch("?hub=community").feature).toBe(
      "tierList",
    );
    expect(applyLandingDeepLinksFromSearch("?hub=ranks").feature).toBe(
      "leaderboard",
    );
  });

  it("maps view/post params into community deep links", () => {
    const posts = applyLandingDeepLinksFromSearch("?hub=community&view=posts");
    expect(posts.feature).toBe("tierList");
    expect(posts.communityView).toBe("posts");
    expect(posts.communityPostId).toBeNull();

    const focused = applyLandingDeepLinksFromSearch("?post=cpost-abc");
    expect(focused.feature).toBe("tierList");
    expect(focused.communityView).toBe("posts");
    expect(focused.communityPostId).toBe("cpost-abc");
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

    syncLandingDeepLinkUrl({ hub: "play", play: "headToHead", h2hMode: "ranked" });

    expect(replaceState).toHaveBeenCalled();
    const nextUrl = String(replaceState.mock.calls[0]?.[2] ?? "");
    expect(nextUrl).toContain("hub=play");
    expect(nextUrl).toContain("play=ranked");
    expect(nextUrl).toContain("tierList=abc123");
  });

  it("syncs classic alias for casual H2H deep links", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: {
        href: "https://example.test/",
        pathname: "/",
        search: "",
        hash: "",
      },
      history: {
        state: null,
        replaceState,
      },
    });

    syncLandingDeepLinkUrl({ hub: "play", play: "headToHead", h2hMode: "classic" });

    const nextUrl = String(replaceState.mock.calls[0]?.[2] ?? "");
    expect(nextUrl).toContain("play=classic");
  });

  it("builds community and ranks share URLs", () => {
    vi.stubGlobal("window", {
      location: {
        origin: "https://example.test",
      },
    });

    expect(buildCommunityPostShareUrl("post-123")).toBe(
      "https://example.test/?hub=community&view=posts&post=post-123",
    );
    expect(buildCommunityHubShareUrl("tiers")).toBe(
      "https://example.test/?hub=community&view=tiers",
    );
    expect(buildRanksHubShareUrl()).toBe("https://example.test/?hub=ranks");
  });
});
