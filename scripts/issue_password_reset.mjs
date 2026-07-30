#!/usr/bin/env node
/**
 * Issue a one-time password reset code for a Draft Day GM username.
 *
 * Usage (from repo root, after migration 0013 is applied):
 *   node scripts/issue_password_reset.mjs their_username
 *
 * Then email the printed code to the player. Codes expire in 1 hour.
 *
 * Optional: set ACCOUNT_RESET_SECRET and call the live API instead of wrangler:
 *   set ACCOUNT_RESET_SECRET=your-secret
 *   set ACCOUNT_RESET_API=https://www.draftdaygm.com
 *   node scripts/issue_password_reset.mjs their_username
 */

import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
const DB_NAME = "draft-day-gm";

const normalizeUsername = (value) => value.trim().toLowerCase();

const hashResetCode = (code) =>
  createHash("sha256").update(code.trim().toLowerCase(), "utf8").digest("hex");

const generateResetCode = () => randomBytes(4).toString("hex").toUpperCase();

const runWranglerJson = (args) => {
  const output = execFileSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(output);
};

const issueViaApi = async (username, secret, apiBase) => {
  const response = await fetch(`${apiBase.replace(/\/$/, "")}/api/account/issue-reset`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ username }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `API error ${response.status}`);
  }

  return body;
};

const issueViaWrangler = (username) => {
  const lookup = runWranglerJson([
    "d1",
    "execute",
    DB_NAME,
    "--remote",
    "--json",
    "--command",
    `SELECT id, username FROM player_accounts WHERE username = '${username}' LIMIT 1`,
  ]);

  const rows =
    lookup?.[0]?.results ??
    lookup?.results ??
    (Array.isArray(lookup) ? lookup : []);
  const account = rows[0];
  if (!account?.id) {
    throw new Error(`No account found for username "${username}".`);
  }

  const code = generateResetCode();
  const tokenHash = hashResetCode(code);
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const id = crypto.randomUUID();

  runWranglerJson([
    "d1",
    "execute",
    DB_NAME,
    "--remote",
    "--json",
    "--command",
    `UPDATE password_reset_tokens SET used_at = '${createdAt}' WHERE account_id = '${account.id}' AND used_at IS NULL`,
  ]);

  runWranglerJson([
    "d1",
    "execute",
    DB_NAME,
    "--remote",
    "--json",
    "--command",
    `INSERT INTO password_reset_tokens (id, account_id, token_hash, created_at, expires_at, used_at) VALUES ('${id}', '${account.id}', '${tokenHash}', '${createdAt}', '${expiresAt}', NULL)`,
  ]);

  return {
    ok: true,
    username: account.username,
    resetCode: code,
    expiresAt,
  };
};

const main = async () => {
  const raw = process.argv[2];
  if (!raw) {
    console.error("Usage: node scripts/issue_password_reset.mjs <username>");
    process.exit(1);
  }

  const username = normalizeUsername(raw);
  if (!USERNAME_RE.test(username)) {
    console.error(
      "Username must be 3-24 characters: lowercase letters, numbers, underscore.",
    );
    process.exit(1);
  }

  const secret = process.env.ACCOUNT_RESET_SECRET?.trim();
  const apiBase =
    process.env.ACCOUNT_RESET_API?.trim() || "https://www.draftdaygm.com";

  let result;
  if (secret) {
    result = await issueViaApi(username, secret, apiBase);
  } else {
    result = issueViaWrangler(username);
  }

  console.log("");
  console.log(`Reset code for @${result.username}: ${result.resetCode}`);
  console.log(`Expires at: ${result.expiresAt}`);
  console.log("");
  console.log("Email that code to the player. They use Account → Forgot password.");
  console.log("");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
