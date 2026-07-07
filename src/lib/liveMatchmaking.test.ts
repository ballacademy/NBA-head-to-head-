import { afterEach, describe, expect, it, vi } from "vitest";
import { searchLiveOpponent } from "./liveMatchmaking";

describe("searchLiveOpponent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("leaves the queue and exits early when cancelled during polling", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("/api/queue") && init?.method === "POST") {
        return new Response(
          JSON.stringify({ status: "waiting", joinedAt: "2026-06-26T00:00:00.000Z" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.includes("/api/queue") && init?.method === "DELETE") {
        return new Response(JSON.stringify({ status: "left" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.includes("/api/queue")) {
        return new Response(JSON.stringify({ status: "waiting" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    let cancelChecks = 0;
    const result = await searchLiveOpponent(
      {
        mode: "classic",
        playerId: "player-1",
        teamName: "Lakers",
        elo: 1200,
      },
      {
        searchMs: 5_000,
        pollIntervalMs: 50,
        isCancelled: () => {
          cancelChecks += 1;
          return cancelChecks > 1;
        },
      },
    );

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/queue"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
