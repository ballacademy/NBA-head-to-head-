import { describe, expect, it } from "vitest";
import {
  isPublicOpaquePlayerId,
  toLeaderboardPublicEntry,
  toPublicLeaderboardPlayerId,
} from "../lib/leaderboardPublicId";

describe("leaderboardPublicId", () => {
  it("creates stable opaque ids that are not raw player uuids", async () => {
    const playerId = "11111111-2222-4333-8444-555555555555";
    const opaque = await toPublicLeaderboardPlayerId(playerId);

    expect(isPublicOpaquePlayerId(opaque)).toBe(true);
    expect(opaque).not.toContain(playerId);
    await expect(toPublicLeaderboardPlayerId(playerId)).resolves.toBe(opaque);
  });

  it("includes optional username on public entries", async () => {
    const entry = await toLeaderboardPublicEntry(
      {
        player_id: "11111111-2222-4333-8444-555555555555",
        team_name: "Bulls",
        public_tag: "7F3A",
        elo: 1000,
        wins: 2,
        losses: 1,
        win_streak: 2,
        loss_streak: 0,
        updated_at: "2099-01-01T00:00:00.000Z",
        username: "Coach_One",
      },
      "viewer",
    );

    expect(entry.username).toBe("coach_one");
    expect(entry.playerId.startsWith("p_")).toBe(true);
  });
});
