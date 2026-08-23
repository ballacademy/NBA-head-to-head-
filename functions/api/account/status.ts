import type { Env } from "../../types";
import { validatePlayerId } from "../../lib/accountCredentials";
import { isFoundingGmSignupIndex } from "../../lib/foundingGm";
import { resolveSessionFromRequest } from "../../lib/accountSessions";
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
  if (!context.env.DB) {
    return json({ error: "Account database is not configured." }, 503);
  }

  try {
    const session = await resolveSessionFromRequest(
      context.request,
      context.env.DB,
    );
    if (session) {
      return json({
        linked: true,
        playerId: session.playerId,
        username: session.account.username,
        signupIndex: session.account.signup_index,
        foundingGm: isFoundingGmSignupIndex(session.account.signup_index),
      });
    }

    const url = new URL(context.request.url);
    const playerIdResult = validatePlayerId(
      url.searchParams.get("playerId") ?? "",
    );

    if (!playerIdResult.ok) {
      return json({ linked: false, playerId: "" });
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

    // Unauthenticated lookup: confirm whether this local GM id is linked, but
    // do not reveal username or treat it as an authenticated session.
    return json({
      linked: true,
      playerId: account.player_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missingTable =
      /no such table/i.test(message) || /player_accounts/i.test(message);

    return json(
      {
        error: missingTable
          ? "Account tables are not ready. Apply D1 migrations, then retry."
          : "Could not check account status.",
      },
      503,
    );
  }
};
