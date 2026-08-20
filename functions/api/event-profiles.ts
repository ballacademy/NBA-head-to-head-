import type { Env } from "../types";
import { getAccountByPlayerId } from "../lib/playerAccounts";
import {
  emptyEventProfilesPayload,
  loadEventProfilesRow,
  mergeEventProfilesPayload,
  normalizeEventProfilesPayload,
  parseEventProfilesJson,
  upsertEventProfilesRow,
} from "../lib/eventProfileSync";

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

  const row = await loadEventProfilesRow(context.env.DB, playerId);
  const profiles = row
    ? parseEventProfilesJson(row.profiles_json)
    : emptyEventProfilesPayload();

  return json({
    playerId,
    profiles,
    updatedAt: row?.updated_at ?? null,
  });
};

interface ProfilesBody {
  playerId?: unknown;
  profiles?: unknown;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  let body: ProfilesBody;

  try {
    body = (await context.request.json()) as ProfilesBody;
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

  const incoming = normalizeEventProfilesPayload(body.profiles);
  const existing = await loadEventProfilesRow(context.env.DB, playerId);
  const existingProfiles = existing
    ? parseEventProfilesJson(existing.profiles_json)
    : emptyEventProfilesPayload();
  const merged = mergeEventProfilesPayload(existingProfiles, incoming);
  const updatedAt = new Date().toISOString();

  await upsertEventProfilesRow(context.env.DB, playerId, merged, updatedAt);

  return json({
    playerId,
    profiles: merged,
    updatedAt,
  });
};
