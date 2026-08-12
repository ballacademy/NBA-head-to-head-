import { describe, expect, it, vi } from "vitest";
import { onRequestPost } from "../api/analytics";

const makeContext = (body: unknown, db?: { prepare: ReturnType<typeof vi.fn> }) =>
  ({
    request: new Request("https://example.test/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    env: { DB: db as unknown as D1Database },
    params: {},
    data: {},
    waitUntil: () => undefined,
    next: async () => new Response(null),
    functionPath: "/api/analytics",
  }) as unknown as EventContext<Env, string, Record<string, unknown>>;

describe("POST /api/analytics", () => {
  it("rejects unknown events", async () => {
    const response = await onRequestPost(
      makeContext({ event: "not_allowed" }) as never,
    );
    expect(response.status).toBe(400);
  });

  it("increments counters when the table exists", async () => {
    const run = vi.fn(async () => ({ success: true }));
    const bind = vi.fn(() => ({ run }));
    const prepare = vi.fn(() => ({ bind }));
    const response = await onRequestPost(
      makeContext(
        { event: "daily_finish", at: "2026-08-12T12:00:00.000Z" },
        { prepare },
      ) as never,
    );

    expect(response.status).toBe(204);
    expect(prepare).toHaveBeenCalled();
    expect(bind).toHaveBeenCalledWith(
      "daily_finish",
      "2026-08-12",
      expect.any(String),
    );
  });

  it("fails open when D1 throws", async () => {
    const prepare = vi.fn(() => {
      throw new Error("no such table");
    });
    const response = await onRequestPost(
      makeContext({ event: "share_lineup" }, { prepare }) as never,
    );
    expect(response.status).toBe(204);
  });
});
