import type { Env } from "../../types";
import {
  validatePassword,
  validatePlayerId,
  validateUsername,
} from "../../lib/accountCredentials";
import {
  assertRegisterRateLimitAllow,
  buildRegisterRateLimitKey,
  createPlayerAccount,
  getAccountByPlayerId,
  getAccountByUsername,
  recordRegisterAttempt,
} from "../../lib/playerAccounts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const missingAccountsTableError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/no such table/i.test(message) || /player_accounts|auth_rate_limits/i.test(message)) {
    return "Account tables are not ready. Apply D1 migrations, then retry.";
  }
  return null;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: {
    username?: unknown;
    password?: unknown;
    playerId?: unknown;
    acceptedTerms?: unknown;
  };

  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!context.env.DB) {
    return json({ error: "Account database is not configured." }, 503);
  }

  if (body.acceptedTerms !== true) {
    return json(
      {
        error:
          "You must accept the Privacy Policy and Terms of Use to create an account.",
      },
      400,
    );
  }

  const usernameResult = validateUsername(String(body.username ?? ""));
  if (!usernameResult.ok) {
    return json({ error: usernameResult.error }, 400);
  }

  const passwordResult = validatePassword(String(body.password ?? ""));
  if (!passwordResult.ok) {
    return json({ error: passwordResult.error }, 400);
  }

  const playerIdResult = validatePlayerId(String(body.playerId ?? ""));
  if (!playerIdResult.ok) {
    return json({ error: playerIdResult.error }, 400);
  }

  try {
    const rateKey = buildRegisterRateLimitKey(context.request);
    const rate = await assertRegisterRateLimitAllow(context.env.DB, rateKey);
    if (!rate.ok) {
      return json({ error: rate.error }, 429);
    }

    // Count every register attempt (success or fail) against the IP bucket.
    await recordRegisterAttempt(context.env.DB, rateKey);

    const existingUsername = await getAccountByUsername(
      context.env.DB,
      usernameResult.username,
    );
    if (existingUsername) {
      return json({ error: "That username is already taken." }, 409);
    }

    const existingPlayer = await getAccountByPlayerId(
      context.env.DB,
      playerIdResult.playerId,
    );
    if (existingPlayer) {
      return json(
        {
          error: "This GM identity already has an account. Log in instead.",
        },
        409,
      );
    }

    const account = await createPlayerAccount(context.env.DB, {
      username: usernameResult.username,
      password: passwordResult.password,
      playerId: playerIdResult.playerId,
    });

    return json({
      ok: true,
      username: account.username,
      playerId: account.playerId,
      createdAt: account.createdAt,
    });
  } catch (error) {
    const missingTable = missingAccountsTableError(error);
    if (missingTable) {
      return json({ error: missingTable }, 503);
    }

    const message = error instanceof Error ? error.message : String(error);
    if (/UNIQUE/i.test(message)) {
      if (/player_id/i.test(message)) {
        return json(
          {
            error: "This GM identity already has an account. Log in instead.",
          },
          409,
        );
      }

      return json({ error: "That username is already taken." }, 409);
    }

    return json({ error: "Could not create account." }, 500);
  }
};
