import type { Env } from "../../../types";
import { requireLinkedAccountSession } from "../../../lib/accountSessions";
import { resolveCommunityAuthorFields } from "../../../lib/communityAuthor";

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
const LIST_LIMIT = 80;

interface CommentBody {
  playerId?: unknown;
  authorName?: unknown;
  authorTag?: unknown;
  body?: unknown;
  action?: unknown;
  commentId?: unknown;
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

  const url = new URL(context.request.url);
  const beforeCreatedAt =
    url.searchParams.get("beforeCreatedAt")?.trim().slice(0, 40) ?? "";
  const beforeId = url.searchParams.get("beforeId")?.trim().slice(0, 80) ?? "";
  const useCursor = Boolean(beforeCreatedAt && beforeId);

  const countRow = await context.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM tier_list_comments WHERE tier_list_id = ?`,
  )
    .bind(tierListId)
    .first<{ total: number }>();
  const totalCount = Math.max(0, Math.round(Number(countRow?.total ?? 0)));

  const fetchLimit = LIST_LIMIT + 1;
  const rows = useCursor
    ? await context.env.DB.prepare(
        `SELECT id, tier_list_id, player_id, author_name, author_tag, body, created_at
         FROM (
           SELECT id, tier_list_id, player_id, author_name, author_tag, body, created_at
           FROM tier_list_comments
           WHERE tier_list_id = ?
             AND (created_at < ? OR (created_at = ? AND id < ?))
           ORDER BY created_at DESC, id DESC
           LIMIT ?
         )
         ORDER BY created_at ASC, id ASC`,
      )
        .bind(tierListId, beforeCreatedAt, beforeCreatedAt, beforeId, fetchLimit)
        .all<{
          id: string;
          tier_list_id: string;
          player_id: string;
          author_name: string;
          author_tag: string;
          body: string;
          created_at: string;
        }>()
    : await context.env.DB.prepare(
        `SELECT id, tier_list_id, player_id, author_name, author_tag, body, created_at
         FROM (
           SELECT id, tier_list_id, player_id, author_name, author_tag, body, created_at
           FROM tier_list_comments
           WHERE tier_list_id = ?
           ORDER BY created_at DESC, id DESC
           LIMIT ?
         )
         ORDER BY created_at ASC, id ASC`,
      )
        .bind(tierListId, fetchLimit)
        .all<{
          id: string;
          tier_list_id: string;
          player_id: string;
          author_name: string;
          author_tag: string;
          body: string;
          created_at: string;
        }>();

  const rawComments = rows.results ?? [];
  const hasMore = rawComments.length > LIST_LIMIT;
  const pageRows = hasMore ? rawComments.slice(0, LIST_LIMIT) : rawComments;
  const comments = pageRows.map((row) => ({
    id: row.id,
    tierListId: row.tier_list_id,
    playerId: row.player_id,
    authorName: row.author_name,
    authorTag: row.author_tag,
    body: row.body,
    createdAt: row.created_at,
  }));
  const oldest = comments[0];

  return json({
    comments,
    totalCount,
    hasMore: useCursor ? hasMore : totalCount > comments.length,
    limit: LIST_LIMIT,
    nextCursor:
      hasMore && oldest
        ? { beforeCreatedAt: oldest.createdAt, beforeId: oldest.id }
        : null,
  });
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
  const { account, playerId } = auth;

  if (body.action === "delete") {
    const commentId =
      typeof body.commentId === "string" && body.commentId.trim()
        ? body.commentId.trim().slice(0, 80)
        : "";
    if (!commentId) {
      return json({ error: "commentId is required" }, 400);
    }

    const existingComment = await context.env.DB.prepare(
      `SELECT id, player_id FROM tier_list_comments
       WHERE id = ? AND tier_list_id = ?`,
    )
      .bind(commentId, tierListId)
      .first<{ id: string; player_id: string }>();

    if (!existingComment) {
      return json({ error: "Comment not found" }, 404);
    }

    if (existingComment.player_id !== playerId) {
      return json({ error: "You can only delete your own comments." }, 403);
    }

    await context.env.DB.prepare(
      `DELETE FROM tier_list_comments WHERE id = ? AND tier_list_id = ?`,
    )
      .bind(commentId, tierListId)
      .run();

    return json({ ok: true, commentId });
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return json({ error: "Comment body is required" }, 400);
  }

  if (text.length > COMMENT_BODY_MAX) {
    return json(
      { error: `Comments can be at most ${COMMENT_BODY_MAX} characters` },
      400,
    );
  }

  const existing = await context.env.DB.prepare(
    `SELECT id FROM published_tier_lists WHERE id = ?`,
  )
    .bind(tierListId)
    .first<{ id: string }>();

  if (!existing) {
    return json({ error: "Tier list not found" }, 404);
  }

  const author = await resolveCommunityAuthorFields(context.env.DB, {
    playerId,
    username: account.username,
  });
  const { authorName, authorTag } = author;

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
