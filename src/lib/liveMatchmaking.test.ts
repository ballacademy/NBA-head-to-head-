import { afterEach, describe, expect, it, vi } from "vitest";
import { players } from "./playerPool";
import {
  resolveLiveOpponentLineup,
  searchLiveOpponent,
} from "./liveMatchmaking";
import { RANKED_SALARY_CAP } from "./salaryCap";

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

  it("treats a post-cancel leave match as matched", async () => {
    let deleted = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("/api/queue") && init?.method === "POST") {
        return new Response(
          JSON.stringify({ status: "waiting", joinedAt: "2026-06-26T00:00:00.000Z" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.includes("/api/queue") && init?.method === "DELETE") {
        deleted = true;
        return new Response(JSON.stringify({ status: "left" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.includes("/api/queue")) {
        if (deleted) {
          return new Response(
            JSON.stringify({
              status: "matched",
              matchId: "match-cancel-race",
              teamName: "Away",
              elo: 1180,
              playerId: "opp-1",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

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

    expect(result).toEqual({
      matchId: "match-cancel-race",
      teamName: "Away",
      elo: 1180,
      playerId: "opp-1",
    });
  });
});

describe("resolveLiveOpponentLineup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("locks a seeded autofill on the server when the opponent times out", async () => {
    const serverLineup = ["p1", "p2", "p3", "p4", "p5"];
    let autofillBody: {
      matchId?: string;
      playerId?: string;
      autofillOpponentLineup?: boolean;
      lineup?: string[];
    } | null = null;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/live-match") && init?.method === "POST") {
        autofillBody = JSON.parse(String(init.body)) as {
          matchId?: string;
          playerId?: string;
          autofillOpponentLineup?: boolean;
          lineup?: string[];
        };
        return new Response(
          JSON.stringify({
            matchId: "match-1",
            opponentTeamName: "Away",
            opponentElo: 1200,
            opponentPlayerId: "opp-1",
            selfReady: true,
            opponentReady: true,
            opponentLineup: serverLineup,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.includes("/api/live-match")) {
        return new Response(
          JSON.stringify({
            matchId: "match-1",
            opponentTeamName: "Away",
            opponentElo: 1200,
            opponentPlayerId: "opp-1",
            selfReady: true,
            opponentReady: false,
            opponentLineup: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const resolved = await resolveLiveOpponentLineup(
      {
        matchId: "match-1",
        playerId: "self-1",
        opponentPlayerId: "opp-1",
        players,
        salaryCapLimit: RANKED_SALARY_CAP,
      },
      { timeoutMs: 20, pollIntervalMs: 5 },
    );

    expect(resolved).toEqual({
      lineup: serverLineup,
      autoDrafted: true,
    });
    expect(autofillBody).not.toBeNull();
    expect(autofillBody!.matchId).toBe("match-1");
    expect(autofillBody!.playerId).toBe("self-1");
    expect(autofillBody!.autofillOpponentLineup).toBe(true);
    expect(autofillBody!.lineup).toHaveLength(5);
  });

  it("uses the opponent's real lineup when they finish before timeout", async () => {
    const realLineup = ["a", "b", "c", "d", "e"];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/live-match")) {
        return new Response(
          JSON.stringify({
            matchId: "match-1",
            opponentTeamName: "Away",
            opponentElo: 1200,
            opponentPlayerId: "opp-1",
            selfReady: true,
            opponentReady: true,
            opponentLineup: realLineup,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const resolved = await resolveLiveOpponentLineup(
      {
        matchId: "match-1",
        playerId: "self-1",
        opponentPlayerId: "opp-1",
        players,
      },
      { timeoutMs: 50, pollIntervalMs: 5 },
    );

    expect(resolved).toEqual({
      lineup: realLineup,
      autoDrafted: false,
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
