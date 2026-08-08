import { describe, expect, it } from "vitest";
import {
  filterOutRankedEventBannedPlayers,
  isBannedFromRankedAndEvents,
  isBannedRankedEventPlayer,
  LEBRON_JAMES_BBR_ID,
  lineupContainsRankedEventBannedPlayer,
  matchmakingModeBansRankedEventPlayers,
  shouldApplyRankedEventPlayerBans,
} from "./competitivePlayerBans";
import { findPlayerId, players, playersById } from "./playerPool";

describe("competitivePlayerBans", () => {
  it("targets LeBron James across bbr id and team-suffixed pool ids", () => {
    const poolId = findPlayerId("LeBron James");
    expect(poolId).toBeTruthy();
    expect(poolId?.startsWith(LEBRON_JAMES_BBR_ID)).toBe(true);

    const lebron = players.find(
      (player) => player.bbrPlayerId === LEBRON_JAMES_BBR_ID,
    );
    expect(lebron).toBeTruthy();
    expect(isBannedRankedEventPlayer(lebron!)).toBe(true);
    expect(isBannedFromRankedAndEvents(poolId!)).toBe(true);
    expect(isBannedFromRankedAndEvents(LEBRON_JAMES_BBR_ID)).toBe(true);
    expect(isBannedFromRankedAndEvents("curryst01")).toBe(false);
    expect(playersById.get(poolId!)?.name).toContain("LeBron");
  });

  it("applies only to Pro and Events matchmaking modes", () => {
    expect(matchmakingModeBansRankedEventPlayers("ranked")).toBe(true);
    expect(matchmakingModeBansRankedEventPlayers("event")).toBe(true);
    expect(matchmakingModeBansRankedEventPlayers("classic")).toBe(false);
  });

  it("keeps Daily and practice pools open", () => {
    expect(
      shouldApplyRankedEventPlayerBans({
        salaryCapMode: true,
        practiceMode: true,
      }),
    ).toBe(false);
    expect(
      shouldApplyRankedEventPlayerBans({
        isDailyDraft: true,
        salaryCapMode: true,
      }),
    ).toBe(false);
    expect(
      shouldApplyRankedEventPlayerBans({
        salaryCapMode: true,
      }),
    ).toBe(true);
    expect(
      shouldApplyRankedEventPlayerBans({
        eventId: "week-1",
      }),
    ).toBe(true);
    expect(shouldApplyRankedEventPlayerBans({})).toBe(false);
  });

  it("filters banned ids from pools and lineups", () => {
    const poolId = findPlayerId("LeBron James")!;
    const pool = [
      { id: poolId, bbrPlayerId: LEBRON_JAMES_BBR_ID },
      { id: "curryst01", bbrPlayerId: "curryst01" },
      { id: "jokicni01", bbrPlayerId: "jokicni01" },
    ];

    expect(
      filterOutRankedEventBannedPlayers(pool).map((player) => player.id),
    ).toEqual(["curryst01", "jokicni01"]);
    expect(
      lineupContainsRankedEventBannedPlayer(["curryst01", poolId]),
    ).toBe(true);
  });
});
