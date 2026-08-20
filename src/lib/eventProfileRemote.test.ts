import { beforeEach, describe, expect, it, vi } from "vitest";
import { markPlayerAccountLinked } from "./accountGate";
import {
  loadEventProfilesPayload,
  persistEventMatchOutcome,
  saveEventProfilesPayload,
} from "./eventProfile";
import {
  pullAndMergeEventProfiles,
  pushEventProfilesIfLinked,
  resetEventProfilesPullGate,
} from "./eventProfileRemote";
import { setPlayerIdentity } from "./playerIdentity";

vi.mock("./accountGate", async () => {
  const actual = await vi.importActual<typeof import("./accountGate")>(
    "./accountGate",
  );
  return {
    ...actual,
    isPlayerAccountLinked: vi.fn(async () => true),
  };
});

vi.mock("./eventProfileApi", () => ({
  fetchRemoteEventProfiles: vi.fn(),
  pushRemoteEventProfiles: vi.fn(),
}));

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  resetEventProfilesPullGate();
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
  setPlayerIdentity("player-linked");
  markPlayerAccountLinked("player-linked", "hooper");
});

describe("eventProfileRemote", () => {
  it("pulls remote event profiles and merges local progress", async () => {
    saveEventProfilesPayload({
      byEventId: {
        "event-local": {
          eventId: "event-local",
          wins: 1,
          losses: 0,
          ties: 0,
          matchesPlayed: 1,
          winStreak: 1,
          lossStreak: 0,
          elo: 1016,
          badges: [],
        },
      },
    });

    const { fetchRemoteEventProfiles, pushRemoteEventProfiles } = await import(
      "./eventProfileApi"
    );
    vi.mocked(fetchRemoteEventProfiles).mockResolvedValue({
      playerId: "player-linked",
      updatedAt: "2026-08-01T00:00:00.000Z",
      profiles: {
        byEventId: {
          "event-remote": {
            eventId: "event-remote",
            wins: 2,
            losses: 1,
            ties: 0,
            matchesPlayed: 3,
            winStreak: 1,
            lossStreak: 0,
            elo: 1020,
            badges: [],
          },
        },
      },
    });
    vi.mocked(pushRemoteEventProfiles).mockResolvedValue(null);

    const merged = await pullAndMergeEventProfiles("player-linked");

    expect(merged?.byEventId["event-local"]?.wins).toBe(1);
    expect(merged?.byEventId["event-remote"]?.wins).toBe(2);
    expect(loadEventProfilesPayload().byEventId["event-remote"]?.matchesPlayed).toBe(
      3,
    );
  });

  it("does not push before a successful pull unless forced", async () => {
    const { pushRemoteEventProfiles } = await import("./eventProfileApi");
    vi.mocked(pushRemoteEventProfiles).mockResolvedValue(null);

    persistEventMatchOutcome("event-a", "win", "match-1");

    await expect(pushEventProfilesIfLinked("player-linked")).resolves.toBe(false);

    vi.mocked(pushRemoteEventProfiles).mockResolvedValue({
      playerId: "player-linked",
      updatedAt: "2026-08-01T00:00:00.000Z",
      profiles: loadEventProfilesPayload(),
    });
    await expect(
      pushEventProfilesIfLinked("player-linked", { force: true }),
    ).resolves.toBe(true);
  });
});
