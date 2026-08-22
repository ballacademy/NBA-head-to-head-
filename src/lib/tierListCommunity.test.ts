import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultTierListState } from "./tierList";
import {
  DEFAULT_PUBLIC_TIER_LIST_FILTERS,
  createTierListComment,
  deleteTierListComment,
  fetchPublicTierLists,
  listTierListComments,
  matchesPublicTierListBrowseFilters,
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
    expect(recent.lists.some((entry) => entry.id === published.id)).toBe(true);

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
    expect(byLikes.lists[0]?.id).toBe(published.id);
    expect(byLikes.lists[0]?.likedByViewer).toBe(true);

    const mineOnly = await fetchPublicTierLists({
      viewerPlayerId: "viewer-1",
      sort: "recent",
      filters: { ...DEFAULT_PUBLIC_TIER_LIST_FILTERS, mineOnly: true },
    });
    expect(mineOnly.lists).toHaveLength(1);
    expect(mineOnly.lists[0]?.id).toBe(published.id);

    const searchMiss = await fetchPublicTierLists({
      viewerPlayerId: "viewer-2",
      sort: "recent",
      filters: { ...DEFAULT_PUBLIC_TIER_LIST_FILTERS, query: "zzzz-nope" },
    });
    expect(searchMiss.lists).toHaveLength(0);
  });

  it("stores comments locally when the comments API is unavailable", async () => {
    const state = createDefaultTierListState();
    state.title = "Comment Board";
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

    const created = await createTierListComment({
      id: published.id,
      playerId: "viewer-2",
      authorName: "Fan",
      authorTag: "ZZZZ",
      body: "Great rankings",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    expect(created.comment.body).toBe("Great rankings");

    const listed = await listTierListComments({ id: published.id });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.authorName).toBe("Fan");

    const deleted = await deleteTierListComment({
      id: published.id,
      commentId: created.comment.id,
      playerId: "viewer-2",
    });
    expect(deleted.ok).toBe(true);
    expect(await listTierListComments({ id: published.id })).toHaveLength(0);
  });

  it("updates an existing published list in the local catalog", async () => {
    const state = createDefaultTierListState();
    state.title = "Original";
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

    state.title = "Revised";
    state.tiers[0]!.playerIds = ["player-b"];
    const updated = await publishTierList({
      state,
      playerId: "viewer-1",
      authorName: "Tester",
      authorTag: "ABCD",
      publishedId: published.id,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) {
      return;
    }
    expect(updated.id).toBe(published.id);
    expect(updated.updated).toBe(true);

    const lists = await fetchPublicTierLists({
      viewerPlayerId: "viewer-1",
      sort: "recent",
      filters: { ...DEFAULT_PUBLIC_TIER_LIST_FILTERS, mineOnly: true },
    });
    expect(lists.lists).toHaveLength(1);
    expect(lists.lists[0]?.title).toBe("Revised");
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

  it("matches public browse filters for search, likes, and ownership", () => {
    const entry = {
      id: "pub-1",
      title: "Guard Rankings",
      authorName: "Tester",
      authorTag: "ABCD",
      likeCount: 4,
      likedByViewer: true,
      publishedAt: new Date().toISOString(),
      isOwner: true,
    };

    expect(
      matchesPublicTierListBrowseFilters(
        entry,
        { ...DEFAULT_PUBLIC_TIER_LIST_FILTERS, query: "guard" },
        "viewer-1",
      ),
    ).toBe(true);
    expect(
      matchesPublicTierListBrowseFilters(
        entry,
        { ...DEFAULT_PUBLIC_TIER_LIST_FILTERS, minLikes: 5 },
        "viewer-1",
      ),
    ).toBe(false);
    expect(
      matchesPublicTierListBrowseFilters(
        { ...entry, isOwner: false },
        { ...DEFAULT_PUBLIC_TIER_LIST_FILTERS, mineOnly: true },
        "viewer-1",
      ),
    ).toBe(false);
  });
});
