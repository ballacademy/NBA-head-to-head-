import {
  ACCOUNT_REQUIRED_COMMUNITY_POST_MESSAGE,
  isPlayerAccountLinked,
} from "./accountGate";
import { readJson, writeJson } from "./browserStorage";
import {
  isCommunityPostAttachment,
  type CommunityPostAttachment,
} from "./communityShareables";

export const COMMUNITY_POST_BODY_MAX = 400;

export type CommunityPostSort = "recent" | "popular";

export interface CommunityPost {
  id: string;
  playerId: string;
  authorName: string;
  authorTag: string;
  body: string;
  createdAt: string;
  likeCount: number;
  likedByViewer: boolean;
  attachment: CommunityPostAttachment | null;
}

interface LocalCommunityFeed {
  posts: CommunityPost[];
}

const LOCAL_FEED_KEY = "nba-head-to-head-community-posts";
const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

const emptyFeed = (): LocalCommunityFeed => ({ posts: [] });

const normalizePost = (entry: Partial<CommunityPost>): CommunityPost | null => {
  if (
    !entry ||
    typeof entry !== "object" ||
    typeof entry.id !== "string" ||
    typeof entry.body !== "string"
  ) {
    return null;
  }

  return {
    id: entry.id,
    playerId: typeof entry.playerId === "string" ? entry.playerId : "",
    authorName: typeof entry.authorName === "string" ? entry.authorName : "GM",
    authorTag: typeof entry.authorTag === "string" ? entry.authorTag : "0000",
    body: entry.body,
    createdAt:
      typeof entry.createdAt === "string"
        ? entry.createdAt
        : new Date().toISOString(),
    likeCount: Math.max(0, Math.round(Number(entry.likeCount ?? 0)) || 0),
    likedByViewer: Boolean(entry.likedByViewer),
    attachment: isCommunityPostAttachment(entry.attachment)
      ? entry.attachment
      : null,
  };
};

const loadLocalFeed = (): LocalCommunityFeed => {
  const saved = readJson<Partial<LocalCommunityFeed>>(LOCAL_FEED_KEY);
  if (!saved || !Array.isArray(saved.posts)) {
    return emptyFeed();
  }

  return {
    posts: saved.posts
      .map((entry) => normalizePost(entry as Partial<CommunityPost>))
      .filter((entry): entry is CommunityPost => Boolean(entry)),
  };
};

const saveLocalFeed = (feed: LocalCommunityFeed) => {
  writeJson(LOCAL_FEED_KEY, {
    posts: feed.posts.slice(0, 50),
  });
};

const sortLocalPosts = (
  posts: CommunityPost[],
  sort: CommunityPostSort,
) => {
  const copy = [...posts];
  if (sort === "popular") {
    return copy.sort(
      (left, right) =>
        right.likeCount - left.likeCount ||
        right.createdAt.localeCompare(left.createdAt),
    );
  }
  return copy.sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
};

export const formatCommunityPostTime = (iso: string) => {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return "";
  }

  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const listCommunityPosts = async (params?: {
  sort?: CommunityPostSort;
  playerId?: string;
  offset?: number;
  limit?: number;
}): Promise<{
  posts: CommunityPost[];
  hasMore: boolean;
  nextOffset: number;
}> => {
  const sort = params?.sort ?? "recent";
  const offset = Math.max(0, Math.floor(params?.offset ?? 0));
  const limit = Math.max(1, Math.min(50, Math.floor(params?.limit ?? 50)));
  const search = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sort,
  });
  if (params?.playerId) {
    search.set("playerId", params.playerId);
  }

  try {
    const response = await fetch(
      `${buildUrl("/api/community-posts")}?${search.toString()}`,
      {
        method: "GET",
        headers: { accept: "application/json" },
      },
    );

    if (response.ok) {
      const payload = (await response.json()) as {
        posts?: unknown[];
        hasMore?: boolean;
        nextOffset?: number;
      };
      if (Array.isArray(payload.posts)) {
        const posts = payload.posts
          .map((entry) => normalizePost(entry as Partial<CommunityPost>))
          .filter((entry): entry is CommunityPost => Boolean(entry))
          .slice(0, limit);
        if (offset === 0) {
          saveLocalFeed({ posts });
        }
        return {
          posts,
          hasMore: Boolean(payload.hasMore),
          nextOffset:
            typeof payload.nextOffset === "number"
              ? payload.nextOffset
              : offset + posts.length,
        };
      }
    }
  } catch {
    // Fall through to local cache.
  }

  const local = sortLocalPosts(loadLocalFeed().posts, sort);
  const page = local.slice(offset, offset + limit);
  return {
    posts: page,
    hasMore: offset + page.length < local.length,
    nextOffset: offset + page.length,
  };
};

export type CreateCommunityPostResult =
  | { ok: true; post: CommunityPost }
  | { ok: false; error: string; accountRequired?: boolean };

export const createCommunityPost = async (params: {
  playerId: string;
  authorName: string;
  authorTag: string;
  body: string;
  attachment?: CommunityPostAttachment | null;
}): Promise<CreateCommunityPostResult> => {
  const body = params.body.trim();
  if (!body) {
    return { ok: false, error: "Write something before posting." };
  }
  if (body.length > COMMUNITY_POST_BODY_MAX) {
    return {
      ok: false,
      error: `Posts can be at most ${COMMUNITY_POST_BODY_MAX} characters.`,
    };
  }

  const linked = await isPlayerAccountLinked(params.playerId);
  if (!linked) {
    return {
      ok: false,
      error: ACCOUNT_REQUIRED_COMMUNITY_POST_MESSAGE,
      accountRequired: true,
    };
  }

  try {
    const response = await fetch(buildUrl("/api/community-posts"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        playerId: params.playerId,
        authorName: params.authorName,
        authorTag: params.authorTag,
        body,
        attachment: params.attachment ?? undefined,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; post?: Partial<CommunityPost>; error?: string }
      | null;

    if (response.status === 403) {
      return {
        ok: false,
        error:
          payload?.error ?? ACCOUNT_REQUIRED_COMMUNITY_POST_MESSAGE,
        accountRequired: true,
      };
    }

    const post = payload?.post ? normalizePost(payload.post) : null;
    if (!response.ok || !post) {
      return {
        ok: false,
        error: payload?.error ?? "Could not create post. Try again.",
      };
    }

    const feed = loadLocalFeed();
    feed.posts = [post, ...feed.posts.filter((p) => p.id !== post.id)];
    saveLocalFeed(feed);
    return { ok: true, post };
  } catch {
    return {
      ok: false,
      error: "Could not reach the server. Try again.",
    };
  }
};

export type SetCommunityPostLikeResult =
  | { ok: true; postId: string; liked: boolean; likeCount: number }
  | { ok: false; error: string; accountRequired?: boolean };

export const setCommunityPostLike = async (params: {
  playerId: string;
  postId: string;
  liked: boolean;
}): Promise<SetCommunityPostLikeResult> => {
  const linked = await isPlayerAccountLinked(params.playerId);
  if (!linked) {
    return {
      ok: false,
      error: "Create an account to like posts.",
      accountRequired: true,
    };
  }

  try {
    const response = await fetch(buildUrl("/api/community-posts"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        action: "like",
        playerId: params.playerId,
        postId: params.postId,
        liked: params.liked,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          postId?: string;
          liked?: boolean;
          likeCount?: number;
          error?: string;
        }
      | null;

    if (response.status === 403) {
      return {
        ok: false,
        error: payload?.error ?? "Create an account to like posts.",
        accountRequired: true,
      };
    }

    if (!response.ok || typeof payload?.likeCount !== "number") {
      return {
        ok: false,
        error: payload?.error ?? "Could not update like. Try again.",
      };
    }

    const feed = loadLocalFeed();
    feed.posts = feed.posts.map((post) =>
      post.id === params.postId
        ? {
            ...post,
            likedByViewer: params.liked,
            likeCount: payload.likeCount!,
          }
        : post,
    );
    saveLocalFeed(feed);

    return {
      ok: true,
      postId: params.postId,
      liked: params.liked,
      likeCount: payload.likeCount,
    };
  } catch {
    const feed = loadLocalFeed();
    let likeCount = 0;
    feed.posts = feed.posts.map((post) => {
      if (post.id !== params.postId) {
        return post;
      }
      const wasLiked = post.likedByViewer;
      likeCount = Math.max(
        0,
        post.likeCount + (params.liked && !wasLiked ? 1 : 0) + (!params.liked && wasLiked ? -1 : 0),
      );
      return {
        ...post,
        likedByViewer: params.liked,
        likeCount,
      };
    });
    saveLocalFeed(feed);
    return {
      ok: true,
      postId: params.postId,
      liked: params.liked,
      likeCount,
    };
  }
};
