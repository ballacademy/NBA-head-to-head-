import type { Env } from "../../../types";
import { getAccountByPlayerId } from "../../../lib/playerAccounts";

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

interface LikeBody {
  playerId?: unknown;
}

const parseTierListId = (id: string | string[] | undefined) =>
  typeof id === "string"
    ? id.trim().slice(0, 64)
    : Array.isArray(id)
      ? String(id[0] ?? "")
          .trim()
          .slice(0, 64)
      : "";

const recountLikes = async (db: D1Database, tierListId: string) => {
  const countRow = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM tier_list_likes
       WHERE tier_list_id = ?`,
    )
    .bind(tierListId)
    .first<{ count: number }>();
  return Math.max(0, Math.round(Number(countRow?.count ?? 0)) || 0);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const tierListId = parseTierListId(context.params.id);

  if (!tierListId) {
    return json({ error: "tier list id is required" }, 400);
  }

  let body: LikeBody;
  try {
    body = (await context.request.json()) as LikeBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const playerId = parsePlayerId(body.playerId);
  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  const account = await getAccountByPlayerId(context.env.DB, playerId);
  if (!account) {
    return json({ error: "Create an account to like tier lists." }, 403);
  }

  const existing = await context.env.DB.prepare(
    `SELECT id FROM published_tier_lists WHERE id = ?`,
  )
    .bind(tierListId)
    .first<{ id: string }>();

  if (!existing) {
    return json({ error: "Tier list not found" }, 404);
  }

  const now = new Date().toISOString();
  await context.env.DB.prepare(
    `INSERT OR IGNORE INTO tier_list_likes (tier_list_id, player_id, created_at)
     VALUES (?, ?, ?)`,
  )
    .bind(tierListId, playerId, now)
    .run();

  const likeCount = await recountLikes(context.env.DB, tierListId);
  await context.env.DB.prepare(
    `UPDATE published_tier_lists
     SET like_count = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(likeCount, now, tierListId)
    .run();

  return json({
    ok: true,
    liked: true,
    likeCount,
  });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const tierListId = parseTierListId(context.params.id);
  const url = new URL(context.request.url);
  const playerId = parsePlayerId(url.searchParams.get("playerId"));

  if (!tierListId || !playerId) {
    return json({ error: "id and playerId are required" }, 400);
  }

  const account = await getAccountByPlayerId(context.env.DB, playerId);
  if (!account) {
    return json({ error: "Create an account to like tier lists." }, 403);
  }

  const existing = await context.env.DB.prepare(
    `SELECT id FROM published_tier_lists WHERE id = ?`,
  )
    .bind(tierListId)
    .first<{ id: string }>();

  if (!existing) {
    return json({ error: "Tier list not found" }, 404);
  }

  const now = new Date().toISOString();
  await context.env.DB.prepare(
    `DELETE FROM tier_list_likes
     WHERE tier_list_id = ? AND player_id = ?`,
  )
    .bind(tierListId, playerId)
    .run();

  const likeCount = await recountLikes(context.env.DB, tierListId);
  await context.env.DB.prepare(
    `UPDATE published_tier_lists
     SET like_count = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(likeCount, now, tierListId)
    .run();

  return json({ ok: true, liked: false, likeCount });
};
