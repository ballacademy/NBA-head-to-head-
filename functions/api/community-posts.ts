import type { Env } from "../types";
import { resolveCommunityAuthorFields } from "../lib/communityAuthor";
import { requireLinkedAccountSession } from "../lib/accountSessions";
import { syncCommunityPostLikeCount } from "../lib/likeCounts";
import {
  assertCommunityPostRateLimitAllow,
  assertCommunityReplyRateLimitAllow,
  recordCommunityPostAttempt,
  recordCommunityReplyAttempt,
} from "../lib/playerAccounts";

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
const REPLY_BODY_MAX = 280;
const LIST_LIMIT = 50;
const REPLY_LIMIT = 40;
const ATTACHMENT_JSON_MAX = 8_000;
const QUOTE_JSON_MAX = 1_200;
const REASON_MAX = 200;

interface CreateBody {
  playerId?: unknown;
  authorName?: unknown;
  authorTag?: unknown;
  body?: unknown;
  attachment?: unknown;
  quotePostId?: unknown;
  authorClassicElo?: unknown;
  authorRankedElo?: unknown;
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

interface ReplyBody {
  playerId?: unknown;
  postId?: unknown;
  authorName?: unknown;
  authorTag?: unknown;
  body?: unknown;
}

interface ReportBody {
  playerId?: unknown;
  postId?: unknown;
  reason?: unknown;
}

const parseJsonObject = (value: unknown, max: number): string | null => {
  if (value == null) {
    return null;
  }
  if (typeof value !== "object") {
    return null;
  }
  try {
    const encoded = JSON.stringify(value);
    if (encoded.length > max) {
      return null;
    }
    return encoded;
  } catch {
    return null;
  }
};

const parseQuote = (raw: string | null) => {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const mapPostRow = (
  row: {
    id: string;
    player_id: string;
    author_name: string;
    author_tag: string;
    body: string;
    created_at: string;
    like_count?: number | null;
    attachment_json?: string | null;
    quote_post_id?: string | null;
    quote_json?: string | null;
    author_classic_elo?: number | null;
    author_ranked_elo?: number | null;
    reply_count?: number | null;
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
    quotePostId: row.quote_post_id ?? null,
    quote: parseQuote(row.quote_json ?? null),
    authorClassicElo:
      row.author_classic_elo == null
        ? null
        : Math.round(Number(row.author_classic_elo)),
    authorRankedElo:
      row.author_ranked_elo == null
        ? null
        : Math.round(Number(row.author_ranked_elo)),
    replyCount: Math.max(0, Math.round(Number(row.reply_count ?? 0)) || 0),
  };
};

const mapReplyRow = (row: {
  id: string;
  post_id: string;
  player_id: string;
  author_name: string;
  author_tag: string;
  body: string;
  created_at: string;
}) => ({
  id: row.id,
  postId: row.post_id,
  playerId: row.player_id,
  authorName: row.author_name,
  authorTag: row.author_tag,
  body: row.body,
  createdAt: row.created_at,
});

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const repliesFor = url.searchParams.get("repliesFor");
  const viewerPlayerId = parsePlayerId(url.searchParams.get("playerId"));

  if (repliesFor) {
    const postId = repliesFor.trim().slice(0, 80);
    const beforeCreatedAt =
      url.searchParams.get("beforeCreatedAt")?.trim().slice(0, 40) ?? "";
    const beforeId =
      url.searchParams.get("beforeId")?.trim().slice(0, 80) ?? "";
    const useCursor = Boolean(beforeCreatedAt && beforeId);

    const countRow = await context.env.DB.prepare(
      `SELECT COUNT(*) AS total FROM community_post_replies WHERE post_id = ?`,
    )
      .bind(postId)
      .first<{ total: number }>();
    const totalCount = Math.max(0, Math.round(Number(countRow?.total ?? 0)));

    const fetchLimit = REPLY_LIMIT + 1;
    const rows = useCursor
      ? await context.env.DB.prepare(
          `SELECT id, post_id, player_id, author_name, author_tag, body, created_at
           FROM (
             SELECT id, post_id, player_id, author_name, author_tag, body, created_at
             FROM community_post_replies
             WHERE post_id = ?
               AND (created_at < ? OR (created_at = ? AND id < ?))
             ORDER BY created_at DESC, id DESC
             LIMIT ?
           )
           ORDER BY created_at ASC, id ASC`,
        )
          .bind(postId, beforeCreatedAt, beforeCreatedAt, beforeId, fetchLimit)
          .all<{
            id: string;
            post_id: string;
            player_id: string;
            author_name: string;
            author_tag: string;
            body: string;
            created_at: string;
          }>()
      : await context.env.DB.prepare(
          `SELECT id, post_id, player_id, author_name, author_tag, body, created_at
           FROM (
             SELECT id, post_id, player_id, author_name, author_tag, body, created_at
             FROM community_post_replies
             WHERE post_id = ?
             ORDER BY created_at DESC, id DESC
             LIMIT ?
           )
           ORDER BY created_at ASC, id ASC`,
        )
          .bind(postId, fetchLimit)
          .all<{
            id: string;
            post_id: string;
            player_id: string;
            author_name: string;
            author_tag: string;
            body: string;
            created_at: string;
          }>();

    const rawReplies = rows.results ?? [];
    const hasMore = rawReplies.length > REPLY_LIMIT;
    const pageRows = hasMore ? rawReplies.slice(0, REPLY_LIMIT) : rawReplies;
    const replies = pageRows.map(mapReplyRow);
    const oldest = replies[0];

    return json({
      replies,
      totalCount,
      hasMore: useCursor ? hasMore : totalCount > replies.length,
      limit: REPLY_LIMIT,
      nextCursor:
        hasMore && oldest
          ? { beforeCreatedAt: oldest.createdAt, beforeId: oldest.id }
          : null,
    });
  }

  if (url.searchParams.get("activity") === "1") {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const since = dayStart.toISOString();
    const countRow = await context.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM community_posts WHERE created_at >= ?`,
    )
      .bind(since)
      .first<{ count: number }>();
    return json({
      postsToday: Math.max(0, Math.round(Number(countRow?.count ?? 0)) || 0),
      since,
    });
  }

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
  const singleId = url.searchParams.get("id")?.trim().slice(0, 80) ?? "";

  const beforeLikeCountRaw = url.searchParams.get("beforeLikeCount");
  const beforeLikeCount = Number(beforeLikeCountRaw);
  const beforeCreatedAt =
    url.searchParams.get("beforeCreatedAt")?.trim().slice(0, 40) ?? "";
  const beforeId =
    url.searchParams.get("beforeId")?.trim().slice(0, 80) ?? "";
  const usePopularCursor =
    sort === "popular" &&
    Number.isFinite(beforeLikeCount) &&
    beforeCreatedAt.length > 0 &&
    beforeId.length > 0;
  const useRecentCursor =
    sort === "recent" && beforeCreatedAt.length > 0 && beforeId.length > 0;

  const orderSql =
    sort === "popular"
      ? "like_count DESC, created_at DESC, id DESC"
      : "created_at DESC, id DESC";

  const selectSql = `SELECT p.id, p.player_id, p.author_name, p.author_tag, p.body, p.created_at,
                p.like_count, p.attachment_json, p.quote_post_id, p.quote_json,
                p.author_classic_elo, p.author_ranked_elo,
                (SELECT COUNT(*) FROM community_post_replies r WHERE r.post_id = p.id) AS reply_count
         FROM community_posts p`;

  type PostRow = {
    id: string;
    player_id: string;
    author_name: string;
    author_tag: string;
    body: string;
    created_at: string;
    like_count: number | null;
    attachment_json: string | null;
    quote_post_id: string | null;
    quote_json: string | null;
    author_classic_elo: number | null;
    author_ranked_elo: number | null;
    reply_count: number | null;
  };

  const rows = singleId
    ? await context.env.DB.prepare(
        `${selectSql}
         WHERE p.id = ?
         LIMIT 1`,
      )
        .bind(singleId)
        .all<PostRow>()
    : usePopularCursor
      ? await context.env.DB.prepare(
          `${selectSql}
         WHERE (
           p.like_count < ?
           OR (p.like_count = ? AND p.created_at < ?)
           OR (p.like_count = ? AND p.created_at = ? AND p.id < ?)
         )
         ORDER BY ${orderSql}
         LIMIT ?`,
        )
          .bind(
            beforeLikeCount,
            beforeLikeCount,
            beforeCreatedAt,
            beforeLikeCount,
            beforeCreatedAt,
            beforeId,
            limit + 1,
          )
          .all<PostRow>()
      : useRecentCursor
        ? await context.env.DB.prepare(
            `${selectSql}
         WHERE (p.created_at < ? OR (p.created_at = ? AND p.id < ?))
         ORDER BY ${orderSql}
         LIMIT ?`,
          )
            .bind(beforeCreatedAt, beforeCreatedAt, beforeId, limit + 1)
            .all<PostRow>()
        : await context.env.DB.prepare(
            `${selectSql}
         ORDER BY ${orderSql}
         LIMIT ? OFFSET ?`,
          )
            .bind(limit + 1, offset)
            .all<PostRow>();

  const results = rows.results ?? [];
  const hasMore = !singleId && results.length > limit;
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

  const posts = pageRows.map((row) => mapPostRow(row, likedIds.has(row.id)));
  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? sort === "popular"
        ? {
            beforeLikeCount: Math.max(
              0,
              Math.round(Number(last.like_count ?? 0)) || 0,
            ),
            beforeCreatedAt: last.created_at,
            beforeId: last.id,
          }
        : {
            beforeCreatedAt: last.created_at,
            beforeId: last.id,
          }
      : null;

  return json({
    posts,
    sort,
    hasMore,
    nextOffset: offset + pageRows.length,
    nextCursor,
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: CreateBody &
    LikeBody &
    DeleteBody &
    ReplyBody &
    ReportBody & { action?: unknown };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (body.action === "delete") {
    const requestedPlayerId = parsePlayerId(body.playerId);
    const postId =
      typeof body.postId === "string" && body.postId.trim()
        ? body.postId.trim().slice(0, 80)
        : "";

    if (!requestedPlayerId || !postId) {
      return json({ error: "playerId and postId are required" }, 400);
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
    await context.env.DB.prepare(
      `DELETE FROM community_post_replies WHERE post_id = ?`,
    )
      .bind(postId)
      .run();
    await context.env.DB.prepare(`DELETE FROM community_posts WHERE id = ?`)
      .bind(postId)
      .run();

    return json({ ok: true, postId });
  }

  if (body.action === "report") {
    const requestedPlayerId = parsePlayerId(body.playerId);
    const postId =
      typeof body.postId === "string" && body.postId.trim()
        ? body.postId.trim().slice(0, 80)
        : "";
    const reason =
      typeof body.reason === "string"
        ? body.reason.trim().slice(0, REASON_MAX)
        : "";

    if (!requestedPlayerId || !postId) {
      return json({ error: "playerId and postId are required" }, 400);
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
      `SELECT id FROM community_posts WHERE id = ?`,
    )
      .bind(postId)
      .first<{ id: string }>();
    if (!existing) {
      return json({ error: "Post not found" }, 404);
    }

    const now = new Date().toISOString();
    const id = `creport-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
    await context.env.DB.prepare(
      `INSERT INTO community_post_reports
        (id, post_id, reporter_player_id, reason, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(id, postId, playerId, reason || null, now)
      .run();

    return json({ ok: true, reportId: id });
  }

  if (body.action === "delete-reply") {
    const requestedPlayerId = parsePlayerId(body.playerId);
    const replyId =
      typeof body.replyId === "string" && body.replyId.trim()
        ? body.replyId.trim().slice(0, 80)
        : "";

    if (!requestedPlayerId || !replyId) {
      return json({ error: "playerId and replyId are required" }, 400);
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
      `SELECT id, player_id, post_id FROM community_post_replies WHERE id = ?`,
    )
      .bind(replyId)
      .first<{ id: string; player_id: string; post_id: string }>();

    if (!existing) {
      return json({ error: "Reply not found" }, 404);
    }

    if (existing.player_id !== playerId) {
      return json({ error: "You can only delete your own replies." }, 403);
    }

    await context.env.DB.prepare(
      `DELETE FROM community_post_replies WHERE id = ? AND player_id = ?`,
    )
      .bind(replyId, playerId)
      .run();

    return json({ ok: true, replyId, postId: existing.post_id });
  }

  if (body.action === "reply") {
    const requestedPlayerId = parsePlayerId(body.playerId);
    const postId =
      typeof body.postId === "string" && body.postId.trim()
        ? body.postId.trim().slice(0, 80)
        : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";

    if (!requestedPlayerId || !postId) {
      return json({ error: "playerId and postId are required" }, 400);
    }
    if (!text) {
      return json({ error: "Reply body is required" }, 400);
    }
    if (text.length > REPLY_BODY_MAX) {
      return json(
        { error: `Replies can be at most ${REPLY_BODY_MAX} characters` },
        400,
      );
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

    const rate = await assertCommunityReplyRateLimitAllow(
      context.env.DB,
      playerId,
    );
    if (!rate.ok) {
      return json({ error: rate.error }, 429);
    }

    const existing = await context.env.DB.prepare(
      `SELECT id FROM community_posts WHERE id = ?`,
    )
      .bind(postId)
      .first<{ id: string }>();
    if (!existing) {
      return json({ error: "Post not found" }, 404);
    }

    const author = await resolveCommunityAuthorFields(context.env.DB, {
      playerId,
      username: account.username,
    });
    const authorName = author.authorName;
    const authorTag = author.authorTag;

    const now = new Date().toISOString();
    const id = `creply-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
    await context.env.DB.prepare(
      `INSERT INTO community_post_replies
        (id, post_id, player_id, author_name, author_tag, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, postId, playerId, authorName, authorTag, text, now)
      .run();

    await recordCommunityReplyAttempt(context.env.DB, playerId);

    return json(
      {
        ok: true,
        reply: {
          id,
          postId,
          playerId,
          authorName,
          authorTag,
          body: text,
          createdAt: now,
        },
      },
      201,
    );
  }

  if (body.action === "like") {
    const requestedPlayerId = parsePlayerId(body.playerId);
    const postId =
      typeof body.postId === "string" && body.postId.trim()
        ? body.postId.trim().slice(0, 80)
        : "";
    const liked = body.liked === true;

    if (!requestedPlayerId || !postId) {
      return json({ error: "playerId and postId are required" }, 400);
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

    const likeCount = await syncCommunityPostLikeCount(context.env.DB, postId);

    return json({ ok: true, postId, liked, likeCount });
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

  const rate = await assertCommunityPostRateLimitAllow(context.env.DB, playerId);
  if (!rate.ok) {
    return json({ error: rate.error }, 429);
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return json({ error: "Post body is required" }, 400);
  }
  if (text.length > BODY_MAX) {
    return json(
      { error: `Posts can be at most ${BODY_MAX} characters` },
      400,
    );
  }

  const attachmentJson = parseJsonObject(body.attachment, ATTACHMENT_JSON_MAX);
  if (body.attachment != null && attachmentJson == null) {
    return json({ error: "Attachment is too large or invalid" }, 400);
  }

  let quotePostId: string | null = null;
  let quoteJson: string | null = null;
  if (typeof body.quotePostId === "string" && body.quotePostId.trim()) {
    quotePostId = body.quotePostId.trim().slice(0, 80);
    const quoted = await context.env.DB.prepare(
      `SELECT id, author_name, author_tag, body FROM community_posts WHERE id = ?`,
    )
      .bind(quotePostId)
      .first<{
        id: string;
        author_name: string;
        author_tag: string;
        body: string;
      }>();
    if (!quoted) {
      return json({ error: "Quoted post not found" }, 404);
    }
    quoteJson = parseJsonObject(
      {
        postId: quoted.id,
        authorName: quoted.author_name,
        authorTag: quoted.author_tag,
        bodyPreview: quoted.body.slice(0, 160),
      },
      QUOTE_JSON_MAX,
    );
  }

  const author = await resolveCommunityAuthorFields(context.env.DB, {
    playerId,
    username: account.username,
  });
  const { authorName, authorTag, authorClassicElo, authorRankedElo } = author;

  const now = new Date().toISOString();
  const id = `cpost-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;

  await context.env.DB.prepare(
    `INSERT INTO community_posts
      (id, player_id, author_name, author_tag, body, created_at, like_count, attachment_json,
       quote_post_id, quote_json, author_classic_elo, author_ranked_elo)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      playerId,
      authorName,
      authorTag,
      text,
      now,
      attachmentJson,
      quotePostId,
      quoteJson,
      authorClassicElo,
      authorRankedElo,
    )
    .run();

  await recordCommunityPostAttempt(context.env.DB, playerId);

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
        quotePostId,
        quote: quoteJson ? JSON.parse(quoteJson) : null,
        authorClassicElo,
        authorRankedElo,
        replyCount: 0,
      },
    },
    201,
  );
};
