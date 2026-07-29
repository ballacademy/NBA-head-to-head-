import type { Env } from "../../types";
import {
  validatePassword,
  validateUsername,
} from "../../lib/accountCredentials";
import {
  assertAuthRateLimitAllow,
  buildAuthRateLimitKey,
  clearAuthRateLimit,
  getAccountByUsername,
  recordAuthFailure,
  touchAccountLogin,
  verifyAccountPassword,
} from "../../lib/playerAccounts";
import { isFoundingGmSignupIndex } from "../../lib/foundingGm";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const INVALID_CREDENTIALS = "Invalid username or password.";

const missingAccountsSchemaError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/no such table/i.test(message) || /player_accounts|auth_rate_limits/i.test(message)) {
    return "Account tables are not ready. Apply D1 migrations, then retry.";
  }
  if (/no such column/i.test(message)) {
    return "Account database needs an update. Apply D1 migrations, then retry.";
  }
  return null;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: {
    username?: unknown;
    password?: unknown;
  };

  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!context.env.DB) {
    return json({ error: "Account database is not configured." }, 503);
  }

  const usernameResult = validateUsername(String(body.username ?? ""));
  if (!usernameResult.ok) {
    return json({ error: INVALID_CREDENTIALS }, 401);
  }

  const passwordResult = validatePassword(String(body.password ?? ""));
  if (!passwordResult.ok) {
    return json({ error: INVALID_CREDENTIALS }, 401);
  }

  try {
    const rateKey = buildAuthRateLimitKey(
      context.request,
      usernameResult.username,
    );
    const rate = await assertAuthRateLimitAllow(context.env.DB, rateKey);
    if (!rate.ok) {
      return json({ error: rate.error }, 429);
    }

    const account = await getAccountByUsername(
      context.env.DB,
      usernameResult.username,
    );

    if (!account) {
      await recordAuthFailure(context.env.DB, rateKey);
      return json({ error: INVALID_CREDENTIALS }, 401);
    }

    const valid = await verifyAccountPassword(
      account,
      passwordResult.password,
    );

    if (!valid) {
      await recordAuthFailure(context.env.DB, rateKey);
      return json({ error: INVALID_CREDENTIALS }, 401);
    }

    await clearAuthRateLimit(context.env.DB, rateKey);
    await touchAccountLogin(context.env.DB, account.id);

    return json({
      ok: true,
      username: account.username,
      playerId: account.player_id,
      signupIndex: account.signup_index,
      foundingGm: isFoundingGmSignupIndex(account.signup_index),
    });
  } catch (error) {
    const schemaError = missingAccountsSchemaError(error);
    if (schemaError) {
      return json({ error: schemaError }, 503);
    }

    return json({ error: "Could not sign in right now. Try again." }, 500);
  }
};
