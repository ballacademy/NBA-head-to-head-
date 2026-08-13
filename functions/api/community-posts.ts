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
/** Compact attachment metadata only (ids/names) — images are rebuilt client-side. */
const ATTACHMENT_JSON_MAX = 8_000;

interface CreateBody {
  playerId?: unknown;
  authorName?: unknown;
  authorTag?: unknown;
  body?: unknown;
  attachment?: unknown;
}

interface LikeBody {
  playerId?: unknown;
  postId?: unknown;
  liked?: unknown;
}

interface DeleteBody {
  playerId?: unknown;
  postId?: unknown;
}

const parseAttachmentJson = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }
  if (typeof value !== "object") {
    return null;
  }
  try {
    const encoded = JSON.stringify(value);
    if (encoded.length > ATTACHMENT_JSON_MAX) {
      return null;
    }
    return encoded;
  } catch {
    return null;
  }
};

const mapRow = (
  row: {
    id: string;
    player_id: string;
    author_name: string;
    author_tag: string;
    body: string;
    created_at: string;
    like_count?: number | null;
    attachment_json?: string | null;
  },
  likedByViewer = false,
) => {
  let attachment: unknown = null;
  if (row.attachment_json) {
    try {
      attachment = JSON.parse(row.attachment_json);
    } catch {
      attachment = null;
    }
  }

  return {
    id: row.id,
    playerId: row.player_id,
    authorName: row.author_name,
    authorTag: row.author_tag,
    body: row.body,
    createdAt: row.created_at,
    likeCount: Math.max(0, Math.round(Number(row.like_count ?? 0)) || 0),
    likedByViewer,
    attachment,
  };
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? LIST_LIMIT);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(LIST_LIMIT, Math.floor(rawLimit)))
    : LIST_LIMIT;
  const rawOffset = Number(url.searchParams.get("offset") ?? 0);
  const offset = Number.isFinite(rawOffset)
    ? Math.max(0, Math.floor(rawOffset))
    : 0;
  const sort =
    url.searchParams.get("sort") === "popular" ? "popular" : "recent";
  const viewerPlayerId = parsePlayerId(url.searchParams.get("playerId"));

  const orderSql =
    sort === "popular"
      ? "like_count DESC, created_at DESC"
      : "created_at DESC";

  const rows = await context.env.DB.prepare(
    `SELECT id, player_id, author_name, author_tag, body, created_at,
            like_count, attachment_json
     FROM community_posts
     ORDER BY ${orderSql}
     LIMIT ? OFFSET ?`,
  )
    .bind(limit + 1, offset)
    .all<{
      id: string;
      player_id: string;
      author_name: string;
      author_tag: string;
      body: string;
      created_at: string;
      like_count: number | null;
      attachment_json: string | null;
    }>();

  const results = rows.results ?? [];
  const hasMore = results.length > limit;
  const pageRows = hasMore ? results.slice(0, limit) : results;
  let likedIds = new Set<string>();

  if (viewerPlayerId && pageRows.length > 0) {
    const placeholders = pageRows.map(() => "?").join(", ");
    const likedRows = await context.env.DB.prepare(
      `SELECT post_id
       FROM community_post_likes
       WHERE player_id = ?
         AND post_id IN (${placeholders})`,
    )
      .bind(viewerPlayerId, ...pageRows.map((row) => row.id))
      .all<{ post_id: string }>();
    likedIds = new Set((likedRows.results ?? []).map((row) => row.post_id));
  }

  const posts = pageRows.map((row) => mapRow(row, likedIds.has(row.id)));
  return json({
    posts,
    sort,
    hasMore,
    nextOffset: offset + pageRows.length,
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: CreateBody & LikeBody & DeleteBody & { action?: unknown };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (body.action === "delete") {
    const playerId = parsePlayerId(body.playerId);
    const postId =
      typeof body.postId === "string" && body.postId.trim()
        ? body.postId.trim().slice(0, 80)
        : "";

    if (!playerId || !postId) {
      return json({ error: "playerId and postId are required" }, 400);
    }

    const account = await getAccountByPlayerId(context.env.DB, playerId);
    if (!account) {
      return json({ error: "Create an account to delete posts." }, 403);
    }

    const existing = await context.env.DB.prepare(
      `SELECT id, player_id FROM community_posts WHERE id = ?`,
    )
      .bind(postId)
      .first<{ id: string; player_id: string }>();

    if (!existing) {
      return json({ error: "Post not found" }, 404);
    }

    if (existing.player_id !== playerId) {
      return json({ error: "You can only delete your own posts." }, 403);
    }

    await context.env.DB.prepare(
      `DELETE FROM community_post_likes WHERE post_id = ?`,
    )
      .bind(postId)
      .run();

    await context.env.DB.prepare(`DELETE FROM community_posts WHERE id = ?`)
      .bind(postId)
      .run();

    return json({ ok: true, postId });
  }

  if (body.action === "like") {
    const playerId = parsePlayerId(body.playerId);
    const postId =
      typeof body.postId === "string" && body.postId.trim()
        ? body.postId.trim().slice(0, 80)
        : "";
    const liked = body.liked === true;

    if (!playerId || !postId) {
      return json({ error: "playerId and postId are required" }, 400);
    }

    const account = await getAccountByPlayerId(context.env.DB, playerId);
    if (!account) {
      return json({ error: "Create an account to like posts." }, 403);
    }

    const existing = await context.env.DB.prepare(
      `SELECT id FROM community_posts WHERE id = ?`,
    )
      .bind(postId)
      .first<{ id: string }>();

    if (!existing) {
      return json({ error: "Post not found" }, 404);
    }

    const now = new Date().toISOString();

    if (liked) {
      await context.env.DB.prepare(
        `INSERT OR IGNORE INTO community_post_likes (post_id, player_id, created_at)
         VALUES (?, ?, ?)`,
      )
        .bind(postId, playerId, now)
        .run();
    } else {
      await context.env.DB.prepare(
        `DELETE FROM community_post_likes
         WHERE post_id = ? AND player_id = ?`,
      )
        .bind(postId, playerId)
        .run();
    }

    const countRow = await context.env.DB.prepare(
      `SELECT COUNT(*) AS count
       FROM community_post_likes
       WHERE post_id = ?`,
    )
      .bind(postId)
      .first<{ count: number }>();
    const likeCount = Math.max(0, Math.round(Number(countRow?.count ?? 0)));

    await context.env.DB.prepare(
      `UPDATE community_posts SET like_count = ? WHERE id = ?`,
    )
      .bind(likeCount, postId)
      .run();

    return json({ ok: true, postId, liked, likeCount });
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

  const attachmentJson = parseAttachmentJson(body.attachment);
  if (body.attachment != null && attachmentJson == null) {
    return json({ error: "Attachment is too large or invalid" }, 400);
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
      (id, player_id, author_name, author_tag, body, created_at, like_count, attachment_json)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
  )
    .bind(id, playerId, authorName, authorTag, text, now, attachmentJson)
    .run();

  let attachment: unknown = null;
  if (attachmentJson) {
    try {
      attachment = JSON.parse(attachmentJson);
    } catch {
      attachment = null;
    }
  }

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
        likeCount: 0,
        likedByViewer: false,
        attachment,
      },
    },
    201,
  );
};
