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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const INVALID_CREDENTIALS = "Invalid username or password.";

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

  const usernameResult = validateUsername(String(body.username ?? ""));
  if (!usernameResult.ok) {
    return json({ error: INVALID_CREDENTIALS }, 401);
  }

  const passwordResult = validatePassword(String(body.password ?? ""));
  if (!passwordResult.ok) {
    return json({ error: INVALID_CREDENTIALS }, 401);
  }

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
  });
};
