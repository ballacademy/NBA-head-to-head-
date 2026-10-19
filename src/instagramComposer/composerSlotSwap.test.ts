import { describe, expect, it } from "vitest";
import {
  COMPOSER_SLOT_ATTR,
  COMPOSER_SLOT_SWAP_THRESHOLD,
  composerSlotClass,
  swapItems,
} from "./composerSlotSwap";
import { swapStrips, createEmptyStrips } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import { PLUS_STARTER_COUNT } from "../teamOfTheWeekPlusComposer/teamOfTheWeekPlusState";
import {
  DEFAULT_POSITION_LABELS,
  swapRankedLineup,
} from "../rankedLineupsComposer/rankedLineupsState";
import { swapCoverSlots, emptyCoverSlot } from "../statCardCoverComposer/statCardCoverState";
import {
  defaultMockTradeDraft,
  mockTradePlayerSlot,
  parseMockTradePlayerSlot,
  swapMockTradePlayers,
} from "../mockTradeComposer/mockTradeState";
import { swapCompareSides, defaultCompareDraft } from "../compareComposer/compareState";

describe("composer slot swap", () => {
  it("swaps two items and leaves the rest", () => {
    expect(swapItems(["a", "b", "c"], 0, 2)).toEqual(["c", "b", "a"]);
    expect(swapItems(["a", "b"], 0, 0)).toEqual(["a", "b"]);
    expect(swapItems(["a", "b"], -1, 1)).toEqual(["a", "b"]);
    expect(COMPOSER_SLOT_ATTR).toBe("data-composer-slot");
    expect(COMPOSER_SLOT_SWAP_THRESHOLD).toBe(8);
    expect(composerSlotClass(1, 1, 2)).toContain("is-slot-dragging");
    expect(composerSlotClass(2, 1, 2)).toContain("is-slot-drop");
  });

  it("moves TOTW photos, names, and logos together", () => {
    const strips = createEmptyStrips();
    strips[0] = {
      ...strips[0]!,
      playerId: "1",
      teamId: "BOS",
      firstName: "Jayson",
      lastName: "Tatum",
      photoSrc: "tatum.png",
    };
    strips[2] = {
      ...strips[2]!,
      playerId: "2",
      teamId: "NYK",
      firstName: "Jalen",
      lastName: "Brunson",
      photoSrc: "brunson.png",
    };
    const swapped = swapStrips(strips, 0, 2);
    expect(swapped[0]?.lastName).toBe("Brunson");
    expect(swapped[0]?.teamId).toBe("NYK");
    expect(swapped[0]?.photoSrc).toBe("brunson.png");
    expect(swapped[2]?.lastName).toBe("Tatum");
    expect(swapped[2]?.teamId).toBe("BOS");
    expect(swapped[1]?.playerId).toBeNull();
  });

  it("swaps TOTW Plus across starter and standout rows", () => {
    const slots = [
      ...createEmptyStrips(),
      ...createEmptyStrips(),
    ];
    slots[0] = {
      ...slots[0]!,
      lastName: "Tatum",
      teamId: "BOS",
      photoSrc: "tatum.png",
    };
    const standout = PLUS_STARTER_COUNT;
    slots[standout] = {
      ...slots[standout]!,
      lastName: "Barnes",
      teamId: "SAC",
      photoSrc: "barnes.png",
    };
    const swapped = swapStrips(slots, 0, standout);
    expect(swapped[0]?.lastName).toBe("Barnes");
    expect(swapped[standout]?.lastName).toBe("Tatum");
    expect(swapped[0]?.photoSrc).toBe("barnes.png");
    expect(swapped[standout]?.teamId).toBe("BOS");
  });

  it("swaps ranked strips with their position labels", () => {
    const strips = createEmptyStrips();
    strips[0] = {
      ...strips[0]!,
      playerId: "pg",
      lastName: "SGA",
      teamId: "OKC",
      photoSrc: "sga.png",
    };
    strips[2] = {
      ...strips[2]!,
      playerId: "sf",
      lastName: "Tatum",
      teamId: "BOS",
      photoSrc: "tatum.png",
    };
    const next = swapRankedLineup(strips, [...DEFAULT_POSITION_LABELS], 0, 2);
    expect(next.strips[0]?.lastName).toBe("Tatum");
    expect(next.strips[2]?.lastName).toBe("SGA");
    expect(next.positionLabels[0]).toBe("SF");
    expect(next.positionLabels[2]).toBe("PG");
    expect(next.positionLabels[1]).toBe("SG");
  });

  it("swaps cover portraits and compare/mock-trade player slots", () => {
    const cover = [emptyCoverSlot(), emptyCoverSlot(), emptyCoverSlot()];
    cover[0] = { ...cover[0]!, lastName: "A", photoSrc: "a.png", teamId: "BOS" };
    cover[2] = { ...cover[2]!, lastName: "C", photoSrc: "c.png", teamId: "NYK" };
    const swappedCover = swapCoverSlots(cover, 0, 2);
    expect(swappedCover[0]?.lastName).toBe("C");
    expect(swappedCover[2]?.lastName).toBe("A");

    const compare = defaultCompareDraft();
    compare.sides[0]!.lastName = "Left";
    compare.sides[1]!.lastName = "Right";
    compare.stats[0] = { ...compare.stats[0]!, left: "30", right: "10" };
    const swappedSides = swapCompareSides(compare);
    expect(swappedSides.sides[0]?.lastName).toBe("Right");
    expect(swappedSides.sides[1]?.lastName).toBe("Left");
    expect(swappedSides.stats[0]?.left).toBe("10");
    expect(swappedSides.stats[0]?.right).toBe("30");

    expect(mockTradePlayerSlot(1, 2)).toBe(6);
    expect(parseMockTradePlayerSlot(6)).toEqual({ side: 1, player: 2 });
    const trade = defaultMockTradeDraft();
    trade.sides[0]!.players[0]!.lastName = "A";
    trade.sides[1]!.players[0]!.lastName = "B";
    const swappedTrade = swapMockTradePlayers(
      trade,
      mockTradePlayerSlot(0, 0),
      mockTradePlayerSlot(1, 0),
    );
    expect(swappedTrade.sides[0]?.players[0]?.lastName).toBe("B");
    expect(swappedTrade.sides[1]?.players[0]?.lastName).toBe("A");
  });
});
