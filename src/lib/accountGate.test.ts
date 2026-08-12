import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAccountLinkCache,
  isPlayerAccountLinked,
  markPlayerAccountLinked,
  peekCachedAccountLinked,
} from "./accountGate";

describe("accountGate", () => {
  beforeEach(() => {
    clearAccountLinkCache();
    vi.unstubAllGlobals();
  });

  it("treats linked account status as required for competitive writes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            linked: true,
            playerId: "p1",
            username: "ace",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(isPlayerAccountLinked("p1")).resolves.toBe(true);
  });

  it("fails closed when status cannot be confirmed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );

    await expect(isPlayerAccountLinked("p2")).resolves.toBe(false);
  });

  it("uses the in-memory mark after login/register", async () => {
    markPlayerAccountLinked("p3", "nova");
    await expect(isPlayerAccountLinked("p3")).resolves.toBe(true);
    markPlayerAccountLinked("p3", null);
    await expect(isPlayerAccountLinked("p3")).resolves.toBe(false);
  });

  it("peeks cached link state without a network round-trip", () => {
    expect(peekCachedAccountLinked("p4")).toBeNull();
    markPlayerAccountLinked("p4", "nova");
    expect(peekCachedAccountLinked("p4")).toBe(true);
    markPlayerAccountLinked("p4", null);
    expect(peekCachedAccountLinked("p4")).toBe(false);
  });
});
