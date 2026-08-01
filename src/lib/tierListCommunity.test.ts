import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultTierListState } from "./tierList";
import {
  fetchPublicTierLists,
  publishTierList,
  setTierListLike,
} from "./tierListCommunity";
import { clearAccountLinkCache } from "./accountGate";

const memory = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
  clear: () => memory.clear(),
};

describe("tierListCommunity local fallback", () => {
  beforeEach(() => {
    memory.clear();
    clearAccountLinkCache();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/account/status")) {
          return new Response(
            JSON.stringify({
              linked: true,
              playerId: "viewer-1",
              username: "tester",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        throw new Error("offline");
      }),
    );
  });

  it("publishes, lists, and likes tier lists locally when API is unavailable", async () => {
    const state = createDefaultTierListState();
    state.title = "Test Board";
    state.tiers[0]!.playerIds = ["player-a"];

    const published = await publishTierList({
      state,
      playerId: "viewer-1",
      authorName: "Tester",
      authorTag: "ABCD",
    });
    expect(published.ok).toBe(true);
    if (!published.ok) {
      return;
    }

    const recent = await fetchPublicTierLists({
      viewerPlayerId: "viewer-2",
      sort: "recent",
    });
    expect(recent.some((entry) => entry.id === published.id)).toBe(true);

    const liked = await setTierListLike({
      id: published.id,
      playerId: "viewer-2",
      liked: true,
    });
    expect(liked.ok).toBe(true);
    if (!liked.ok) {
      return;
    }
    expect(liked.likeCount).toBe(1);

    const byLikes = await fetchPublicTierLists({
      viewerPlayerId: "viewer-2",
      sort: "likes",
    });
    expect(byLikes[0]?.id).toBe(published.id);
    expect(byLikes[0]?.likedByViewer).toBe(true);
  });

  it("blocks publish when the player has no linked account", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ linked: false, playerId: "guest-1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const state = createDefaultTierListState();
    const published = await publishTierList({
      state,
      playerId: "guest-1",
      authorName: "Guest",
      authorTag: "ZZZZ",
    });
    expect(published.ok).toBe(false);
    if (published.ok) {
      return;
    }
    expect(published.error).toMatch(/account/i);
  });
});
