import type { PlayerAccountRow } from "../types";
import { isFoundingGmSignupIndex } from "./foundingGm";
import {
  hashPassword,
  PASSWORD_PBKDF2_ITERATIONS,
  verifyPassword,
} from "./passwordHash";

export const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 8;
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const REGISTER_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const REGISTER_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const ACCOUNT_SELECT_COLUMNS = `id, username, email, password_salt, password_hash, password_iters,
              player_id, created_at, last_login_at, signup_index`;

const ACCOUNT_SELECT_COLUMNS_NO_EMAIL = `id, username, password_salt, password_hash, password_iters,
              player_id, created_at, last_login_at, signup_index`;

const ACCOUNT_SELECT_COLUMNS_LEGACY = `id, username, password_salt, password_hash, password_iters,
              player_id, created_at, last_login_at`;

const isMissingSignupIndexColumn = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /no such column:\s*signup_index/i.test(message);
};

const isMissingEmailColumn = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /no such column:\s*email/i.test(message);
};

const normalizeAccountRow = (
  row: PlayerAccountRow | null | undefined,
): PlayerAccountRow | null => {
  if (!row) {
    return null;
  }

  const iterations = Number(row.password_iters);

  return {
    ...row,
    email: row.email ? String(row.email).trim().toLowerCase() : null,
    password_iters: Number.isFinite(iterations) && iterations > 0
      ? iterations
      : PASSWORD_PBKDF2_ITERATIONS,
    signup_index: (() => {
      if (row.signup_index == null) {
        return null;
      }
      const index = Number(row.signup_index);
      return Number.isFinite(index) ? index : null;
    })(),
  };
};

const selectAccount = async (
  db: D1Database,
  whereSql: string,
  bindValue: string,
) => {
  try {
    const row = await db
      .prepare(
        `SELECT ${ACCOUNT_SELECT_COLUMNS}
         FROM player_accounts
         WHERE ${whereSql}`,
      )
      .bind(bindValue)
      .first<PlayerAccountRow>();
    return normalizeAccountRow(row);
  } catch (error) {
    if (isMissingEmailColumn(error)) {
      try {
        const row = await db
          .prepare(
            `SELECT ${ACCOUNT_SELECT_COLUMNS_NO_EMAIL}
             FROM player_accounts
             WHERE ${whereSql}`,
          )
          .bind(bindValue)
          .first<PlayerAccountRow>();
        return normalizeAccountRow(row ? { ...row, email: null } : null);
      } catch (innerError) {
        if (!isMissingSignupIndexColumn(innerError)) {
          throw innerError;
        }
      }
    } else if (!isMissingSignupIndexColumn(error)) {
      throw error;
    }

    // Production may still be on migration 0010 until 0012 is applied.
    const row = await db
      .prepare(
        `SELECT ${ACCOUNT_SELECT_COLUMNS_LEGACY}
         FROM player_accounts
         WHERE ${whereSql}`,
      )
      .bind(bindValue)
      .first<PlayerAccountRow>();
    return normalizeAccountRow(
      row ? { ...row, email: null, signup_index: null } : null,
    );
  }
};

export const getAccountByUsername = async (
  db: D1Database,
  username: string,
) => selectAccount(db, "username = ?", username);

export const getAccountByPlayerId = async (
  db: D1Database,
  playerId: string,
) => selectAccount(db, "player_id = ?", playerId);

/** Lightweight username lookup for opponent labels (null if unlinked). */
export const getUsernameByPlayerId = async (
  db: D1Database,
  playerId: string,
): Promise<string | null> => {
  const trimmed = playerId.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const row = await db
      .prepare(
        `SELECT username FROM player_accounts WHERE player_id = ? LIMIT 1`,
      )
      .bind(trimmed)
      .first<{ username: string }>();
    const username = row?.username?.trim().toLowerCase();
    return username || null;
  } catch {
    return null;
  }
};

export const getAccountByEmail = async (db: D1Database, email: string) =>
  selectAccount(db, "email = ?", email);

export const createPlayerAccount = async (
  db: D1Database,
  params: {
    username: string;
    email: string;
    password: string;
    playerId: string;
  },
) => {
  const hashed = await hashPassword(params.password);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    await db
      .prepare(
        `INSERT INTO player_accounts (
           id, username, email, password_salt, password_hash, password_iters,
           player_id, created_at, last_login_at, signup_index
         ) VALUES (
           ?, ?, ?, ?, ?, ?, ?, ?, NULL,
           (SELECT COALESCE(MAX(signup_index), 0) + 1 FROM player_accounts)
         )`,
      )
      .bind(
        id,
        params.username,
        params.email,
        hashed.saltHex,
        hashed.hashHex,
        hashed.iterations,
        params.playerId,
        createdAt,
      )
      .run();
  } catch (error) {
    if (isMissingEmailColumn(error)) {
      throw new Error(
        "Account database needs an update. Apply D1 migrations, then retry.",
      );
    }

    if (!isMissingSignupIndexColumn(error)) {
      throw error;
    }

    await db
      .prepare(
        `INSERT INTO player_accounts (
           id, username, email, password_salt, password_hash, password_iters,
           player_id, created_at, last_login_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      )
      .bind(
        id,
        params.username,
        params.email,
        hashed.saltHex,
        hashed.hashHex,
        hashed.iterations,
        params.playerId,
        createdAt,
      )
      .run();
  }

  const created = await getAccountByPlayerId(db, params.playerId);
  const signupIndex = created?.signup_index ?? null;

  return {
    id,
    username: params.username,
    email: params.email,
    playerId: params.playerId,
    createdAt,
    signupIndex,
    foundingGm: isFoundingGmSignupIndex(signupIndex),
  };
};

export const verifyAccountPassword = async (
  account: PlayerAccountRow,
  password: string,
) => {
  const iterations = Number(account.password_iters);

  return verifyPassword({
    password,
    saltHex: String(account.password_salt ?? ""),
    hashHex: String(account.password_hash ?? ""),
    iterations:
      Number.isFinite(iterations) && iterations > 0
        ? iterations
        : PASSWORD_PBKDF2_ITERATIONS,
  });
};

export const touchAccountLogin = async (db: D1Database, accountId: string) => {
  await db
    .prepare(`UPDATE player_accounts SET last_login_at = ? WHERE id = ?`)
    .bind(new Date().toISOString(), accountId)
    .run();
};

export const updateAccountPassword = async (
  db: D1Database,
  accountId: string,
  password: string,
) => {
  const hashed = await hashPassword(password);
  await db
    .prepare(
      `UPDATE player_accounts
       SET password_salt = ?, password_hash = ?, password_iters = ?
       WHERE id = ?`,
    )
    .bind(hashed.saltHex, hashed.hashHex, hashed.iterations, accountId)
    .run();
};

const getClientIp = (request: Request) => {
  const forwarded = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";

  return forwarded.slice(0, 64);
};

export const buildAuthRateLimitKey = (request: Request, username: string) =>
  `${getClientIp(request)}:${username}`.slice(0, 160);

export const buildRegisterRateLimitKey = (request: Request) =>
  `register:${getClientIp(request)}`.slice(0, 160);

export const assertRateLimitAllow = async (
  db: D1Database,
  bucketKey: string,
  options: { maxAttempts: number; windowMs: number },
) => {
  const now = Date.now();
  const row = await db
    .prepare(
      `SELECT bucket_key, window_start, attempt_count
       FROM auth_rate_limits
       WHERE bucket_key = ?`,
    )
    .bind(bucketKey)
    .first<{
      bucket_key: string;
      window_start: string;
      attempt_count: number;
    }>();

  if (!row) {
    return { ok: true as const };
  }

  const windowStart = Date.parse(row.window_start);
  if (!Number.isFinite(windowStart) || now - windowStart > options.windowMs) {
    await db
      .prepare(`DELETE FROM auth_rate_limits WHERE bucket_key = ?`)
      .bind(bucketKey)
      .run();
    return { ok: true as const };
  }

  if (row.attempt_count >= options.maxAttempts) {
    return {
      ok: false as const,
      error: "Too many attempts. Try again in about 15 minutes.",
    };
  }

  return { ok: true as const };
};

export const assertAuthRateLimitAllow = async (
  db: D1Database,
  bucketKey: string,
) =>
  assertRateLimitAllow(db, bucketKey, {
    maxAttempts: AUTH_RATE_LIMIT_MAX_ATTEMPTS,
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  });

export const assertRegisterRateLimitAllow = async (
  db: D1Database,
  bucketKey: string,
) =>
  assertRateLimitAllow(db, bucketKey, {
    maxAttempts: REGISTER_RATE_LIMIT_MAX_ATTEMPTS,
    windowMs: REGISTER_RATE_LIMIT_WINDOW_MS,
  });

export const recordRateLimitAttempt = async (
  db: D1Database,
  bucketKey: string,
  windowMs: number,
) => {
  const nowIso = new Date().toISOString();
  const existing = await db
    .prepare(
      `SELECT bucket_key, window_start, attempt_count
       FROM auth_rate_limits
       WHERE bucket_key = ?`,
    )
    .bind(bucketKey)
    .first<{
      bucket_key: string;
      window_start: string;
      attempt_count: number;
    }>();

  if (!existing) {
    try {
      await db
        .prepare(
          `INSERT INTO auth_rate_limits (bucket_key, window_start, attempt_count)
           VALUES (?, ?, 1)`,
        )
        .bind(bucketKey, nowIso)
        .run();
    } catch {
      // Concurrent first insert — ignore and let the next attempt update.
    }
    return;
  }

  const windowStart = Date.parse(existing.window_start);
  if (!Number.isFinite(windowStart) || Date.now() - windowStart > windowMs) {
    await db
      .prepare(
        `UPDATE auth_rate_limits
         SET window_start = ?, attempt_count = 1
         WHERE bucket_key = ?`,
      )
      .bind(nowIso, bucketKey)
      .run();
    return;
  }

  await db
    .prepare(
      `UPDATE auth_rate_limits
       SET attempt_count = attempt_count + 1
       WHERE bucket_key = ?`,
    )
    .bind(bucketKey)
    .run();
};

export const recordAuthFailure = async (db: D1Database, bucketKey: string) => {
  await recordRateLimitAttempt(db, bucketKey, AUTH_RATE_LIMIT_WINDOW_MS);
};

export const recordRegisterAttempt = async (
  db: D1Database,
  bucketKey: string,
) => {
  await recordRateLimitAttempt(db, bucketKey, REGISTER_RATE_LIMIT_WINDOW_MS);
};

export const clearAuthRateLimit = async (db: D1Database, bucketKey: string) => {
  await db
    .prepare(`DELETE FROM auth_rate_limits WHERE bucket_key = ?`)
    .bind(bucketKey)
    .run();
};
