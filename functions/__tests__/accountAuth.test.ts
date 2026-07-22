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
