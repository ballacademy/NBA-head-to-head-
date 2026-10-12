import { describe, expect, it } from "vitest";
import {
  formatEventLeaderboardLabel,
  mapEventLeaderboardEntry,
} from "./eventLeaderboard";

describe("eventLeaderboard mapping", () => {
  it("reads API name / isYou / username fields (not legacy teamName)", () => {
    const entry = mapEventLeaderboardEntry(
      {
        playerId: "p_abc",
        name: "Ball Academy",
        username: "acegm",
        publicTag: "AB12",
        wins: 12,
        losses: 3,
        isYou: true,
      },
      1,
    );

    expect(entry.teamName).toBe("Ball Academy");
    expect(entry.username).toBe("acegm");
    expect(entry.isViewer).toBe(true);
    expect(entry.matchesPlayed).toBe(15);
    expect(formatEventLeaderboardLabel(entry)).toBe("@acegm");
  });

  it("falls back to team name when username is missing", () => {
    const entry = mapEventLeaderboardEntry(
      {
        playerId: "p_def",
        name: "Midnight Foxes",
        wins: 2,
        losses: 1,
        isYou: false,
      },
      4,
    );

    expect(entry.teamName).toBe("Midnight Foxes");
    expect(entry.username).toBeUndefined();
    expect(entry.isViewer).toBe(false);
    expect(formatEventLeaderboardLabel(entry)).toBe("Midnight Foxes");
  });

  it("does not label every row Unknown when the API uses name", () => {
    const entry = mapEventLeaderboardEntry(
      {
        name: "Kangz",
        isYou: false,
      },
      2,
    );
    expect(entry.teamName).not.toBe("Unknown");
    expect(entry.teamName).toBe("Kangz");
  });
});
