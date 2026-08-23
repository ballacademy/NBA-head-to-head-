import type { PlayerAccountRow } from "../types";
import { getAccountByPlayerId } from "./playerAccounts";

export const SESSION_COOKIE_NAME = "ddgm_session";
export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

const jsonAuthError = (error: string, status: number) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const bytesToHex = (bytes: ArrayBuffer | Uint8Array) => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(view, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const hashSessionToken = async (token: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`ddgm-session:${token}`),
  );
  return bytesToHex(digest);
};

const parseCookies = (header: string | null) => {
  const cookies = new Map<string, string>();
  if (!header) {
    return cookies;
  }

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) {
      continue;
    }
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) {
      cookies.set(name, decodeURIComponent(value));
    }
  }

  return cookies;
};

export const readSessionTokenFromRequest = (request: Request) => {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies.get(SESSION_COOKIE_NAME)?.trim() ?? "";
  return token.length >= 32 ? token : null;
};

export const buildSessionSetCookie = (token: string) =>
  `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}`;

export const buildSessionClearCookie = () =>
  `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

export const createAccountSession = async (
  db: D1Database,
  params: { accountId: string; playerId: string },
) => {
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  const tokenHash = await hashSessionToken(token);
  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_SEC * 1000,
  ).toISOString();
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO account_sessions
        (id, account_id, player_id, token_hash, created_at, expires_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    )
    .bind(id, params.accountId, params.playerId, tokenHash, now, expiresAt)
    .run();

  return { token, expiresAt };
};

export const revokeAccountSessionByToken = async (
  db: D1Database,
  token: string,
) => {
  const tokenHash = await hashSessionToken(token);
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE account_sessions
       SET revoked_at = ?
       WHERE token_hash = ? AND revoked_at IS NULL`,
    )
    .bind(now, tokenHash)
    .run();
};

export const resolveSessionFromRequest = async (
  request: Request,
  db: D1Database,
): Promise<{ account: PlayerAccountRow; playerId: string } | null> => {
  const token = readSessionTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const tokenHash = await hashSessionToken(token);
  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `SELECT account_id, player_id
       FROM account_sessions
       WHERE token_hash = ?
         AND revoked_at IS NULL
         AND expires_at >= ?`,
    )
    .bind(tokenHash, now)
    .first<{ account_id: string; player_id: string }>();

  if (!row) {
    return null;
  }

  const account = await getAccountByPlayerId(db, row.player_id);
  if (!account || account.id !== row.account_id) {
    return null;
  }

  return { account, playerId: row.player_id };
};

export const requireLinkedAccountSession = async (
  request: Request,
  db: D1Database,
  bodyPlayerId?: string | null,
):
  | { ok: true; account: PlayerAccountRow; playerId: string }
  | { ok: false; response: Response } => {
  const session = await resolveSessionFromRequest(request, db);
  if (!session) {
    return {
      ok: false,
      response: jsonAuthError("Sign in required.", 401),
    };
  }

  const trimmedBody = typeof bodyPlayerId === "string" ? bodyPlayerId.trim() : "";
  if (trimmedBody && trimmedBody !== session.playerId) {
    return {
      ok: false,
      response: jsonAuthError("Session does not match this GM.", 403),
    };
  }

  return { ok: true, account: session.account, playerId: session.playerId };
};

export const jsonWithSessionCookie = (
  body: unknown,
  token: string,
  status = 200,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "Set-Cookie": buildSessionSetCookie(token),
    },
  });

export const jsonClearingSessionCookie = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "Set-Cookie": buildSessionClearCookie(),
    },
  });
