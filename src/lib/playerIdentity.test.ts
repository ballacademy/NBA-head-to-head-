import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeJson } from "./browserStorage";
import {
  derivePublicTag,
  formatGmDisplayName,
  formatPublicTag,
  getOrCreatePlayerIdentity,
  resolvePublicTag,
  setPlayerIdentity,
} from "./playerIdentity";

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  clear: () => {
    storage.clear();
  },
};

describe("playerIdentity", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "11111111-2222-4333-8444-555555555555",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("derives a stable four-character public tag from a player id", () => {
    const tag = derivePublicTag("11111111-2222-4333-8444-555555555555");

    expect(tag).toMatch(/^[0-9A-F]{4}$/);
    expect(derivePublicTag("11111111-2222-4333-8444-555555555555")).toBe(tag);
  });

  it("formats display names with a public tag suffix", () => {
    expect(formatPublicTag("7f3a")).toBe("#7F3A");
    expect(formatGmDisplayName("hoopers", "7F3A")).toBe("hoopers · #7F3A");
  });

  it("creates and persists a player identity", () => {
    const first = getOrCreatePlayerIdentity();
    const second = getOrCreatePlayerIdentity();

    expect(first.playerId).toBe("11111111-2222-4333-8444-555555555555");
    expect(first.publicTag).toBe(resolvePublicTag(first.playerId));
    expect(second).toEqual(first);
  });

  it("migrates legacy player ids into the identity store", () => {
    storage.set(
      "nba-head-to-head-player-id",
      JSON.stringify({ playerId: "legacy-player-id" }),
    );

    const identity = getOrCreatePlayerIdentity();

    expect(identity.playerId).toBe("legacy-player-id");
    expect(identity.publicTag).toBe(derivePublicTag("legacy-player-id"));
    expect(storage.has("nba-head-to-head-player-identity")).toBe(true);
  });

  it("can replace the local GM identity after login", () => {
    const original = getOrCreatePlayerIdentity();
    expect(original.playerId).toBeTruthy();

    const restoredId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const restored = setPlayerIdentity(restoredId);

    expect(restored.playerId).toBe(restoredId);
    expect(restored.publicTag).toBe(derivePublicTag(restoredId));
    expect(getOrCreatePlayerIdentity()).toEqual(restored);
  });

  it("keeps a previously saved identity until setPlayerIdentity runs", () => {
    writeJson("nba-head-to-head-player-identity", {
      playerId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      publicTag: "ABCD",
    });

    const identity = getOrCreatePlayerIdentity();
    expect(identity.playerId).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  });
});
