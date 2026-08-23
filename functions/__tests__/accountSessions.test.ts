import { describe, expect, it } from "vitest";
import {
  buildSessionClearCookie,
  buildSessionSetCookie,
  hashSessionToken,
  readSessionTokenFromRequest,
  SESSION_COOKIE_NAME,
} from "../lib/accountSessions";

describe("accountSessions", () => {
  it("hashes session tokens deterministically", async () => {
    const first = await hashSessionToken("session-token-abc");
    const second = await hashSessionToken("session-token-abc");
    expect(first).toBe(second);
    expect(first).toHaveLength(64);
    expect(first).not.toBe(await hashSessionToken("other-token"));
  });

  it("reads a valid session cookie from the request", () => {
    const token = "a".repeat(32);
    const request = new Request("https://example.com/api/account/status", {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      },
    });
    expect(readSessionTokenFromRequest(request)).toBe(token);
  });

  it("rejects missing or short session cookies", () => {
    expect(
      readSessionTokenFromRequest(new Request("https://example.com")),
    ).toBeNull();
    expect(
      readSessionTokenFromRequest(
        new Request("https://example.com", {
          headers: { Cookie: `${SESSION_COOKIE_NAME}=short` },
        }),
      ),
    ).toBeNull();
  });

  it("builds secure session cookies", () => {
    expect(buildSessionSetCookie("tok")).toContain("HttpOnly");
    expect(buildSessionSetCookie("tok")).toContain("Secure");
    expect(buildSessionSetCookie("tok")).toContain("SameSite=Lax");
    expect(buildSessionClearCookie()).toContain("Max-Age=0");
  });
});
