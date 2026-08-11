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

  it("applies to Casual, Pro, and Events matchmaking modes", () => {
    expect(matchmakingModeBansRankedEventPlayers("classic")).toBe(true);
    expect(matchmakingModeBansRankedEventPlayers("ranked")).toBe(true);
    expect(matchmakingModeBansRankedEventPlayers("event")).toBe(true);
    expect(matchmakingModeBansRankedEventPlayers("daily")).toBe(false);
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

  it("bans LeBron in live Casual H2H as well as Pro", () => {
    expect(
      shouldApplyRankedEventPlayerBans({
        isDailyDraft: false,
        practiceMode: false,
        salaryCapMode: false,
        classicLive: true,
      }),
    ).toBe(true);
    expect(
      shouldApplyRankedEventPlayerBans({
        isDailyDraft: false,
        practiceMode: false,
        salaryCapMode: false,
      }),
    ).toBe(true);
  });

  it("filters banned ids from pickable pools and lineups", () => {
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

  it("still finds LeBron in the visible draft pool when bans apply", () => {
    const lebron = players.find(
      (player) => player.bbrPlayerId === LEBRON_JAMES_BBR_ID,
    );
    expect(lebron).toBeTruthy();
    expect(isBannedRankedEventPlayer(lebron!)).toBe(true);
    // Display boards keep him; only pickable/auto-draft pools strip him.
    expect(players.some((player) => isBannedRankedEventPlayer(player))).toBe(
      true,
    );
  });

  it("keeps Classic practice and Daily open without an All-Star unlock", async () => {
    const { getDraftablePlayers } = await import("./playerCollection");
    const poolId = findPlayerId("LeBron James")!;
    const lockedCollection = {
      unlockedIds: [] as string[],
      pendingUnlock: null,
      initialized: true as const,
    };

    expect(
      getDraftablePlayers(players, lockedCollection).some(
        (player) => player.id === poolId,
      ),
    ).toBe(true);
    expect(
      shouldApplyRankedEventPlayerBans({
        practiceMode: true,
        salaryCapMode: false,
      }),
    ).toBe(false);
    expect(
      shouldApplyRankedEventPlayerBans({
        isDailyDraft: true,
      }),
    ).toBe(false);
    expect(
      shouldApplyRankedEventPlayerBans({
        isDailyDraft: false,
        practiceMode: false,
        salaryCapMode: true,
      }),
    ).toBe(true);
  });
});
