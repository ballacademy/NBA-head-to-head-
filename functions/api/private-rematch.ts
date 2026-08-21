import type { Env } from "../types";
import { getAccountByPlayerId, getUsernameByPlayerId } from "../lib/playerAccounts";
import { rejectProfaneTeamName } from "../lib/profanity";
import {
  cancelPrivateRematchOffer,
  cleanupExpiredPrivateRematches,
  getPrivateRematch,
  isLiveMatchStillJoinable,
  offerPrivateRematch,
} from "../lib/privateRematches";
import { parsePrivateRoomMode } from "../lib/privateRooms";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const ACCOUNT_REQUIRED = "Create an account to host or join a private match.";

const parsePlayerId = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 128)
    : "";

const parseTeamName = (value: unknown) =>
  typeof value === "string" ? value.trim().slice(0, 32) : "";

const parseSourceMatchId = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 128)
    : "";

interface OfferBody {
  sourceMatchId?: unknown;
  playerId?: unknown;
  teamName?: unknown;
  elo?: unknown;
}

/** Offer rematch (or poll via GET). Matched when both prior opponents are ready. */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: OfferBody;

  try {
    body = (await context.request.json()) as OfferBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const sourceMatchId = parseSourceMatchId(body.sourceMatchId);
  const playerId = parsePlayerId(body.playerId);
  const teamName = parseTeamName(body.teamName);
  const elo = Number(body.elo ?? 500);

  if (!sourceMatchId || !playerId || !teamName) {
    return json(
      { error: "sourceMatchId, playerId, and teamName are required" },
      400,
    );
  }

  const profanityError = rejectProfaneTeamName(teamName);
  if (profanityError) {
    return json({ error: profanityError }, 400);
  }

  if (!Number.isFinite(elo)) {
    return json({ error: "elo must be a number" }, 400);
  }

  const account = await getAccountByPlayerId(context.env.DB, playerId);
  if (!account) {
    return json({ error: ACCOUNT_REQUIRED }, 403);
  }

  const result = await offerPrivateRematch(context.env.DB, {
    sourceMatchId,
    playerId,
    teamName,
    elo,
  });

  if ("error" in result) {
    return json({ error: result.error }, result.status ?? 400);
  }

  if (result.status === "matched") {
    return json({
      status: "matched",
      sourceMatchId: result.sourceMatchId,
      matchId: result.matchId,
      mode: result.mode,
      opponent: {
        ...result.opponent,
        username: await getUsernameByPlayerId(
          context.env.DB,
          result.opponent.playerId,
        ),
      },
    });
  }

  return json({
    status: "waiting",
    sourceMatchId: result.sourceMatchId,
    expiresAt: result.expiresAt,
  });
};

/** Poll rematch lobby status. */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const sourceMatchId = parseSourceMatchId(url.searchParams.get("matchId"));
  const playerId = parsePlayerId(url.searchParams.get("playerId"));

  if (!sourceMatchId || !playerId) {
    return json({ error: "matchId and playerId are required" }, 400);
  }

  await cleanupExpiredPrivateRematches(context.env.DB);
  const row = await getPrivateRematch(context.env.DB, sourceMatchId);
  if (!row) {
    return json({ error: "Rematch lobby not found" }, 404);
  }

  if (row.player_a_id !== playerId && row.player_b_id !== playerId) {
    return json({ error: "Forbidden" }, 403);
  }

  if (row.status === "expired" || row.status === "cancelled") {
    return json({ status: row.status }, 410);
  }

  if (row.status === "matched" && row.new_match_id) {
    if (!(await isLiveMatchStillJoinable(context.env.DB, row.new_match_id))) {
      return json({ status: "expired" }, 410);
    }
    const mode = parsePrivateRoomMode(row.mode);
    if (!mode) {
      return json({ error: "Rematch mode is invalid" }, 400);
    }
    const isPlayerA = row.player_a_id === playerId;
    const opponentPlayerId = isPlayerA ? row.player_b_id : row.player_a_id;
    return json({
      status: "matched",
      sourceMatchId: row.source_match_id,
      matchId: row.new_match_id,
      mode,
      opponent: {
        playerId: opponentPlayerId,
        teamName: isPlayerA ? row.player_b_team : row.player_a_team,
        elo: Math.round(isPlayerA ? row.player_b_elo : row.player_a_elo),
        username: await getUsernameByPlayerId(context.env.DB, opponentPlayerId),
      },
    });
  }

  if (row.expires_at < new Date().toISOString()) {
    return json({ status: "expired" }, 410);
  }

  return json({
    status: "waiting",
    sourceMatchId: row.source_match_id,
    expiresAt: row.expires_at,
  });
};

/** Cancel a rematch offer while still waiting. */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const sourceMatchId = parseSourceMatchId(url.searchParams.get("matchId"));
  const playerId = parsePlayerId(url.searchParams.get("playerId"));

  if (!sourceMatchId || !playerId) {
    return json({ error: "matchId and playerId are required" }, 400);
  }

  const ok = await cancelPrivateRematchOffer(context.env.DB, {
    sourceMatchId,
    playerId,
  });

  return json({ ok });
};
