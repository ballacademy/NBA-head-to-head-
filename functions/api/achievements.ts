import type { Env } from "../types";
import { isFoundingGmSignupIndex } from "../lib/foundingGm";
import { getAccountByPlayerId } from "../lib/playerAccounts";
import {
  filterUnlockedAchievementIds,
  loadPlayerAchievementsRow,
  parseUnlockedAchievementJson,
  unionUnlockedAchievementIds,
  upsertPlayerAchievementsRow,
} from "../lib/achievementSync";

const FOUNDING_GM_ID = "founding-gm";

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

const withFoundingGm = (
  unlockedIds: string[],
  signupIndex: number | null | undefined,
) => {
  if (!isFoundingGmSignupIndex(signupIndex)) {
    return unlockedIds;
  }

  return unionUnlockedAchievementIds(unlockedIds, [FOUNDING_GM_ID]);
};

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

  const row = await loadPlayerAchievementsRow(context.env.DB, playerId);
  const unlockedIds = withFoundingGm(
    row ? parseUnlockedAchievementJson(row.unlocked_json) : [],
    account.signup_index,
  );

  return json({
    playerId,
    unlockedIds,
    updatedAt: row?.updated_at ?? null,
  });
};

interface AchievementsBody {
  playerId?: unknown;
  unlockedIds?: unknown;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  let body: AchievementsBody;

  try {
    body = (await context.request.json()) as AchievementsBody;
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

  const incoming = filterUnlockedAchievementIds(body.unlockedIds);
  const existing = await loadPlayerAchievementsRow(context.env.DB, playerId);
  const existingIds = existing
    ? parseUnlockedAchievementJson(existing.unlocked_json)
    : [];
  const merged = withFoundingGm(
    unionUnlockedAchievementIds(existingIds, incoming),
    account.signup_index,
  );
  const updatedAt = new Date().toISOString();

  await upsertPlayerAchievementsRow(context.env.DB, playerId, merged, updatedAt);

  return json({
    playerId,
    unlockedIds: merged,
    updatedAt,
  });
};
