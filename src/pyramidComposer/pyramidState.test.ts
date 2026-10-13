import { describe, expect, it } from "vitest";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  PYRAMID_ROWS,
  PYRAMID_SLOT_COUNT,
  PYR_CELL,
  pyramidCellRect,
} from "./pyramidLayout";
import {
  applyPyramidPick,
  createEmptyPyramidSlots,
  DEFAULT_PYRAMID_TITLE,
  defaultPyramidDraft,
  usedPyramidPlayerIds,
} from "./pyramidState";

describe("pyramid composer", () => {
  it("keeps a 4:5 board with a 1-2-3-4 stack of square photos", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
    expect(PYRAMID_ROWS).toEqual([1, 2, 3, 4]);
    expect(PYRAMID_SLOT_COUNT).toBe(10);
    expect(createEmptyPyramidSlots()).toHaveLength(10);
    expect(PYR_CELL).toBe(270);
    expect(pyramidCellRect(0).w).toBe(pyramidCellRect(0).h);
    expect(pyramidCellRect(0).x).toBeGreaterThan(pyramidCellRect(6).x);
    expect(pyramidCellRect(9).x + pyramidCellRect(9).w).toBeLessThanOrEqual(
      GRAPHIC_WIDTH,
    );
    expect(pyramidCellRect(9).y + pyramidCellRect(9).h).toBeLessThan(
      GRAPHIC_HEIGHT,
    );
    const draft = defaultPyramidDraft();
    expect(draft.title).toBe(DEFAULT_PYRAMID_TITLE);
    expect(draft.showBa).toBe(true);
    expect(draft.slots.every((slot) => slot.playerId === null)).toBe(true);
  });

  it("fills a slot from a player without shrinking the ten-cell pyramid", () => {
    const luka = getPlayer("3945274")!;
    const next = applyPyramidPick(createEmptyPyramidSlots(), 6, luka);
    expect(next).toHaveLength(10);
    expect(next[6]?.playerId).toBe(luka.id);
    expect(usedPyramidPlayerIds(next)[luka.id]).toMatch(/^Slot /);
  });
});
