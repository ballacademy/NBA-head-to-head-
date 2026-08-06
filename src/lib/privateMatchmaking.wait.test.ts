import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitForPrivateRoomGuest } from "./privateMatchmaking";

describe("waitForPrivateRoomGuest", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({}), { status: 500 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns matched on a final poll after cancel races a join", async () => {
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
              roomCode: "ABC234",
              expiresAt: new Date(Date.now() + 60_000).toISOString(),
            }),
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({
            status: "matched",
            roomCode: "ABC234",
            matchId: "match-1",
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

    let cancelled = false;
    const waitPromise = waitForPrivateRoomGuest(
      { roomCode: "ABC234", playerId: "host-1" },
      { isCancelled: () => cancelled },
    );

    // Cancel after the first waiting poll is in flight / between polls.
    await Promise.resolve();
    cancelled = true;

    const result = await waitPromise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.matched.matchId).toBe("match-1");
    }
  });
});
