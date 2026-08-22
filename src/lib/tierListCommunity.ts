import { readJson, writeJson } from "./browserStorage";
import {
  ACCOUNT_REQUIRED_TIER_LIST_COMMENT_DELETE_MESSAGE,
  ACCOUNT_REQUIRED_TIER_LIST_COMMENT_MESSAGE,
  ACCOUNT_REQUIRED_TIER_LIST_LIKE_MESSAGE,
  ACCOUNT_REQUIRED_TIER_PUBLISH_MESSAGE,
  isPlayerAccountLinked,
} from "./accountGate";
import type { TierListRow, TierListState } from "./tierList";
import { displayTierListTitle } from "./tierList";

export type PublicTierListSort = "recent" | "likes";
export type PublicTierListDateWindow = "all" | "week" | "month";

export const TIER_LIST_COMMENT_BODY_MAX = 280;

export interface PublicTierListBrowseFilters {
  query: string;
  mineOnly: boolean;
  likedByMe: boolean;
  minLikes: number;
  dateWindow: PublicTierListDateWindow;
}

export const DEFAULT_PUBLIC_TIER_LIST_FILTERS: PublicTierListBrowseFilters = {
  query: "",
  mineOnly: false,
  likedByMe: false,
  minLikes: 0,
  dateWindow: "all",
};

export interface PublicTierListSummary {
  id: string;
  title: string;
  authorName: string;
  authorTag: string;
  likeCount: number;
  likedByViewer: boolean;
  publishedAt: string;
  updatedAt?: string;
  isOwner: boolean;
}

export interface PublicTierListDetail extends PublicTierListSummary {
  tiers: TierListRow[];
}

export interface TierListComment {
  id: string;
  tierListId: string;
  playerId: string;
  authorName: string;
  authorTag: string;
  body: string;
  createdAt: string;
}

interface LocalPublicCatalog {
  lists: Array<PublicTierListDetail & { playerId: string }>;
  likesByPlayer: Record<string, string[]>;
  commentsByTierListId: Record<string, TierListComment[]>;
}

const LOCAL_PUBLIC_KEY = "nba-head-to-head-tier-list-public";
const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

const emptyCatalog = (): LocalPublicCatalog => ({
  lists: [],
  likesByPlayer: {},
  commentsByTierListId: {},
});

const loadLocalCatalog = (): LocalPublicCatalog => {
  const saved = readJson<Partial<LocalPublicCatalog>>(LOCAL_PUBLIC_KEY);
  if (!saved || !Array.isArray(saved.lists)) {
    return emptyCatalog();
  }

  return {
    lists: saved.lists.filter(
      (entry): entry is PublicTierListDetail & { playerId: string } =>
        Boolean(entry && typeof entry === "object" && typeof entry.id === "string"),
    ),
    likesByPlayer:
      saved.likesByPlayer && typeof saved.likesByPlayer === "object"
        ? saved.likesByPlayer
        : {},
    commentsByTierListId:
      saved.commentsByTierListId &&
      typeof saved.commentsByTierListId === "object"
        ? saved.commentsByTierListId
        : {},
  };
};

const saveLocalCatalog = (catalog: LocalPublicCatalog) => {
  writeJson(LOCAL_PUBLIC_KEY, catalog);
};

const dateWindowStartMs = (window: PublicTierListDateWindow) => {
  if (window === "all") {
    return null;
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return window === "week" ? now - 7 * dayMs : now - 30 * dayMs;
};

export const matchesPublicTierListBrowseFilters = (
  entry: PublicTierListSummary,
  filters: PublicTierListBrowseFilters,
  viewerPlayerId: string,
) => {
  const query = filters.query.trim().toLowerCase();
  if (query) {
    const haystack =
      `${entry.title} ${entry.authorName} ${entry.authorTag}`.toLowerCase();
    if (!haystack.includes(query)) {
      return false;
    }
  }

  if (filters.mineOnly && !entry.isOwner) {
    return false;
  }

  if (filters.likedByMe && !entry.likedByViewer) {
    return false;
  }

  if (entry.likeCount < Math.max(0, filters.minLikes)) {
    return false;
  }

  const sinceMs = dateWindowStartMs(filters.dateWindow);
  if (sinceMs != null) {
    const publishedMs = new Date(entry.publishedAt).getTime();
    if (!Number.isFinite(publishedMs) || publishedMs < sinceMs) {
      return false;
    }
  }

  // mineOnly / likedByMe already use isOwner / likedByViewer from the summary.
  void viewerPlayerId;
  return true;
};

const sortLists = (
  lists: PublicTierListSummary[],
  sort: PublicTierListSort,
) =>
  [...lists].sort((left, right) => {
    if (sort === "likes") {
      if (right.likeCount !== left.likeCount) {
        return right.likeCount - left.likeCount;
      }
    }

    return (
      new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
    );
  });

const toSummary = (
  entry: PublicTierListDetail & { playerId: string },
  viewerPlayerId: string,
  likedIds: Set<string>,
): PublicTierListSummary => ({
  id: entry.id,
  title: entry.title,
  authorName: entry.authorName,
  authorTag: entry.authorTag,
  likeCount: entry.likeCount,
  likedByViewer: likedIds.has(entry.id),
  publishedAt: entry.publishedAt,
  updatedAt: entry.updatedAt,
  isOwner: entry.playerId === viewerPlayerId,
});

export const formatPublicTierListTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export interface PublicTierListPage {
  lists: PublicTierListSummary[];
  hasMore: boolean;
  nextOffset: number;
}

/** Canonical share URL that opens the public viewer via deep link. */
export const buildPublicTierListShareUrl = (id: string) => {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://www.draftdaygm.com";
  const url = new URL(origin);
  url.searchParams.set("tierList", id);
  return url.toString();
};

export const fetchPublicTierLists = async (params: {
  viewerPlayerId: string;
  sort: PublicTierListSort;
  filters?: PublicTierListBrowseFilters;
  limit?: number;
  offset?: number;
}): Promise<PublicTierListPage> => {
  const filters = params.filters ?? DEFAULT_PUBLIC_TIER_LIST_FILTERS;
  const limit = params.limit ?? 50;
  const offset = Math.max(0, params.offset ?? 0);

  try {
    const search = new URLSearchParams({
      sort: params.sort,
      viewerPlayerId: params.viewerPlayerId,
      limit: String(limit),
      offset: String(offset),
    });

    const query = filters.query.trim();
    if (query) {
      search.set("q", query);
    }
    if (filters.mineOnly) {
      search.set("mineOnly", "1");
    }
    if (filters.likedByMe) {
      search.set("likedByMe", "1");
    }
    if (filters.minLikes > 0) {
      search.set("minLikes", String(Math.floor(filters.minLikes)));
    }
    if (filters.dateWindow !== "all") {
      search.set("dateWindow", filters.dateWindow);
    }

    const response = await fetch(
      `${buildUrl("/api/tier-lists")}?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );

    if (response.ok) {
      const body = (await response.json()) as {
        lists?: PublicTierListSummary[];
        hasMore?: boolean;
        nextOffset?: number;
      };
      if (Array.isArray(body.lists)) {
        return {
          lists: body.lists,
          hasMore: Boolean(body.hasMore),
          nextOffset:
            typeof body.nextOffset === "number"
              ? body.nextOffset
              : offset + body.lists.length,
        };
      }
    }
  } catch {
    // Fall through to local catalog.
  }

  const catalog = loadLocalCatalog();
  const likedIds = new Set(catalog.likesByPlayer[params.viewerPlayerId] ?? []);
  const summaries = sortLists(
    catalog.lists
      .map((entry) => toSummary(entry, params.viewerPlayerId, likedIds))
      .filter((entry) =>
        matchesPublicTierListBrowseFilters(
          entry,
          filters,
          params.viewerPlayerId,
        ),
      ),
    params.sort,
  );
  const lists = summaries.slice(offset, offset + limit);

  return {
    lists,
    hasMore: offset + lists.length < summaries.length,
    nextOffset: offset + lists.length,
  };
};

/** Like counts keyed by published id — used to sort My lists. */
export const fetchPublishedLikeCounts = async (params: {
  viewerPlayerId: string;
}): Promise<Record<string, number>> => {
  const page = await fetchPublicTierLists({
    viewerPlayerId: params.viewerPlayerId,
    sort: "likes",
    filters: {
      ...DEFAULT_PUBLIC_TIER_LIST_FILTERS,
      mineOnly: true,
    },
    limit: 100,
  });

  const counts: Record<string, number> = {};
  for (const entry of page.lists) {
    counts[entry.id] = entry.likeCount;
  }
  return counts;
};

export const fetchPublicTierList = async (params: {
  id: string;
  viewerPlayerId: string;
}): Promise<PublicTierListDetail | null> => {
  try {
    const search = new URLSearchParams({
      id: params.id,
      viewerPlayerId: params.viewerPlayerId,
    });
    const response = await fetch(
      `${buildUrl("/api/tier-lists")}?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );

    if (response.ok) {
      const body = (await response.json()) as {
        list?: PublicTierListDetail;
      };
      if (body.list?.tiers) {
        return body.list;
      }
    }
  } catch {
    // Fall through.
  }

  const catalog = loadLocalCatalog();
  const entry = catalog.lists.find((list) => list.id === params.id);
  if (!entry) {
    return null;
  }

  const likedIds = new Set(catalog.likesByPlayer[params.viewerPlayerId] ?? []);
  return {
    ...toSummary(entry, params.viewerPlayerId, likedIds),
    tiers: entry.tiers,
  };
};

export const publishTierList = async (params: {
  state: TierListState;
  playerId: string;
  authorName: string;
  authorTag: string;
  publishedId?: string | null;
}): Promise<{ ok: true; id: string; updated: boolean } | { ok: false; error: string }> => {
  if (!(await isPlayerAccountLinked(params.playerId))) {
    return { ok: false, error: ACCOUNT_REQUIRED_TIER_PUBLISH_MESSAGE };
  }

  const title = displayTierListTitle(params.state.title);
  const payload = {
    id: params.publishedId ?? undefined,
    playerId: params.playerId,
    authorName: params.authorName,
    authorTag: params.authorTag,
    title,
    tiers: params.state.tiers,
  };

  try {
    const response = await fetch(buildUrl("/api/tier-lists"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const body = (await response.json()) as {
        id?: string;
        updated?: boolean;
      };
      if (body.id) {
        return { ok: true, id: body.id, updated: Boolean(body.updated) };
      }
    } else {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (body?.error) {
        return { ok: false, error: body.error };
      }
    }
  } catch {
    // Local fallback below for linked accounts when the API is offline.
  }

  const catalog = loadLocalCatalog();
  const now = new Date().toISOString();
  const updatingExisting =
    Boolean(params.publishedId) &&
    catalog.lists.some(
      (entry) =>
        entry.id === params.publishedId && entry.playerId === params.playerId,
    );
  const id = updatingExisting
    ? params.publishedId!
    : `local-pub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const nextEntry: PublicTierListDetail & { playerId: string } = {
    id,
    playerId: params.playerId,
    title,
    authorName: params.authorName,
    authorTag: params.authorTag,
    likeCount:
      catalog.lists.find((entry) => entry.id === id)?.likeCount ?? 0,
    likedByViewer: false,
    publishedAt:
      catalog.lists.find((entry) => entry.id === id)?.publishedAt ?? now,
    updatedAt: now,
    isOwner: true,
    tiers: params.state.tiers,
  };

  saveLocalCatalog({
    ...catalog,
    lists: [
      nextEntry,
      ...catalog.lists.filter((entry) => entry.id !== id),
    ],
  });

  return { ok: true, id, updated: updatingExisting };
};

export const unpublishTierList = async (params: {
  id: string;
  playerId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    const search = new URLSearchParams({
      id: params.id,
      playerId: params.playerId,
    });
    const response = await fetch(
      `${buildUrl("/api/tier-lists")}?${search.toString()}`,
      {
        method: "DELETE",
        headers: { accept: "application/json" },
      },
    );

    if (response.ok) {
      const catalog = loadLocalCatalog();
      const likesByPlayer = { ...catalog.likesByPlayer };
      for (const [playerId, liked] of Object.entries(likesByPlayer)) {
        likesByPlayer[playerId] = liked.filter((id) => id !== params.id);
      }
      saveLocalCatalog({
        ...catalog,
        lists: catalog.lists.filter((entry) => entry.id !== params.id),
        likesByPlayer,
        commentsByTierListId: Object.fromEntries(
          Object.entries(catalog.commentsByTierListId).filter(
            ([tierListId]) => tierListId !== params.id,
          ),
        ),
      });
      return { ok: true };
    }
  } catch {
    // Local fallback.
  }

  const catalog = loadLocalCatalog();
  const entry = catalog.lists.find((list) => list.id === params.id);
  if (!entry) {
    return { ok: false, error: "Tier list not found" };
  }
  if (entry.playerId !== params.playerId) {
    return { ok: false, error: "Not allowed to remove this tier list" };
  }

  const likesByPlayer = { ...catalog.likesByPlayer };
  for (const [playerId, liked] of Object.entries(likesByPlayer)) {
    likesByPlayer[playerId] = liked.filter((id) => id !== params.id);
  }

  saveLocalCatalog({
    lists: catalog.lists.filter((list) => list.id !== params.id),
    likesByPlayer,
    commentsByTierListId: Object.fromEntries(
      Object.entries(catalog.commentsByTierListId).filter(
        ([tierListId]) => tierListId !== params.id,
      ),
    ),
  });

  return { ok: true };
};

export const setTierListLike = async (params: {
  id: string;
  playerId: string;
  liked: boolean;
}): Promise<
  { ok: true; liked: boolean; likeCount: number } | { ok: false; error: string }
> => {
  if (!(await isPlayerAccountLinked(params.playerId))) {
    return { ok: false, error: ACCOUNT_REQUIRED_TIER_LIST_LIKE_MESSAGE };
  }

  try {
    if (params.liked) {
      const response = await fetch(
        buildUrl(`/api/tier-lists/${encodeURIComponent(params.id)}/like`),
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({ playerId: params.playerId }),
        },
      );

      if (response.ok) {
        const body = (await response.json()) as {
          liked?: boolean;
          likeCount?: number;
        };
        if (typeof body.likeCount === "number") {
          return {
            ok: true,
            liked: Boolean(body.liked),
            likeCount: body.likeCount,
          };
        }
      } else {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (body?.error) {
          return { ok: false, error: body.error };
        }
      }
    } else {
      const search = new URLSearchParams({ playerId: params.playerId });
      const response = await fetch(
        `${buildUrl(`/api/tier-lists/${encodeURIComponent(params.id)}/like`)}?${search.toString()}`,
        {
          method: "DELETE",
          headers: { accept: "application/json" },
        },
      );

      if (response.ok) {
        const body = (await response.json()) as {
          liked?: boolean;
          likeCount?: number;
        };
        if (typeof body.likeCount === "number") {
          return {
            ok: true,
            liked: Boolean(body.liked),
            likeCount: body.likeCount,
          };
        }
      } else {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (body?.error) {
          return { ok: false, error: body.error };
        }
      }
    }
  } catch {
    // Local fallback.
  }

  const catalog = loadLocalCatalog();
  const entryIndex = catalog.lists.findIndex((list) => list.id === params.id);
  if (entryIndex < 0) {
    return { ok: false, error: "Tier list not found" };
  }

  const liked = new Set(catalog.likesByPlayer[params.playerId] ?? []);
  const entry = catalog.lists[entryIndex]!;
  let likeCount = entry.likeCount;

  if (params.liked && !liked.has(params.id)) {
    liked.add(params.id);
    likeCount += 1;
  } else if (!params.liked && liked.has(params.id)) {
    liked.delete(params.id);
    likeCount = Math.max(0, likeCount - 1);
  }

  const lists = [...catalog.lists];
  lists[entryIndex] = { ...entry, likeCount };
  saveLocalCatalog({
    ...catalog,
    lists,
    likesByPlayer: {
      ...catalog.likesByPlayer,
      [params.playerId]: [...liked],
    },
  });

  return { ok: true, liked: params.liked, likeCount };
};

const normalizeTierListComment = (
  entry: Partial<TierListComment>,
): TierListComment | null => {
  if (
    !entry ||
    typeof entry.id !== "string" ||
    typeof entry.tierListId !== "string" ||
    typeof entry.playerId !== "string" ||
    typeof entry.authorName !== "string" ||
    typeof entry.authorTag !== "string" ||
    typeof entry.body !== "string" ||
    typeof entry.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: entry.id,
    tierListId: entry.tierListId,
    playerId: entry.playerId,
    authorName: entry.authorName,
    authorTag: entry.authorTag,
    body: entry.body,
    createdAt: entry.createdAt,
  };
};

export const listTierListComments = async (params: {
  id: string;
}): Promise<TierListComment[]> => {
  try {
    const response = await fetch(
      buildUrl(`/api/tier-lists/${encodeURIComponent(params.id)}/comments`),
      { headers: { accept: "application/json" } },
    );

    if (response.ok) {
      const body = (await response.json()) as {
        comments?: Partial<TierListComment>[];
      };
      if (Array.isArray(body.comments)) {
        return body.comments
          .map((entry) => normalizeTierListComment(entry))
          .filter((entry): entry is TierListComment => Boolean(entry));
      }
    }
  } catch {
    // Local fallback.
  }

  const catalog = loadLocalCatalog();
  return [...(catalog.commentsByTierListId[params.id] ?? [])];
};

export type CreateTierListCommentResult =
  | { ok: true; comment: TierListComment }
  | { ok: false; error: string };

export const createTierListComment = async (params: {
  id: string;
  playerId: string;
  authorName: string;
  authorTag: string;
  body: string;
}): Promise<CreateTierListCommentResult> => {
  const text = params.body.trim();
  if (!text) {
    return { ok: false, error: "Comment body is required." };
  }
  if (text.length > TIER_LIST_COMMENT_BODY_MAX) {
    return {
      ok: false,
      error: `Comments can be at most ${TIER_LIST_COMMENT_BODY_MAX} characters.`,
    };
  }

  if (!(await isPlayerAccountLinked(params.playerId))) {
    return { ok: false, error: ACCOUNT_REQUIRED_TIER_LIST_COMMENT_MESSAGE };
  }

  try {
    const response = await fetch(
      buildUrl(`/api/tier-lists/${encodeURIComponent(params.id)}/comments`),
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          playerId: params.playerId,
          authorName: params.authorName,
          authorTag: params.authorTag,
          body: text,
        }),
      },
    );

    if (response.ok) {
      const payload = (await response.json()) as {
        ok?: boolean;
        comment?: Partial<TierListComment>;
        error?: string;
      };
      const comment = normalizeTierListComment(payload.comment ?? {});
      if (comment) {
        return { ok: true, comment };
      }
    } else {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (payload?.error) {
        return { ok: false, error: payload.error };
      }
    }
  } catch {
    // Local fallback below for linked accounts when the API is offline.
  }

  const catalog = loadLocalCatalog();
  if (!catalog.lists.some((entry) => entry.id === params.id)) {
    return { ok: false, error: "Tier list not found" };
  }

  const now = new Date().toISOString();
  const comment: TierListComment = {
    id: `local-tlc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    tierListId: params.id,
    playerId: params.playerId,
    authorName: params.authorName.trim().slice(0, 32) || "GM",
    authorTag: params.authorTag.replace(/^#/, "").trim().toUpperCase().slice(0, 8) ||
      "0000",
    body: text,
    createdAt: now,
  };

  saveLocalCatalog({
    ...catalog,
    commentsByTierListId: {
      ...catalog.commentsByTierListId,
      [params.id]: [...(catalog.commentsByTierListId[params.id] ?? []), comment],
    },
  });

  return { ok: true, comment };
};

export type DeleteTierListCommentResult =
  | { ok: true; commentId: string }
  | { ok: false; error: string };

export const deleteTierListComment = async (params: {
  id: string;
  commentId: string;
  playerId: string;
}): Promise<DeleteTierListCommentResult> => {
  if (!(await isPlayerAccountLinked(params.playerId))) {
    return { ok: false, error: ACCOUNT_REQUIRED_TIER_LIST_COMMENT_DELETE_MESSAGE };
  }

  try {
    const response = await fetch(
      buildUrl(`/api/tier-lists/${encodeURIComponent(params.id)}/comments`),
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          playerId: params.playerId,
          commentId: params.commentId,
        }),
      },
    );

    if (response.ok) {
      const catalog = loadLocalCatalog();
      const existing = catalog.commentsByTierListId[params.id] ?? [];
      saveLocalCatalog({
        ...catalog,
        commentsByTierListId: {
          ...catalog.commentsByTierListId,
          [params.id]: existing.filter(
            (comment) => comment.id !== params.commentId,
          ),
        },
      });
      return { ok: true, commentId: params.commentId };
    }

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (payload?.error) {
      return { ok: false, error: payload.error };
    }
  } catch {
    // Local fallback below.
  }

  const catalog = loadLocalCatalog();
  const existing = catalog.commentsByTierListId[params.id] ?? [];
  const target = existing.find((comment) => comment.id === params.commentId);
  if (!target) {
    return { ok: false, error: "Comment not found" };
  }
  if (target.playerId !== params.playerId) {
    return { ok: false, error: "You can only delete your own comments." };
  }

  saveLocalCatalog({
    ...catalog,
    commentsByTierListId: {
      ...catalog.commentsByTierListId,
      [params.id]: existing.filter((comment) => comment.id !== params.commentId),
    },
  });

  return { ok: true, commentId: params.commentId };
};
