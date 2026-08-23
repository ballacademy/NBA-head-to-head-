import { describe, expect, it } from "vitest";
import {
  emptyEventProfilesPayload,
  mergeEventProfilesPayload,
  normalizeEventProfilesPayload,
  parseEventProfilesJson,
} from "./eventProfileShared";

describe("eventProfileShared", () => {
  it("normalizes partial event profiles", () => {
    expect(
      normalizeEventProfilesPayload({
        byEventId: {
          "event-a": { wins: 2, losses: 1, matchesPlayed: 3 },
        },
      }),
    ).toMatchObject({
      byEventId: {
        "event-a": {
          eventId: "event-a",
          wins: 2,
          losses: 1,
          matchesPlayed: 3,
        },
      },
    });
  });

  it("merges profiles as a unit without inventing W–L", () => {
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
      losses: 1,
      matchesPlayed: 4,
      winStreak: 2,
      lossStreak: 0,
      elo: 1048,
    });

    right.byEventId["event-a"] = {
      ...right.byEventId["event-a"]!,
      wins: 5,
      losses: 2,
      matchesPlayed: 7,
      elo: 1100,
    };
    expect(
      mergeEventProfilesPayload(left, right).byEventId["event-a"],
    ).toMatchObject({
      wins: 5,
      losses: 2,
      matchesPlayed: 7,
      elo: 1100,
    });
  });

  it("parses invalid JSON as empty profiles", () => {
    expect(parseEventProfilesJson("{")).toEqual(emptyEventProfilesPayload());
  });
});
