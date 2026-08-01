import { readJson, writeJson } from "./browserStorage";
import {
  ACCOUNT_REQUIRED_TIER_PUBLISH_MESSAGE,
  isPlayerAccountLinked,
} from "./accountGate";
import type { TierListRow, TierListState } from "./tierList";
import { displayTierListTitle } from "./tierList";

export type PublicTierListSort = "recent" | "likes";

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

interface LocalPublicCatalog {
  lists: Array<PublicTierListDetail & { playerId: string }>;
  likesByPlayer: Record<string, string[]>;
}

const LOCAL_PUBLIC_KEY = "nba-head-to-head-tier-list-public";
const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

const emptyCatalog = (): LocalPublicCatalog => ({
  lists: [],
  likesByPlayer: {},
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
  };
};

const saveLocalCatalog = (catalog: LocalPublicCatalog) => {
  writeJson(LOCAL_PUBLIC_KEY, catalog);
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

export const fetchPublicTierLists = async (params: {
  viewerPlayerId: string;
  sort: PublicTierListSort;
}): Promise<PublicTierListSummary[]> => {
  try {
    const search = new URLSearchParams({
      sort: params.sort,
      viewerPlayerId: params.viewerPlayerId,
      limit: "50",
    });
    const response = await fetch(
      `${buildUrl("/api/tier-lists")}?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );

    if (response.ok) {
      const body = (await response.json()) as {
        lists?: PublicTierListSummary[];
      };
      if (Array.isArray(body.lists)) {
        return body.lists;
      }
    }
  } catch {
    // Fall through to local catalog.
  }

  const catalog = loadLocalCatalog();
  const likedIds = new Set(catalog.likesByPlayer[params.viewerPlayerId] ?? []);
  return sortLists(
    catalog.lists.map((entry) =>
      toSummary(entry, params.viewerPlayerId, likedIds),
    ),
    params.sort,
  );
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
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
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
      const body = (await response.json()) as { id?: string };
      if (body.id) {
        return { ok: true, id: body.id };
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
  const id =
    params.publishedId &&
    catalog.lists.some(
      (entry) =>
        entry.id === params.publishedId && entry.playerId === params.playerId,
    )
      ? params.publishedId
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

  return { ok: true, id };
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
      saveLocalCatalog({
        ...catalog,
        lists: catalog.lists.filter((entry) => entry.id !== params.id),
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
    lists,
    likesByPlayer: {
      ...catalog.likesByPlayer,
      [params.playerId]: [...liked],
    },
  });

  return { ok: true, liked: params.liked, likeCount };
};
