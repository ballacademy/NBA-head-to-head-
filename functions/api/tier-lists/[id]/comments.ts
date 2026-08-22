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

const COMMENT_BODY_MAX = 280;
const AUTHOR_NAME_MAX = 32;
const AUTHOR_TAG_MAX = 8;
const LIST_LIMIT = 80;

interface CommentBody {
  playerId?: unknown;
  authorName?: unknown;
  authorTag?: unknown;
  body?: unknown;
}

const parseTierListId = (id: string | string[] | undefined) =>
  typeof id === "string"
    ? id.trim().slice(0, 64)
    : Array.isArray(id)
      ? String(id[0] ?? "")
          .trim()
          .slice(0, 64)
      : "";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const tierListId = parseTierListId(context.params.id);
  if (!tierListId) {
    return json({ error: "tier list id is required" }, 400);
  }

  const existing = await context.env.DB.prepare(
    `SELECT id FROM published_tier_lists WHERE id = ?`,
  )
    .bind(tierListId)
    .first<{ id: string }>();

  if (!existing) {
    return json({ error: "Tier list not found" }, 404);
  }

  const rows = await context.env.DB.prepare(
    `SELECT id, tier_list_id, player_id, author_name, author_tag, body, created_at
     FROM tier_list_comments
     WHERE tier_list_id = ?
     ORDER BY created_at ASC
     LIMIT ?`,
  )
    .bind(tierListId, LIST_LIMIT)
    .all<{
      id: string;
      tier_list_id: string;
      player_id: string;
      author_name: string;
      author_tag: string;
      body: string;
      created_at: string;
    }>();

  const comments = (rows.results ?? []).map((row) => ({
    id: row.id,
    tierListId: row.tier_list_id,
    playerId: row.player_id,
    authorName: row.author_name,
    authorTag: row.author_tag,
    body: row.body,
    createdAt: row.created_at,
  }));

  return json({ comments });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const tierListId = parseTierListId(context.params.id);
  if (!tierListId) {
    return json({ error: "tier list id is required" }, 400);
  }

  let body: CommentBody;
  try {
    body = (await context.request.json()) as CommentBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const playerId = parsePlayerId(body.playerId);
  const text = typeof body.body === "string" ? body.body.trim() : "";

  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }
  if (!text) {
    return json({ error: "Comment body is required" }, 400);
  }
  if (text.length > COMMENT_BODY_MAX) {
    return json(
      { error: `Comments can be at most ${COMMENT_BODY_MAX} characters` },
      400,
    );
  }

  const account = await getAccountByPlayerId(context.env.DB, playerId);
  if (!account) {
    return json({ error: "Create an account to comment on tier lists." }, 403);
  }

  const existing = await context.env.DB.prepare(
    `SELECT id FROM published_tier_lists WHERE id = ?`,
  )
    .bind(tierListId)
    .first<{ id: string }>();

  if (!existing) {
    return json({ error: "Tier list not found" }, 404);
  }

  const authorName =
    typeof body.authorName === "string" && body.authorName.trim()
      ? body.authorName.trim().slice(0, AUTHOR_NAME_MAX)
      : account.username.slice(0, AUTHOR_NAME_MAX);
  const authorTag =
    typeof body.authorTag === "string" && body.authorTag.trim()
      ? body.authorTag.replace(/^#/, "").trim().toUpperCase().slice(0, AUTHOR_TAG_MAX)
      : "0000";

  const now = new Date().toISOString();
  const id = `tlc-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;

  await context.env.DB.prepare(
    `INSERT INTO tier_list_comments
      (id, tier_list_id, player_id, author_name, author_tag, body, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, tierListId, playerId, authorName, authorTag, text, now)
    .run();

  return json(
    {
      ok: true,
      comment: {
        id,
        tierListId,
        playerId,
        authorName,
        authorTag,
        body: text,
        createdAt: now,
      },
    },
    201,
  );
};
