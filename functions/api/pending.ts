import type { Env, MatchmakingMode } from "../types";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const parseMode = (value: string | null): MatchmakingMode | null =>
  value === "classic" || value === "ranked" ? value : null;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const mode = parseMode(url.searchParams.get("mode"));
  const playerId = url.searchParams.get("playerId")?.trim();

  if (!mode) {
    return json({ error: "mode must be classic or ranked" }, 400);
  }

  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  const db = context.env.DB;

  // Only intentional live-queue submissions lock Pro play — not every ghost-pool save.
  const queuedLineup = await db
    .prepare(
      `SELECT id, created_at
       FROM stored_lineups
       WHERE mode = ?
         AND player_id = ?
         AND consumed_at IS NULL
         AND awaiting_live = 1
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(mode, playerId)
    .first<{ id: string; created_at: string }>();

  return json({
    queuedLineup: queuedLineup
      ? { id: queuedLineup.id, createdAt: queuedLineup.created_at }
      : null,
  });
};
