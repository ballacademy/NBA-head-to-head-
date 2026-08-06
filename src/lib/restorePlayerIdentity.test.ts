import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccountLinkCache, markPlayerAccountLinked } from "./accountGate";
import { readJson, writeJson } from "./browserStorage";
import {
  getOrCreatePlayerIdentity,
  setPlayerIdentity,
} from "./playerIdentity";
import { logoutToAnonymousIdentity } from "./restorePlayerIdentity";

const storage = new Map<string, string>();

const localStorageMock = {
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
};

describe("logoutToAnonymousIdentity", () => {
  beforeEach(() => {
    storage.clear();
    clearAccountLinkCache();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-anonymous-new",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mints a new anonymous identity and clears account-bound local state", () => {
    setPlayerIdentity("player-linked-old");
    markPlayerAccountLinked("player-linked-old", "hooper");
    writeJson("nba-head-to-head-team-profile", { name: "Old Team" });
    writeJson("nba-head-to-head-classic-profile", {
      playerId: "player-linked-old",
      elo: 600,
    });
    writeJson("nba-head-to-head-event-profiles", { "event-1": { wins: 2 } });
    writeJson("nba-head-to-head-tier-list", { tiers: [] });
    writeJson("nba-head-to-head-tier-list-library", { lists: [] });
    writeJson("nba-head-to-head-tier-list-public", { entries: [] });
    writeJson("nba-head-to-head-pending-lineup-classic-player-linked-old", {
      storedLineupId: "lineup-1",
      mode: "classic",
      submittedAt: "2026-08-01T00:00:00.000Z",
    });

    const next = logoutToAnonymousIdentity();

    expect(next.playerId).toBe("player-anonymous-new");
    expect(getOrCreatePlayerIdentity().playerId).toBe("player-anonymous-new");
    expect(readJson("nba-head-to-head-team-profile")).toBeNull();
    expect(readJson("nba-head-to-head-classic-profile")).toBeNull();
    expect(readJson("nba-head-to-head-event-profiles")).toBeNull();
    expect(readJson("nba-head-to-head-tier-list")).toBeNull();
    expect(readJson("nba-head-to-head-tier-list-library")).toBeNull();
    expect(readJson("nba-head-to-head-tier-list-public")).toBeNull();
    expect(
      readJson("nba-head-to-head-pending-lineup-classic-player-linked-old"),
    ).toBeNull();
  });
});
