import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearQueuedProductEvents,
  getAnalyticsSessionId,
  getQueuedProductEvents,
  trackProductEvent,
} from "./productAnalytics";

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

describe("productAnalytics", () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    clearQueuedProductEvents();
    vi.stubGlobal("sessionStorage", sessionStorageMock);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))),
    );
    vi.stubGlobal("navigator", {
      sendBeacon: vi.fn(() => true),
    });
  });

  it("reuses an anonymous session id from sessionStorage", () => {
    const first = getAnalyticsSessionId();
    const second = getAnalyticsSessionId();
    expect(first).toBe(second);
    expect(sessionStorageMock.getItem("ddgm:analytics-session")).toBe(first);
  });

  it("queues events and posts without cookies", () => {
    trackProductEvent("play_mode_open", { section: "daily" });

    const queued = getQueuedProductEvents();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.event).toBe("play_mode_open");
    expect(queued[0]?.props).toEqual({ section: "daily" });
    expect(queued[0]?.sessionId).toBeTruthy();

    expect(navigator.sendBeacon).toHaveBeenCalledWith(
      "/api/analytics",
      expect.any(Blob),
    );
  });

  it("fails open when transport throws", () => {
    vi.stubGlobal("navigator", {
      sendBeacon: () => {
        throw new Error("beacon blocked");
      },
    });
    vi.stubGlobal("fetch", () => {
      throw new Error("fetch blocked");
    });

    expect(() => trackProductEvent("matchmaking_cancel")).not.toThrow();
    expect(getQueuedProductEvents()).toHaveLength(1);
  });
});
