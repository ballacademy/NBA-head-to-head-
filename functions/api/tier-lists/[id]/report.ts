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

const REASON_MAX = 280;

const parsePlayerId = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 128)
    : "";

interface ReportBody {
  playerId?: unknown;
  reason?: unknown;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const tierListId =
    typeof context.params.id === "string" ? context.params.id.trim().slice(0, 64) : "";
  if (!tierListId) {
    return json({ error: "tier list id is required" }, 400);
  }

  let body: ReportBody;
  try {
    body = (await context.request.json()) as ReportBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const playerId = parsePlayerId(body.playerId);
  const reason =
    typeof body.reason === "string" ? body.reason.trim().slice(0, REASON_MAX) : "";

  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  const account = await getAccountByPlayerId(context.env.DB, playerId);
  if (!account) {
    return json({ error: "Create an account to report tier lists." }, 403);
  }

  const existing = await context.env.DB.prepare(
    `SELECT id, player_id FROM published_tier_lists WHERE id = ?`,
  )
    .bind(tierListId)
    .first<{ id: string; player_id: string }>();

  if (!existing) {
    return json({ error: "Tier list not found" }, 404);
  }

  if (existing.player_id === playerId) {
    return json({ error: "You can’t report your own tier list." }, 400);
  }

  const now = new Date().toISOString();
  const id = `tlreport-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  await context.env.DB.prepare(
    `INSERT INTO tier_list_reports
      (id, tier_list_id, reporter_player_id, reason, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, tierListId, playerId, reason || null, now)
    .run();

  return json({ ok: true, reportId: id }, 201);
};
