import type { Env } from "../../types";
import {
  validatePassword,
  validateUsername,
} from "../../lib/accountCredentials";
import {
  createAccountSession,
  jsonWithSessionCookie,
} from "../../lib/accountSessions";
import {
  assertRateLimitAllow,
  clearAuthRateLimit,
  getAccountByUsername,
  recordRateLimitAttempt,
  updateAccountPassword,
} from "../../lib/playerAccounts";
import {
  PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS,
  PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
  buildPasswordResetRateLimitKey,
  hashResetCode,
  resetCodeHashesMatch,
  validateResetCodeFormat,
} from "../../lib/passwordReset";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const INVALID_RESET = "Invalid username or reset code.";

const missingSchemaError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (
    /no such table/i.test(message) ||
    /player_accounts|password_reset_tokens|auth_rate_limits/i.test(message)
  ) {
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
    resetCode?: unknown;
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
    return json({ error: INVALID_RESET }, 401);
  }

  const codeResult = validateResetCodeFormat(String(body.resetCode ?? ""));
  if (!codeResult.ok) {
    return json({ error: codeResult.error }, 400);
  }

  const passwordResult = validatePassword(String(body.password ?? ""));
  if (!passwordResult.ok) {
    return json({ error: passwordResult.error }, 400);
  }

  try {
    const rateKey = buildPasswordResetRateLimitKey(
      context.request,
      usernameResult.username,
    );
    const rate = await assertRateLimitAllow(context.env.DB, rateKey, {
      maxAttempts: PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS,
      windowMs: PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
    });
    if (!rate.ok) {
      return json({ error: rate.error }, 429);
    }

    const account = await getAccountByUsername(
      context.env.DB,
      usernameResult.username,
    );
    if (!account) {
      await recordRateLimitAttempt(
        context.env.DB,
        rateKey,
        PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
      );
      return json({ error: INVALID_RESET }, 401);
    }

    const tokenHash = await hashResetCode(codeResult.code);
    const nowIso = new Date().toISOString();
    const token = await context.env.DB
      .prepare(
        `SELECT id, token_hash, expires_at, used_at
         FROM password_reset_tokens
         WHERE account_id = ?
           AND used_at IS NULL
           AND expires_at > ?
         ORDER BY created_at DESC
         LIMIT 5`,
      )
      .bind(account.id, nowIso)
      .all<{
        id: string;
        token_hash: string;
        expires_at: string;
        used_at: string | null;
      }>();

    const match = (token.results ?? []).find((row) =>
      resetCodeHashesMatch(String(row.token_hash ?? ""), tokenHash),
    );

    if (!match) {
      await recordRateLimitAttempt(
        context.env.DB,
        rateKey,
        PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
      );
      return json({ error: INVALID_RESET }, 401);
    }

    await updateAccountPassword(
      context.env.DB,
      account.id,
      passwordResult.password,
    );

    await context.env.DB
      .prepare(
        `UPDATE password_reset_tokens
         SET used_at = ?
         WHERE id = ?`,
      )
      .bind(nowIso, match.id)
      .run();

    // Invalidate any other outstanding codes for this account.
    await context.env.DB
      .prepare(
        `UPDATE password_reset_tokens
         SET used_at = ?
         WHERE account_id = ?
           AND used_at IS NULL
           AND id != ?`,
      )
      .bind(nowIso, account.id, match.id)
      .run();

    await clearAuthRateLimit(context.env.DB, rateKey);

    const session = await createAccountSession(context.env.DB, {
      accountId: account.id,
      playerId: account.player_id,
    });

    return jsonWithSessionCookie(
      {
        ok: true,
        username: account.username,
        playerId: account.player_id,
      },
      session.token,
    );
  } catch (error) {
    const schemaError = missingSchemaError(error);
    if (schemaError) {
      return json({ error: schemaError }, 503);
    }

    return json({ error: "Could not reset password right now. Try again." }, 500);
  }
};
