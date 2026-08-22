import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchWithTimeout,
  joinPrivateRoom,
  PRIVATE_ROOM_ABORTED_MESSAGE,
  waitForPrivateRoomGuest,
} from "./privateMatchmaking";

describe("private room freeze guards", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({}), { status: 500 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("aborts hung fetches via timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: RequestInfo, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      ),
    );

    await expect(
      fetchWithTimeout("/api/private-room", {}, 20),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("maps aborted join to a cancelled error instead of hanging", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: RequestInfo, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      ),
    );

    const joinPromise = joinPrivateRoom({
      roomCode: "ABC234",
      playerId: "guest-1",
      teamName: "Guest",
      elo: 500,
      expectedMode: "classic",
      signal: controller.signal,
    });

    controller.abort();

    await expect(joinPromise).resolves.toEqual({
      error: PRIVATE_ROOM_ABORTED_MESSAGE,
    });
  });

  it("exits the host wait loop when the abort signal fires", async () => {
    const controller = new AbortController();
    let polls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        if (method === "DELETE") {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        polls += 1;
        return new Response(
          JSON.stringify({
            status: "waiting",
            roomCode: "ABC234",
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          }),
          { status: 200 },
        );
      }),
    );

    const waitPromise = waitForPrivateRoomGuest(
      { roomCode: "ABC234", playerId: "host-1" },
      { signal: controller.signal, pollIntervalMs: 5 },
    );

    await Promise.resolve();
    controller.abort();

    await expect(waitPromise).resolves.toEqual({
      ok: false,
      error: "cancelled",
    });
    expect(polls).toBeGreaterThan(0);
  });
});
