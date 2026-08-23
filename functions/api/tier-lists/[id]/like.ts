import type { Env } from "../../../types";
import { requireLinkedAccountSession } from "../../../lib/accountSessions";
import { syncTierListLikeCount } from "../../../lib/likeCounts";

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

  const requestedPlayerId = parsePlayerId(body.playerId);
  if (!requestedPlayerId) {
    return json({ error: "playerId is required" }, 400);
  }

  const auth = await requireLinkedAccountSession(
    context.request,
    context.env.DB,
    requestedPlayerId,
  );
  if (!auth.ok) {
    return auth.response;
  }
  const { playerId } = auth;

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

  const likeCount = await syncTierListLikeCount(
    context.env.DB,
    tierListId,
    now,
  );

  return json({
    ok: true,
    liked: true,
    likeCount,
  });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const tierListId = parseTierListId(context.params.id);
  const url = new URL(context.request.url);
  const requestedPlayerId = parsePlayerId(url.searchParams.get("playerId"));

  if (!tierListId || !requestedPlayerId) {
    return json({ error: "id and playerId are required" }, 400);
  }

  const auth = await requireLinkedAccountSession(
    context.request,
    context.env.DB,
    requestedPlayerId,
  );
  if (!auth.ok) {
    return auth.response;
  }
  const { playerId } = auth;

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

  const likeCount = await syncTierListLikeCount(
    context.env.DB,
    tierListId,
    now,
  );

  return json({ ok: true, liked: false, likeCount });
};
