import type { Env } from "../types";
import { requireLinkedAccountSession } from "../lib/accountSessions";
import {
  emptyTierListAccountPayload,
  loadTierListLibraryRow,
  mergeTierListAccountPayload,
  normalizeTierListAccountPayload,
  parseTierListAccountJson,
  upsertTierListLibraryRow,
} from "../lib/tierListLibrarySync";

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
  const requestedPlayerId = parsePlayerId(url.searchParams.get("playerId"));

  if (!requestedPlayerId) {
    return json({ error: "playerId is required" }, 400);
  }

  const auth = await requireLinkedAccountSession(
    context.request,
    context.env.DB,
    requestedPlayerId,
  );
  if (!auth.ok) return auth.response;
  const { playerId } = auth;

  const row = await loadTierListLibraryRow(context.env.DB, playerId);
  const library = row
    ? parseTierListAccountJson(row.library_json)
    : emptyTierListAccountPayload();

  return json({
    playerId,
    library,
    updatedAt: row?.updated_at ?? null,
  });
};

interface LibraryBody {
  playerId?: unknown;
  library?: unknown;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  let body: LibraryBody;

  try {
    body = (await context.request.json()) as LibraryBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
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
  if (!auth.ok) return auth.response;
  const { playerId } = auth;

  const incoming = normalizeTierListAccountPayload(body.library);
  const existing = await loadTierListLibraryRow(context.env.DB, playerId);
  const existingLibrary = existing
    ? parseTierListAccountJson(existing.library_json)
    : emptyTierListAccountPayload();
  const merged = mergeTierListAccountPayload(existingLibrary, incoming);
  const updatedAt = new Date().toISOString();

  await upsertTierListLibraryRow(context.env.DB, playerId, merged, updatedAt);

  return json({
    playerId,
    library: merged,
    updatedAt,
  });
};
