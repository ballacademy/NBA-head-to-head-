import { afterEach, describe, expect, it, vi } from "vitest";
import { peekLocalCommunityPosts } from "./communityPosts";

const storage = new Map<string, string>();

describe("peekLocalCommunityPosts", () => {
  afterEach(() => {
    storage.clear();
    vi.unstubAllGlobals();
  });

  it("returns an empty list when nothing is cached", () => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });

    expect(peekLocalCommunityPosts()).toEqual([]);
  });

  it("hydrates the last cached feed without waiting on the network", () => {
    storage.set(
      "nba-head-to-head-community-posts",
      JSON.stringify({
        posts: [
          {
            id: "post-1",
            playerId: "p1",
            authorName: "Bulls",
            authorTag: "7F3A",
            body: "Nice board.",
            createdAt: "2026-08-19T00:00:00.000Z",
            likeCount: 2,
          },
        ],
      }),
    );
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });

    expect(peekLocalCommunityPosts("recent")).toEqual([
      expect.objectContaining({
        id: "post-1",
        body: "Nice board.",
        likeCount: 2,
      }),
    ]);
  });
});
