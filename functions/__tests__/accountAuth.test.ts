import { describe, expect, it } from "vitest";
import {
  normalizeUsername,
  validatePassword,
  validatePlayerId,
  validateUsername,
} from "../lib/accountCredentials";
import {
  hashPassword,
  timingSafeEqualHex,
  verifyPassword,
} from "../lib/passwordHash";
import {
  FOUNDING_GM_ACCOUNT_LIMIT,
  isFoundingGmSignupIndex,
} from "../lib/foundingGm";

describe("accountCredentials", () => {
  it("normalizes and validates usernames", () => {
    expect(normalizeUsername("  Coach_One ")).toBe("coach_one");
    expect(validateUsername("ab").ok).toBe(false);
    expect(validateUsername("valid_user").ok).toBe(true);
    expect(validateUsername("Bad Name").ok).toBe(false);
  });

  it("validates password length", () => {
    expect(validatePassword("short").ok).toBe(false);
    expect(validatePassword("longenough").ok).toBe(true);
  });

  it("requires a player id for registration", () => {
    expect(validatePlayerId("").ok).toBe(false);
    expect(validatePlayerId("player-123").ok).toBe(true);
  });
});

describe("foundingGm", () => {
  it("limits the Founding GM badge to the first 500 accounts", () => {
    expect(isFoundingGmSignupIndex(1)).toBe(true);
    expect(isFoundingGmSignupIndex(500)).toBe(true);
    expect(isFoundingGmSignupIndex(FOUNDING_GM_ACCOUNT_LIMIT)).toBe(true);
    expect(isFoundingGmSignupIndex(501)).toBe(false);
  });
});

describe("verifyAccountPassword", () => {
  it("verifies when D1 returns password_iters as a numeric string", async () => {
    const { verifyAccountPassword } = await import("../lib/playerAccounts");
    const hashed = await hashPassword("correct-horse-battery");

    await expect(
      verifyAccountPassword(
        {
          id: "acc-1",
          username: "coach_one",
          password_salt: hashed.saltHex,
          password_hash: hashed.hashHex,
          password_iters: String(hashed.iterations) as unknown as number,
          player_id: "player-1",
          created_at: new Date().toISOString(),
          last_login_at: null,
          signup_index: null,
        },
        "correct-horse-battery",
      ),
    ).resolves.toBe(true);
  });
});

describe("passwordReset", () => {
  it("normalizes and validates reset codes", async () => {
    const {
      normalizeResetCode,
      validateResetCodeFormat,
      hashResetCode,
      resetCodeHashesMatch,
      generateResetCode,
    } = await import("../lib/passwordReset");

    expect(normalizeResetCode(" A1-b2 C3d4 ")).toBe("a1b2c3d4");
    expect(validateResetCodeFormat("short").ok).toBe(false);
    expect(validateResetCodeFormat("A1B2C3D4").ok).toBe(true);

    const code = generateResetCode();
    expect(code).toMatch(/^[A-F0-9]{8}$/);
    const hash = await hashResetCode(code);
    const again = await hashResetCode(code.toLowerCase());
    expect(resetCodeHashesMatch(hash, again)).toBe(true);
  });
});

describe("passwordHash", () => {
  it("hashes with PBKDF2 and verifies matches", async () => {
    const hashed = await hashPassword("correct-horse-battery");
    expect(hashed.saltHex).toHaveLength(32);
    expect(hashed.hashHex).toHaveLength(64);
    expect(hashed.iterations).toBeGreaterThanOrEqual(100_000);

    await expect(
      verifyPassword({
        password: "correct-horse-battery",
        saltHex: hashed.saltHex,
        hashHex: hashed.hashHex,
        iterations: hashed.iterations,
      }),
    ).resolves.toBe(true);

    await expect(
      verifyPassword({
        password: "wrong-password",
        saltHex: hashed.saltHex,
        hashHex: hashed.hashHex,
        iterations: hashed.iterations,
      }),
    ).resolves.toBe(false);
  });

  it("compares hashes in constant-time style", () => {
    expect(timingSafeEqualHex("abcd", "abcd")).toBe(true);
    expect(timingSafeEqualHex("abcd", "abce")).toBe(false);
    expect(timingSafeEqualHex("ab", "abcd")).toBe(false);
  });
});
