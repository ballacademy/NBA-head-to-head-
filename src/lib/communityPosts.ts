import {
  ACCOUNT_REQUIRED_COMMUNITY_POST_MESSAGE,
  isPlayerAccountLinked,
} from "./accountGate";
import { readJson, writeJson } from "./browserStorage";

export const COMMUNITY_POST_BODY_MAX = 400;

export interface CommunityPost {
  id: string;
  playerId: string;
  authorName: string;
  authorTag: string;
  body: string;
  createdAt: string;
}

interface LocalCommunityFeed {
  posts: CommunityPost[];
}

const LOCAL_FEED_KEY = "nba-head-to-head-community-posts";
const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

const emptyFeed = (): LocalCommunityFeed => ({ posts: [] });

const loadLocalFeed = (): LocalCommunityFeed => {
  const saved = readJson<Partial<LocalCommunityFeed>>(LOCAL_FEED_KEY);
  if (!saved || !Array.isArray(saved.posts)) {
    return emptyFeed();
  }

  return {
    posts: saved.posts.filter(
      (entry): entry is CommunityPost =>
        Boolean(
          entry &&
            typeof entry === "object" &&
            typeof entry.id === "string" &&
            typeof entry.body === "string",
        ),
    ),
  };
};

const saveLocalFeed = (feed: LocalCommunityFeed) => {
  writeJson(LOCAL_FEED_KEY, {
    posts: feed.posts.slice(0, 50),
  });
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

export const listCommunityPosts = async (): Promise<CommunityPost[]> => {
  try {
    const response = await fetch(
      `${buildUrl("/api/community-posts")}?limit=50`,
      {
        method: "GET",
        headers: { accept: "application/json" },
      },
    );

    if (response.ok) {
      const payload = (await response.json()) as { posts?: CommunityPost[] };
      if (Array.isArray(payload.posts)) {
        const posts = payload.posts.slice(0, 50);
        saveLocalFeed({ posts });
        return posts;
      }
    }
  } catch {
    // Fall through to local cache.
  }

  return loadLocalFeed().posts;
};

export type CreateCommunityPostResult =
  | { ok: true; post: CommunityPost }
  | { ok: false; error: string; accountRequired?: boolean };

export const createCommunityPost = async (params: {
  playerId: string;
  authorName: string;
  authorTag: string;
  body: string;
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
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; post?: CommunityPost; error?: string }
      | null;

    if (response.status === 403) {
      return {
        ok: false,
        error:
          payload?.error ?? ACCOUNT_REQUIRED_COMMUNITY_POST_MESSAGE,
        accountRequired: true,
      };
    }

    if (!response.ok || !payload?.post) {
      return {
        ok: false,
        error: payload?.error ?? "Could not create post. Try again.",
      };
    }

    const feed = loadLocalFeed();
    feed.posts = [payload.post, ...feed.posts.filter((p) => p.id !== payload.post!.id)];
    saveLocalFeed(feed);
    return { ok: true, post: payload.post };
  } catch {
    // Offline / local fallback for browseability in dev.
    const post: CommunityPost = {
      id: `local-cpost-${Date.now().toString(36)}`,
      playerId: params.playerId,
      authorName: params.authorName,
      authorTag: params.authorTag,
      body,
      createdAt: new Date().toISOString(),
    };
    const feed = loadLocalFeed();
    feed.posts = [post, ...feed.posts];
    saveLocalFeed(feed);
    return { ok: true, post };
  }
};
