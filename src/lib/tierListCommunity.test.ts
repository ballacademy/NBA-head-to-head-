import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultTierListState } from "./tierList";
import {
  fetchPublicTierLists,
  publishTierList,
  setTierListLike,
} from "./tierListCommunity";

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
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
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
});
