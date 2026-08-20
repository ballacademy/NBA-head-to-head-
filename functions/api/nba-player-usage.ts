import type { Env } from "../types";
import { getAccountByPlayerId } from "../lib/playerAccounts";
import {
  emptyNbaPlayerUsageStore,
  loadNbaPlayerUsageRow,
  mergeNbaPlayerUsageStore,
  normalizeNbaPlayerUsageStore,
  parseNbaPlayerUsageJson,
  upsertNbaPlayerUsageRow,
} from "../lib/nbaPlayerUsageSync";

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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const playerId = parsePlayerId(url.searchParams.get("playerId"));

  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  const account = await getAccountByPlayerId(context.env.DB, playerId);
  if (!account) {
    return json({ error: "account required" }, 403);
  }

  const row = await loadNbaPlayerUsageRow(context.env.DB, playerId);
  const usage = row
    ? parseNbaPlayerUsageJson(row.usage_json)
    : emptyNbaPlayerUsageStore();

  return json({
    playerId,
    usage,
    updatedAt: row?.updated_at ?? null,
  });
};

interface UsageBody {
  playerId?: unknown;
  usage?: unknown;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  let body: UsageBody;

  try {
    body = (await context.request.json()) as UsageBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const playerId = parsePlayerId(body.playerId);
  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  const account = await getAccountByPlayerId(context.env.DB, playerId);
  if (!account) {
    return json({ error: "account required" }, 403);
  }

  const incoming = normalizeNbaPlayerUsageStore(body.usage);
  const existing = await loadNbaPlayerUsageRow(context.env.DB, playerId);
  const existingUsage = existing
    ? parseNbaPlayerUsageJson(existing.usage_json)
    : emptyNbaPlayerUsageStore();
  const merged = mergeNbaPlayerUsageStore(existingUsage, incoming);
  const updatedAt = new Date().toISOString();

  await upsertNbaPlayerUsageRow(context.env.DB, playerId, merged, updatedAt);

  return json({
    playerId,
    usage: merged,
    updatedAt,
  });
};
