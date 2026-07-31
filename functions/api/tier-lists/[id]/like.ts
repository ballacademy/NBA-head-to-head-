import type { Env } from "../../types";

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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = context.params.id;
  const tierListId =
    typeof id === "string" ? id.trim().slice(0, 64) : Array.isArray(id) ? id[0] : "";

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

  const existing = await context.env.DB.prepare(
    `SELECT id, like_count FROM published_tier_lists WHERE id = ?`,
  )
    .bind(tierListId)
    .first<{ id: string; like_count: number }>();

  if (!existing) {
    return json({ error: "Tier list not found" }, 404);
  }

  const already = await context.env.DB.prepare(
    `SELECT tier_list_id FROM tier_list_likes
     WHERE tier_list_id = ? AND player_id = ?`,
  )
    .bind(tierListId, playerId)
    .first();

  if (already) {
    return json({ ok: true, liked: true, likeCount: existing.like_count });
  }

  const now = new Date().toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO tier_list_likes (tier_list_id, player_id, created_at)
       VALUES (?, ?, ?)`,
    ).bind(tierListId, playerId, now),
    context.env.DB.prepare(
      `UPDATE published_tier_lists
       SET like_count = like_count + 1, updated_at = ?
       WHERE id = ?`,
    ).bind(now, tierListId),
  ]);

  return json({
    ok: true,
    liked: true,
    likeCount: existing.like_count + 1,
  });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = context.params.id;
  const tierListId =
    typeof id === "string" ? id.trim().slice(0, 64) : Array.isArray(id) ? id[0] : "";
  const url = new URL(context.request.url);
  const playerId = parsePlayerId(url.searchParams.get("playerId"));

  if (!tierListId || !playerId) {
    return json({ error: "id and playerId are required" }, 400);
  }

  const existing = await context.env.DB.prepare(
    `SELECT id, like_count FROM published_tier_lists WHERE id = ?`,
  )
    .bind(tierListId)
    .first<{ id: string; like_count: number }>();

  if (!existing) {
    return json({ error: "Tier list not found" }, 404);
  }

  const already = await context.env.DB.prepare(
    `SELECT tier_list_id FROM tier_list_likes
     WHERE tier_list_id = ? AND player_id = ?`,
  )
    .bind(tierListId, playerId)
    .first();

  if (!already) {
    return json({ ok: true, liked: false, likeCount: existing.like_count });
  }

  const now = new Date().toISOString();
  const nextCount = Math.max(0, existing.like_count - 1);
  await context.env.DB.batch([
    context.env.DB.prepare(
      `DELETE FROM tier_list_likes
       WHERE tier_list_id = ? AND player_id = ?`,
    ).bind(tierListId, playerId),
    context.env.DB.prepare(
      `UPDATE published_tier_lists
       SET like_count = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(nextCount, now, tierListId),
  ]);

  return json({ ok: true, liked: false, likeCount: nextCount });
};
