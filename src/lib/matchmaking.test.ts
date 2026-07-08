import { describe, expect, it, vi, beforeEach } from "vitest";
import { syncPendingLineupLock } from "./matchmaking";

const stubStorage = () => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  });
  return storage;
};

describe("syncPendingLineupLock", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps local pending lineup state when the status request fails", async () => {
    const storage = stubStorage();
    storage.set(
      "nba-head-to-head-pending-lineup-classic-player-1",
      JSON.stringify({
        storedLineupId: "lineup-1",
        mode: "classic",
        submittedAt: "2026-01-01T00:00:00.000Z",
      }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const status = await syncPendingLineupLock({
      mode: "classic",
      playerId: "player-1",
    });

    expect(status).toBeNull();
    expect(storage.has("nba-head-to-head-pending-lineup-classic-player-1")).toBe(
      true,
    );
  });
});
