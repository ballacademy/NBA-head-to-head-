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

const BODY_MAX = 400;
const AUTHOR_NAME_MAX = 32;
const AUTHOR_TAG_MAX = 8;
const LIST_LIMIT = 50;

interface CreateBody {
  playerId?: unknown;
  authorName?: unknown;
  authorTag?: unknown;
  body?: unknown;
}

const mapRow = (row: {
  id: string;
  player_id: string;
  author_name: string;
  author_tag: string;
  body: string;
  created_at: string;
}) => ({
  id: row.id,
  playerId: row.player_id,
  authorName: row.author_name,
  authorTag: row.author_tag,
  body: row.body,
  createdAt: row.created_at,
});

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? LIST_LIMIT);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(LIST_LIMIT, Math.floor(rawLimit)))
    : LIST_LIMIT;

  const rows = await context.env.DB.prepare(
    `SELECT id, player_id, author_name, author_tag, body, created_at
     FROM community_posts
     ORDER BY created_at DESC
     LIMIT ?`,
  )
    .bind(limit)
    .all<{
      id: string;
      player_id: string;
      author_name: string;
      author_tag: string;
      body: string;
      created_at: string;
    }>();

  const posts = (rows.results ?? []).map(mapRow);
  return json({ posts });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: CreateBody;
  try {
    body = (await context.request.json()) as CreateBody;
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
      { error: "Create an account to post in Community." },
      403,
    );
  }

  const text =
    typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return json({ error: "Post body is required" }, 400);
  }
  if (text.length > BODY_MAX) {
    return json(
      { error: `Posts can be at most ${BODY_MAX} characters` },
      400,
    );
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
  const id = `cpost-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;

  await context.env.DB.prepare(
    `INSERT INTO community_posts
      (id, player_id, author_name, author_tag, body, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, playerId, authorName, authorTag, text, now)
    .run();

  return json(
    {
      ok: true,
      post: {
        id,
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
