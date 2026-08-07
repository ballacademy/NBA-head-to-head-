import type { Env } from "../types";
import { getAccountByPlayerId } from "../lib/playerAccounts";
import {
  filterUnlockedIds,
  loadPlayerCollectionRow,
  parseUnlockedJson,
  unionUnlockedIds,
  upsertPlayerCollectionRow,
} from "../lib/collectionSync";

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

  const row = await loadPlayerCollectionRow(context.env.DB, playerId);

  return json({
    playerId,
    unlockedIds: row ? parseUnlockedJson(row.unlocked_json) : [],
    updatedAt: row?.updated_at ?? null,
  });
};

interface CollectionBody {
  playerId?: unknown;
  unlockedIds?: unknown;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  let body: CollectionBody;

  try {
    body = (await context.request.json()) as CollectionBody;
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

  const incoming = filterUnlockedIds(body.unlockedIds);
  const existing = await loadPlayerCollectionRow(context.env.DB, playerId);
  const existingIds = existing
    ? parseUnlockedJson(existing.unlocked_json)
    : [];
  const merged = unionUnlockedIds(existingIds, incoming);
  const updatedAt = new Date().toISOString();

  await upsertPlayerCollectionRow(
    context.env.DB,
    playerId,
    merged,
    updatedAt,
  );

  return json({
    playerId,
    unlockedIds: merged,
    updatedAt,
  });
};
