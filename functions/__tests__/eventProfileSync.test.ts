import { describe, expect, it } from "vitest";
import {
  emptyEventProfilesPayload,
  mergeEventProfilesPayload,
  normalizeEventProfilesPayload,
  parseEventProfilesJson,
} from "../../src/lib/eventProfileShared";

describe("eventProfileSync", () => {
  it("normalizes partial event profile payloads", () => {
    expect(
      normalizeEventProfilesPayload({
        byEventId: {
          "event-a": { wins: 1, losses: 0, matchesPlayed: 1 },
        },
      }),
    ).toMatchObject({
      byEventId: {
        "event-a": { wins: 1, losses: 0, matchesPlayed: 1 },
      },
    });
  });

  it("merges event profiles with max counters", () => {
    const left = emptyEventProfilesPayload();
    left.byEventId["event-a"] = {
      eventId: "event-a",
      wins: 3,
      losses: 1,
      ties: 0,
      matchesPlayed: 4,
      winStreak: 2,
      lossStreak: 0,
      elo: 1048,
      badges: [],
    };
    const right = emptyEventProfilesPayload();
    right.byEventId["event-a"] = {
      eventId: "event-a",
      wins: 2,
      losses: 2,
      ties: 0,
      matchesPlayed: 4,
      winStreak: 1,
      lossStreak: 1,
      elo: 1036,
      badges: [],
    };

    expect(
      mergeEventProfilesPayload(left, right).byEventId["event-a"],
    ).toMatchObject({
      wins: 3,
      losses: 2,
    });
  });

  it("parses invalid JSON as empty profiles", () => {
    expect(parseEventProfilesJson("{")).toEqual(emptyEventProfilesPayload());
  });
});
