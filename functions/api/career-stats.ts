import type { Env } from "../types";
import { getAccountByPlayerId } from "../lib/playerAccounts";
import {
  emptyCareerStats,
  loadCareerStatsRow,
  mergeCareerStats,
  normalizeCareerStats,
  parseCareerJson,
  upsertCareerStatsRow,
} from "../lib/careerStatsSync";

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

  const row = await loadCareerStatsRow(context.env.DB, playerId);
  const career = row ? parseCareerJson(row.career_json) : emptyCareerStats();

  return json({
    playerId,
    career,
    updatedAt: row?.updated_at ?? null,
  });
};

interface CareerBody {
  playerId?: unknown;
  career?: unknown;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  let body: CareerBody;

  try {
    body = (await context.request.json()) as CareerBody;
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

  const incoming = normalizeCareerStats(body.career);
  const existing = await loadCareerStatsRow(context.env.DB, playerId);
  const existingCareer = existing
    ? parseCareerJson(existing.career_json)
    : emptyCareerStats();
  const merged = mergeCareerStats(existingCareer, incoming);
  const updatedAt = new Date().toISOString();

  await upsertCareerStatsRow(context.env.DB, playerId, merged, updatedAt);

  return json({
    playerId,
    career: merged,
    updatedAt,
  });
};
