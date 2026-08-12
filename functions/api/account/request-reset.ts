import type { Env } from "../../types";
import { validateUsername } from "../../lib/accountCredentials";
import {
  assertRateLimitAllow,
  getAccountByUsername,
  recordRateLimitAttempt,
} from "../../lib/playerAccounts";
import {
  PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS,
  PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
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

/** Same body whether or not the username exists / has email / email sent. */
const GENERIC_OK = {
  ok: true as const,
  message:
    "If that username has an email on file, a reset code is on the way. Check your inbox (and spam folder).",
};

const buildRequestResetRateLimitKey = (request: Request, username: string) => {
  const forwarded =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return `request-reset:${forwarded.slice(0, 64)}:${username}`.slice(0, 160);
};

const sendResetEmail = async (params: {
  apiKey: string;
  from: string;
  to: string;
  username: string;
  code: string;
  expiresAt: string;
}) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${params.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: "Draft Day GM password reset code",
      text: [
        `Hi @${params.username},`,
        "",
        `Your one-time password reset code is: ${params.code}`,
        "",
        `It expires at ${params.expiresAt} (about 1 hour from request).`,
        "Enter it under Account → Forgot password with a new password.",
        "",
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Resend email failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }
};

/**
 * Public self-serve: request a password reset code emailed to the account.
 * Always returns a generic success message (does not reveal if username exists).
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: { username?: unknown };
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
    return json({ error: usernameResult.error }, 400);
  }

  const rateKey = buildRequestResetRateLimitKey(
    context.request,
    usernameResult.username,
  );

  try {
    const rate = await assertRateLimitAllow(context.env.DB, rateKey, {
      maxAttempts: PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS,
      windowMs: PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
    });
    if (!rate.ok) {
      return json({ error: rate.error }, 429);
    }

    await recordRateLimitAttempt(
      context.env.DB,
      rateKey,
      PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
    );

    const account = await getAccountByUsername(
      context.env.DB,
      usernameResult.username,
    );
    const email = account?.email?.trim() || null;

    if (!account || !email) {
      return json(GENERIC_OK);
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

    const apiKey = context.env.RESEND_API_KEY?.trim();
    if (apiKey) {
      const from =
        context.env.RESET_EMAIL_FROM?.trim() ||
        "Draft Day GM <onboarding@resend.dev>";
      try {
        await sendResetEmail({
          apiKey,
          from,
          to: email,
          username: account.username,
          code,
          expiresAt,
        });
      } catch (error) {
        console.error(
          "[request-reset] email delivery failed",
          error instanceof Error ? error.message : String(error),
        );
      }
    } else {
      console.info(
        "[request-reset] RESEND_API_KEY not set; reset token stored without email",
      );
    }

    return json(GENERIC_OK);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      /no such table/i.test(message) ||
      /password_reset_tokens|player_accounts|auth_rate_limits/i.test(message)
    ) {
      return json(
        {
          error:
            "Account tables are not ready. Apply D1 migrations, then retry.",
        },
        503,
      );
    }

    console.error("[request-reset] unexpected error", message);
    return json({ error: "Could not process reset request right now." }, 500);
  }
};
