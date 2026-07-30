import type { Env } from "../../types";
import { validateUsername } from "../../lib/accountCredentials";
import { getAccountByUsername } from "../../lib/playerAccounts";
import {
  PASSWORD_RESET_TTL_MS,
  generateResetCode,
  hashResetCode,
} from "../../lib/passwordReset";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

/**
 * Support-only: issue a one-time password reset code.
 * Requires Pages secret ACCOUNT_RESET_SECRET and header:
 *   Authorization: Bearer <secret>
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const expected = context.env.ACCOUNT_RESET_SECRET?.trim();
  if (!expected) {
    return json(
      {
        error:
          "Password reset issuing is not configured. Set ACCOUNT_RESET_SECRET on Pages.",
      },
      503,
    );
  }

  const auth = context.request.headers.get("authorization") ?? "";
  const provided = auth.replace(/^Bearer\s+/i, "").trim();
  if (!provided || provided !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!context.env.DB) {
    return json({ error: "Account database is not configured." }, 503);
  }

  let body: { username?: unknown };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const usernameResult = validateUsername(String(body.username ?? ""));
  if (!usernameResult.ok) {
    return json({ error: usernameResult.error }, 400);
  }

  try {
    const account = await getAccountByUsername(
      context.env.DB,
      usernameResult.username,
    );
    if (!account) {
      return json({ error: "No account found for that username." }, 404);
    }

    const code = generateResetCode();
    const tokenHash = await hashResetCode(code);
    const now = Date.now();
    const createdAt = new Date(now).toISOString();
    const expiresAt = new Date(now + PASSWORD_RESET_TTL_MS).toISOString();
    const id = crypto.randomUUID();

    await context.env.DB
      .prepare(
        `UPDATE password_reset_tokens
         SET used_at = ?
         WHERE account_id = ?
           AND used_at IS NULL`,
      )
      .bind(createdAt, account.id)
      .run();

    await context.env.DB
      .prepare(
        `INSERT INTO password_reset_tokens (
           id, account_id, token_hash, created_at, expires_at, used_at
         ) VALUES (?, ?, ?, ?, ?, NULL)`,
      )
      .bind(id, account.id, tokenHash, createdAt, expiresAt)
      .run();

    return json({
      ok: true,
      username: account.username,
      resetCode: code,
      expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/no such table/i.test(message) || /password_reset_tokens/i.test(message)) {
      return json(
        {
          error:
            "Reset table is missing. Apply migration 0013_password_reset_tokens, then retry.",
        },
        503,
      );
    }

    return json({ error: "Could not issue reset code." }, 500);
  }
};
