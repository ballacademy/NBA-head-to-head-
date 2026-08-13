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
export const COMMUNITY_REPLY_BODY_MAX = 280;

export type CommunityPostSort = "recent" | "popular";

export interface CommunityPostQuote {
  postId: string;
  authorName: string;
  authorTag: string;
  bodyPreview: string;
}

export interface CommunityPostReply {
  id: string;
  postId: string;
  playerId: string;
  authorName: string;
  authorTag: string;
  body: string;
  createdAt: string;
}

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
  quotePostId: string | null;
  quote: CommunityPostQuote | null;
  authorClassicElo: number | null;
  authorRankedElo: number | null;
  replyCount: number;
}

export interface CommunityActivity {
  postsToday: number;
}

interface LocalCommunityFeed {
  posts: CommunityPost[];
}

const LOCAL_FEED_KEY = "nba-head-to-head-community-posts";
const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

const emptyFeed = (): LocalCommunityFeed => ({ posts: [] });

const normalizeQuote = (value: unknown): CommunityPostQuote | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const entry = value as Partial<CommunityPostQuote>;
  if (
    typeof entry.postId !== "string" ||
    typeof entry.authorName !== "string" ||
    typeof entry.bodyPreview !== "string"
  ) {
    return null;
  }
  return {
    postId: entry.postId,
    authorName: entry.authorName,
    authorTag:
      typeof entry.authorTag === "string" ? entry.authorTag : "0000",
    bodyPreview: entry.bodyPreview,
  };
};

const normalizeReply = (
  entry: Partial<CommunityPostReply>,
): CommunityPostReply | null => {
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
    postId: typeof entry.postId === "string" ? entry.postId : "",
    playerId: typeof entry.playerId === "string" ? entry.playerId : "",
    authorName: typeof entry.authorName === "string" ? entry.authorName : "GM",
    authorTag: typeof entry.authorTag === "string" ? entry.authorTag : "0000",
    body: entry.body,
    createdAt:
      typeof entry.createdAt === "string"
        ? entry.createdAt
        : new Date().toISOString(),
  };
};

const normalizeElo = (value: unknown): number | null => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.max(0, Math.min(4000, Math.round(n)));
};

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
    quotePostId:
      typeof entry.quotePostId === "string" ? entry.quotePostId : null,
    quote: normalizeQuote(entry.quote),
    authorClassicElo: normalizeElo(entry.authorClassicElo),
    authorRankedElo: normalizeElo(entry.authorRankedElo),
    replyCount: Math.max(0, Math.round(Number(entry.replyCount ?? 0)) || 0),
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
  quotePostId?: string | null;
  authorClassicElo?: number | null;
  authorRankedElo?: number | null;
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
        quotePostId: params.quotePostId ?? undefined,
        authorClassicElo: params.authorClassicElo ?? undefined,
        authorRankedElo: params.authorRankedElo ?? undefined,
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

export type DeleteCommunityPostResult =
  | { ok: true; postId: string }
  | { ok: false; error: string; accountRequired?: boolean };

export const deleteCommunityPost = async (params: {
  playerId: string;
  postId: string;
}): Promise<DeleteCommunityPostResult> => {
  const linked = await isPlayerAccountLinked(params.playerId);
  if (!linked) {
    return {
      ok: false,
      error: "Create an account to delete posts.",
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
        action: "delete",
        playerId: params.playerId,
        postId: params.postId,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; postId?: string; error?: string }
      | null;

    if (response.status === 403) {
      return {
        ok: false,
        error: payload?.error ?? "You can only delete your own posts.",
        accountRequired: payload?.error?.includes("account") || undefined,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: payload?.error ?? "Could not delete post. Try again.",
      };
    }

    const feed = loadLocalFeed();
    feed.posts = feed.posts.filter((post) => post.id !== params.postId);
    saveLocalFeed(feed);

    return { ok: true, postId: params.postId };
  } catch {
    return {
      ok: false,
      error: "Could not reach the server. Try again.",
    };
  }
};

export const getCommunityPost = async (params: {
  postId: string;
  playerId?: string;
}): Promise<CommunityPost | null> => {
  const search = new URLSearchParams({
    id: params.postId,
    limit: "1",
  });
  if (params.playerId) {
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
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { posts?: unknown[] };
    if (!Array.isArray(payload.posts) || payload.posts.length === 0) {
      return null;
    }
    return normalizePost(payload.posts[0] as Partial<CommunityPost>);
  } catch {
    return null;
  }
};

export const fetchCommunityActivity = async (): Promise<CommunityActivity> => {
  try {
    const response = await fetch(
      `${buildUrl("/api/community-posts")}?activity=1`,
      {
        method: "GET",
        headers: { accept: "application/json" },
      },
    );
    if (response.ok) {
      const payload = (await response.json()) as { postsToday?: unknown };
      return {
        postsToday: Math.max(
          0,
          Math.round(Number(payload.postsToday ?? 0)) || 0,
        ),
      };
    }
  } catch {
    // Fall through.
  }
  return { postsToday: 0 };
};

export const listCommunityPostReplies = async (params: {
  postId: string;
}): Promise<CommunityPostReply[]> => {
  const search = new URLSearchParams({ repliesFor: params.postId });
  try {
    const response = await fetch(
      `${buildUrl("/api/community-posts")}?${search.toString()}`,
      {
        method: "GET",
        headers: { accept: "application/json" },
      },
    );
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as { replies?: unknown[] };
    if (!Array.isArray(payload.replies)) {
      return [];
    }
    return payload.replies
      .map((entry) => normalizeReply(entry as Partial<CommunityPostReply>))
      .filter((entry): entry is CommunityPostReply => Boolean(entry));
  } catch {
    return [];
  }
};

export type CreateCommunityPostReplyResult =
  | { ok: true; reply: CommunityPostReply }
  | { ok: false; error: string; accountRequired?: boolean };

export const createCommunityPostReply = async (params: {
  playerId: string;
  postId: string;
  authorName: string;
  authorTag: string;
  body: string;
}): Promise<CreateCommunityPostReplyResult> => {
  const body = params.body.trim();
  if (!body) {
    return { ok: false, error: "Write a reply first." };
  }
  if (body.length > COMMUNITY_REPLY_BODY_MAX) {
    return {
      ok: false,
      error: `Replies can be at most ${COMMUNITY_REPLY_BODY_MAX} characters.`,
    };
  }

  const linked = await isPlayerAccountLinked(params.playerId);
  if (!linked) {
    return {
      ok: false,
      error: "Create an account to reply.",
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
        action: "reply",
        playerId: params.playerId,
        postId: params.postId,
        authorName: params.authorName,
        authorTag: params.authorTag,
        body,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; reply?: Partial<CommunityPostReply>; error?: string }
      | null;

    if (response.status === 403) {
      return {
        ok: false,
        error: payload?.error ?? "Create an account to reply.",
        accountRequired: true,
      };
    }

    const reply = payload?.reply ? normalizeReply(payload.reply) : null;
    if (!response.ok || !reply) {
      return {
        ok: false,
        error: payload?.error ?? "Could not post reply. Try again.",
      };
    }

    return { ok: true, reply };
  } catch {
    return {
      ok: false,
      error: "Could not reach the server. Try again.",
    };
  }
};

export type ReportCommunityPostResult =
  | { ok: true }
  | { ok: false; error: string; accountRequired?: boolean };

export const reportCommunityPost = async (params: {
  playerId: string;
  postId: string;
  reason?: string;
}): Promise<ReportCommunityPostResult> => {
  const linked = await isPlayerAccountLinked(params.playerId);
  if (!linked) {
    return {
      ok: false,
      error: "Create an account to report posts.",
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
        action: "report",
        playerId: params.playerId,
        postId: params.postId,
        reason: params.reason ?? "",
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (response.status === 403) {
      return {
        ok: false,
        error: payload?.error ?? "Create an account to report posts.",
        accountRequired: true,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: payload?.error ?? "Could not report post. Try again.",
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Could not reach the server. Try again.",
    };
  }
};
