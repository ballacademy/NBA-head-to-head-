import type { Env } from "../types";
import { getAccountByPlayerId } from "../lib/playerAccounts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const parsePlayerId = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 128)
    : "";

const parseSort = (value: string | null) =>
  value === "likes" || value === "recent" ? value : "recent";

const TITLE_MAX = 48;
const AUTHOR_NAME_MAX = 32;
const AUTHOR_TAG_MAX = 8;
const TIERS_JSON_MAX = 40_000;

interface TierRowInput {
  id?: unknown;
  name?: unknown;
  playerIds?: unknown;
}

const normalizeTiersJson = (tiers: unknown): string | null => {
  if (!Array.isArray(tiers) || tiers.length === 0 || tiers.length > 16) {
    return null;
  }

  const normalized = tiers.map((tier, index) => {
    const row = tier as TierRowInput;
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim().slice(0, 64)
        : `tier-${index}`;
    const name =
      typeof row.name === "string" && row.name.trim()
        ? row.name.trim().slice(0, 12)
        : `Tier ${index + 1}`;
    const playerIds = Array.isArray(row.playerIds)
      ? row.playerIds
          .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
          .map((id) => id.trim().slice(0, 64))
          .slice(0, 80)
      : [];

    return { id, name, playerIds };
  });

  const encoded = JSON.stringify(normalized);
  if (encoded.length > TIERS_JSON_MAX) {
    return null;
  }

  return encoded;
};

interface PublishBody {
  playerId?: unknown;
  authorName?: unknown;
  authorTag?: unknown;
  title?: unknown;
  tiers?: unknown;
  id?: unknown;
}

const mapRow = (
  row: {
    id: string;
    player_id: string;
    author_name: string;
    author_tag: string;
    title: string;
    tiers_json: string;
    like_count: number;
    created_at: string;
    updated_at: string;
  },
  viewerPlayerId: string,
  likedIds: Set<string>,
  includeTiers: boolean,
) => {
  let tiers: unknown = undefined;
  if (includeTiers) {
    try {
      tiers = JSON.parse(row.tiers_json);
    } catch {
      tiers = [];
    }
  }

  return {
    id: row.id,
    title: row.title,
    authorName: row.author_name,
    authorTag: row.author_tag,
    likeCount: row.like_count,
    likedByViewer: likedIds.has(row.id),
    publishedAt: row.created_at,
    updatedAt: row.updated_at,
    isOwner: viewerPlayerId !== "" && row.player_id === viewerPlayerId,
    ...(includeTiers ? { tiers } : {}),
  };
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const viewerPlayerId = parsePlayerId(url.searchParams.get("viewerPlayerId"));
  const id = parsePlayerId(url.searchParams.get("id"));
  const sort = parseSort(url.searchParams.get("sort"));
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 50), 1),
    100,
  );

  const likedIds = new Set<string>();
  if (viewerPlayerId) {
    const likedRows = await context.env.DB.prepare(
      `SELECT tier_list_id AS tier_list_id
       FROM tier_list_likes
       WHERE player_id = ?`,
    )
      .bind(viewerPlayerId)
      .all<{ tier_list_id: string }>();

    for (const row of likedRows.results ?? []) {
      likedIds.add(row.tier_list_id);
    }
  }

  if (id) {
    const row = await context.env.DB.prepare(
      `SELECT id, player_id, author_name, author_tag, title, tiers_json,
              like_count, created_at, updated_at
       FROM published_tier_lists
       WHERE id = ?`,
    )
      .bind(id)
      .first<{
        id: string;
        player_id: string;
        author_name: string;
        author_tag: string;
        title: string;
        tiers_json: string;
        like_count: number;
        created_at: string;
        updated_at: string;
      }>();

    if (!row) {
      return json({ error: "Tier list not found" }, 404);
    }

    return json({
      list: mapRow(row, viewerPlayerId, likedIds, true),
    });
  }

  const orderClause =
    sort === "likes"
      ? "like_count DESC, created_at DESC"
      : "created_at DESC";

  const rows = await context.env.DB.prepare(
    `SELECT id, player_id, author_name, author_tag, title, tiers_json,
            like_count, created_at, updated_at
     FROM published_tier_lists
     ORDER BY ${orderClause}
     LIMIT ?`,
  )
    .bind(limit)
    .all<{
      id: string;
      player_id: string;
      author_name: string;
      author_tag: string;
      title: string;
      tiers_json: string;
      like_count: number;
      created_at: string;
      updated_at: string;
    }>();

  return json({
    sort,
    lists: (rows.results ?? []).map((row) =>
      mapRow(row, viewerPlayerId, likedIds, false),
    ),
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: PublishBody;
  try {
    body = (await context.request.json()) as PublishBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const playerId = parsePlayerId(body.playerId);
  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  const account = await getAccountByPlayerId(context.env.DB, playerId);
  if (!account) {
    return json(
      { error: "Create an account to publish tier lists." },
      403,
    );
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, TITLE_MAX)
      : "Untitled tier list";
  const authorName =
    typeof body.authorName === "string" && body.authorName.trim()
      ? body.authorName.trim().slice(0, AUTHOR_NAME_MAX)
      : "GM";
  const authorTag =
    typeof body.authorTag === "string" && body.authorTag.trim()
      ? body.authorTag.replace(/^#/, "").trim().toUpperCase().slice(0, AUTHOR_TAG_MAX)
      : "0000";
  const tiersJson = normalizeTiersJson(body.tiers);
  if (!tiersJson) {
    return json({ error: "tiers payload is invalid" }, 400);
  }

  const now = new Date().toISOString();
  const existingId =
    typeof body.id === "string" && body.id.trim()
      ? body.id.trim().slice(0, 64)
      : "";

  if (existingId) {
    const existing = await context.env.DB.prepare(
      `SELECT id, player_id FROM published_tier_lists WHERE id = ?`,
    )
      .bind(existingId)
      .first<{ id: string; player_id: string }>();

    if (!existing) {
      return json({ error: "Tier list not found" }, 404);
    }

    if (existing.player_id !== playerId) {
      return json({ error: "Not allowed to update this tier list" }, 403);
    }

    await context.env.DB.prepare(
      `UPDATE published_tier_lists
       SET author_name = ?, author_tag = ?, title = ?, tiers_json = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(authorName, authorTag, title, tiersJson, now, existingId)
      .run();

    return json({ ok: true, id: existingId, publishedAt: now, updated: true });
  }

  const id = `pub-tier-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;

  await context.env.DB.prepare(
    `INSERT INTO published_tier_lists
      (id, player_id, author_name, author_tag, title, tiers_json, like_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  )
    .bind(id, playerId, authorName, authorTag, title, tiersJson, now, now)
    .run();

  return json({ ok: true, id, publishedAt: now, updated: false }, 201);
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const id = parsePlayerId(url.searchParams.get("id"));
  const playerId = parsePlayerId(url.searchParams.get("playerId"));

  if (!id || !playerId) {
    return json({ error: "id and playerId are required" }, 400);
  }

  const existing = await context.env.DB.prepare(
    `SELECT id, player_id FROM published_tier_lists WHERE id = ?`,
  )
    .bind(id)
    .first<{ id: string; player_id: string }>();

  if (!existing) {
    return json({ error: "Tier list not found" }, 404);
  }

  if (existing.player_id !== playerId) {
    return json({ error: "Not allowed to delete this tier list" }, 403);
  }

  await context.env.DB.prepare(`DELETE FROM tier_list_likes WHERE tier_list_id = ?`)
    .bind(id)
    .run();
  await context.env.DB.prepare(`DELETE FROM published_tier_lists WHERE id = ?`)
    .bind(id)
    .run();

  return json({ ok: true });
};
