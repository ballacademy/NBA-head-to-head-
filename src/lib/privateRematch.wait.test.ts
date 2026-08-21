import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitForPrivateRematch } from "./privateRematch";

describe("waitForPrivateRematch", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({}), { status: 500 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns matched when the opponent rematches during poll", async () => {
    let polls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        if (method === "DELETE") {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        polls += 1;
        if (polls === 1) {
          return new Response(
            JSON.stringify({
              status: "waiting",
              sourceMatchId: "match-old",
              expiresAt: new Date(Date.now() + 60_000).toISOString(),
            }),
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({
            status: "matched",
            sourceMatchId: "match-old",
            matchId: "match-new",
            mode: "classic",
            opponent: {
              playerId: "friend-1",
              teamName: "Friend",
              elo: 520,
            },
          }),
          { status: 200 },
        );
      }),
    );

    const result = await waitForPrivateRematch(
      { sourceMatchId: "match-old", playerId: "self-1" },
      { pollIntervalMs: 1 },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.matched.matchId).toBe("match-new");
      expect(result.matched.opponent.playerId).toBe("friend-1");
    }
  });

  it("fails after repeated poll errors", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "DELETE") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "down" }), { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await waitForPrivateRematch(
      { sourceMatchId: "match-old", playerId: "self-1" },
      { pollIntervalMs: 1, maxConsecutiveErrors: 3 },
    );

    expect(result).toEqual({ ok: false, error: "setup_failed" });
    expect(
      fetchMock.mock.calls.some(
        (call) => (call[1] as RequestInit | undefined)?.method === "DELETE",
      ),
    ).toBe(true);
  });
});
