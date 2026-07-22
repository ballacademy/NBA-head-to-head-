import type { Env } from "../../types";
import { validatePlayerId } from "../../lib/accountCredentials";
import { getAccountByPlayerId } from "../../lib/playerAccounts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const playerIdResult = validatePlayerId(
    url.searchParams.get("playerId") ?? "",
  );

  if (!playerIdResult.ok) {
    return json({ error: playerIdResult.error }, 400);
  }

  const account = await getAccountByPlayerId(
    context.env.DB,
    playerIdResult.playerId,
  );

  if (!account) {
    return json({
      linked: false,
      playerId: playerIdResult.playerId,
    });
  }

  // Only confirm linkage + username for the browser that already holds the GM id.
  // Do not expose last-login timestamps on this unauthenticated endpoint.
  return json({
    linked: true,
    playerId: account.player_id,
    username: account.username,
  });
};
