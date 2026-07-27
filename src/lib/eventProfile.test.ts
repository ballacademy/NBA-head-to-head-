import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canPlayEventMatch,
  loadEventProfile,
  persistEventMatchOutcome,
} from "./eventProfile";

const storage = (() => {
  let store: Record<string, string> = {};
  return {
    clear: () => {
      store = {};
    },
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

describe("eventProfile", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", storage);
  });

  it("tracks wins and enforces the 30-match cap", () => {
    const eventId = "2026-W30-u25";
    expect(canPlayEventMatch(eventId)).toBe(true);

    for (let index = 0; index < 30; index += 1) {
      persistEventMatchOutcome(eventId, "win", `match-${index}`);
    }

    const profile = loadEventProfile(eventId);
    expect(profile.matchesPlayed).toBe(30);
    expect(profile.wins).toBe(30);
    expect(profile.badges).toContain("gold");
    expect(canPlayEventMatch(eventId)).toBe(false);
  });

  it("is idempotent for the same match id", () => {
    const eventId = "2026-W31-intl";
    persistEventMatchOutcome(eventId, "win", "same-match");
    persistEventMatchOutcome(eventId, "loss", "same-match");
    expect(loadEventProfile(eventId).wins).toBe(1);
    expect(loadEventProfile(eventId).losses).toBe(0);
  });
});
