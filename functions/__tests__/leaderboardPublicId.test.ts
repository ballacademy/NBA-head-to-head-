import { describe, expect, it } from "vitest";
import {
  isPublicOpaquePlayerId,
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
});
