import type { PlayerAccountRow } from "../types";
import {
  hashPassword,
  PASSWORD_PBKDF2_ITERATIONS,
  verifyPassword,
} from "./passwordHash";

export const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 8;
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const getAccountByUsername = async (
  db: D1Database,
  username: string,
) =>
  db
    .prepare(
      `SELECT id, username, password_salt, password_hash, password_iters,
              player_id, created_at, last_login_at
       FROM player_accounts
       WHERE username = ?`,
    )
    .bind(username)
    .first<PlayerAccountRow>();

export const getAccountByPlayerId = async (
  db: D1Database,
  playerId: string,
) =>
  db
    .prepare(
      `SELECT id, username, password_salt, password_hash, password_iters,
              player_id, created_at, last_login_at
       FROM player_accounts
       WHERE player_id = ?`,
    )
    .bind(playerId)
    .first<PlayerAccountRow>();

export const createPlayerAccount = async (
  db: D1Database,
  params: {
    username: string;
    password: string;
    playerId: string;
  },
) => {
  const hashed = await hashPassword(params.password);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO player_accounts (
         id, username, password_salt, password_hash, password_iters,
         player_id, created_at, last_login_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    )
    .bind(
      id,
      params.username,
      hashed.saltHex,
      hashed.hashHex,
      hashed.iterations,
      params.playerId,
      createdAt,
    )
    .run();

  return {
    id,
    username: params.username,
    playerId: params.playerId,
    createdAt,
  };
};

export const verifyAccountPassword = async (
  account: PlayerAccountRow,
  password: string,
) =>
  verifyPassword({
    password,
    saltHex: account.password_salt,
    hashHex: account.password_hash,
    iterations: account.password_iters || PASSWORD_PBKDF2_ITERATIONS,
  });

export const touchAccountLogin = async (db: D1Database, accountId: string) => {
  await db
    .prepare(`UPDATE player_accounts SET last_login_at = ? WHERE id = ?`)
    .bind(new Date().toISOString(), accountId)
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

export const assertAuthRateLimitAllow = async (
  db: D1Database,
  bucketKey: string,
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
  if (!Number.isFinite(windowStart) || now - windowStart > AUTH_RATE_LIMIT_WINDOW_MS) {
    await db
      .prepare(`DELETE FROM auth_rate_limits WHERE bucket_key = ?`)
      .bind(bucketKey)
      .run();
    return { ok: true as const };
  }

  if (row.attempt_count >= AUTH_RATE_LIMIT_MAX_ATTEMPTS) {
    return {
      ok: false as const,
      error: "Too many login attempts. Try again in a few minutes.",
    };
  }

  return { ok: true as const };
};

export const recordAuthFailure = async (db: D1Database, bucketKey: string) => {
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
    await db
      .prepare(
        `INSERT INTO auth_rate_limits (bucket_key, window_start, attempt_count)
         VALUES (?, ?, 1)`,
      )
      .bind(bucketKey, nowIso)
      .run();
    return;
  }

  const windowStart = Date.parse(existing.window_start);
  if (
    !Number.isFinite(windowStart) ||
    Date.now() - windowStart > AUTH_RATE_LIMIT_WINDOW_MS
  ) {
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

export const clearAuthRateLimit = async (db: D1Database, bucketKey: string) => {
  await db
    .prepare(`DELETE FROM auth_rate_limits WHERE bucket_key = ?`)
    .bind(bucketKey)
    .run();
};
