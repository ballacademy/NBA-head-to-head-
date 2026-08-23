import type { Env } from "../types";
import { resolveCommunityAuthorFields } from "../lib/communityAuthor";
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
    const countRow = await context.env.DB.prepare(
      `SELECT COUNT(*) AS total FROM community_post_replies WHERE post_id = ?`,
    )
      .bind(postId)
      .first<{ total: number }>();
    const totalCount = Math.max(0, Math.round(Number(countRow?.total ?? 0)));

    // Newest page, then reverse to chronological display order so recent
    // replies stay visible once the thread exceeds REPLY_LIMIT.
    const rows = await context.env.DB.prepare(
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
      .bind(postId, REPLY_LIMIT)
      .all<{
        id: string;
        post_id: string;
        player_id: string;
        author_name: string;
        author_tag: string;
        body: string;
        created_at: string;
      }>();

    const replies = (rows.results ?? []).map(mapReplyRow);
    return json({
      replies,
      totalCount,
      hasMore: totalCount > replies.length,
      limit: REPLY_LIMIT,
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

  const orderSql =
    sort === "popular"
      ? "like_count DESC, created_at DESC"
      : "created_at DESC";

  const rows = singleId
    ? await context.env.DB.prepare(
        `SELECT p.id, p.player_id, p.author_name, p.author_tag, p.body, p.created_at,
                p.like_count, p.attachment_json, p.quote_post_id, p.quote_json,
                p.author_classic_elo, p.author_ranked_elo,
                (SELECT COUNT(*) FROM community_post_replies r WHERE r.post_id = p.id) AS reply_count
         FROM community_posts p
         WHERE p.id = ?
         LIMIT 1`,
      )
        .bind(singleId)
        .all<{
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
        }>()
    : await context.env.DB.prepare(
        `SELECT p.id, p.player_id, p.author_name, p.author_tag, p.body, p.created_at,
                p.like_count, p.attachment_json, p.quote_post_id, p.quote_json,
                p.author_classic_elo, p.author_ranked_elo,
                (SELECT COUNT(*) FROM community_post_replies r WHERE r.post_id = p.id) AS reply_count
         FROM community_posts p
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
          quote_post_id: string | null;
          quote_json: string | null;
          author_classic_elo: number | null;
          author_ranked_elo: number | null;
          reply_count: number | null;
        }>();

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
  return json({
    posts,
    sort,
    hasMore,
    nextOffset: offset + pageRows.length,
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
    const playerId = parsePlayerId(body.playerId);
    const postId =
      typeof body.postId === "string" && body.postId.trim()
        ? body.postId.trim().slice(0, 80)
        : "";
    const reason =
      typeof body.reason === "string"
        ? body.reason.trim().slice(0, REASON_MAX)
        : "";

    if (!playerId || !postId) {
      return json({ error: "playerId and postId are required" }, 400);
    }

    const account = await getAccountByPlayerId(context.env.DB, playerId);
    if (!account) {
      return json({ error: "Create an account to report posts." }, 403);
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
    const playerId = parsePlayerId(body.playerId);
    const replyId =
      typeof body.replyId === "string" && body.replyId.trim()
        ? body.replyId.trim().slice(0, 80)
        : "";

    if (!playerId || !replyId) {
      return json({ error: "playerId and replyId are required" }, 400);
    }

    const account = await getAccountByPlayerId(context.env.DB, playerId);
    if (!account) {
      return json({ error: "Create an account to delete replies." }, 403);
    }

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
    const playerId = parsePlayerId(body.playerId);
    const postId =
      typeof body.postId === "string" && body.postId.trim()
        ? body.postId.trim().slice(0, 80)
        : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";

    if (!playerId || !postId) {
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

    const account = await getAccountByPlayerId(context.env.DB, playerId);
    if (!account) {
      return json({ error: "Create an account to reply." }, 403);
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
