import { describe, expect, it } from "vitest";
import {
  EXPORT_HEIGHT,
  EXPORT_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  PYRAMID_ROWS,
  PYRAMID_SLOT_COUNT,
  PYR_CELL,
  PYR_CELL_FILL,
  PYR_CELL_STUD,
  PYR_COL_GAP,
  PYR_CUTOUT_ALPHA,
  PYR_CUTOUT_DILATE,
  PYR_DEFAULT_ROWS,
  PYR_MAX_ROWS,
  PYR_MIN_ROWS,
  PYR_PAD_BOTTOM,
  PYR_POP_RATIO,
  PYR_POP_RIM,
  PYR_POP_RIM_GLOW,
  PYR_STACK_TOP,
  PYR_TITLE_H,
  PYR_TITLE_Y,
  clampPyramidRows,
  opaqueSpanFromAlphas,
  pyramidCellRect,
  pyramidMetrics,
  pyramidSlotCount,
} from "./pyramidLayout";
import {
  applyPyramidPick,
  coyCoachLadder,
  createEmptyPyramidSlots,
  DEFAULT_PYRAMID_TITLE,
  fillPyramidFromPlayers,
  mvpPlayerLadder,
  pyramidAwardFromTitle,
  pyramidAwardLadder,
  pyramidBoardEmpty,
  pyramidLadderKind,
  defaultPyramidDraft,
  parsePyramidRows,
  pyramidSlotPops,
  PYRAMID_HEADSHOT_PAN,
  resizePyramidSlots,
  usedPyramidPlayerIds,
} from "./pyramidState";

describe("pyramid composer", () => {
  it("keeps a 4:5 board and a 4–6 row triangular stack", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
    expect(PYR_MIN_ROWS).toBe(4);
    expect(PYR_MAX_ROWS).toBe(6);
    expect(clampPyramidRows(3)).toBe(4);
    expect(clampPyramidRows(7)).toBe(6);
    expect(pyramidSlotCount(4)).toBe(10);
    expect(pyramidSlotCount(5)).toBe(15);
    expect(pyramidSlotCount(6)).toBe(21);
    expect(PYRAMID_ROWS).toEqual([1, 2, 3, 4]);
    expect(PYRAMID_SLOT_COUNT).toBe(10);
    expect(createEmptyPyramidSlots()).toHaveLength(10);
    expect(createEmptyPyramidSlots(6)).toHaveLength(21);
  });

  it("drops the stack under the title so popped hair never clips it, and keeps the bottom inset", () => {
    const titleBottom = PYR_TITLE_Y + PYR_TITLE_H;
    expect(PYR_PAD_BOTTOM).toBe(36);
    expect(PYR_TITLE_Y).toBe(22);
    expect(PYR_TITLE_H).toBe(96);
    for (const rows of [4, 5, 6] as const) {
      const metrics = pyramidMetrics(rows);
      expect(metrics.pop).toBeCloseTo(metrics.cell * PYR_POP_RATIO);
      expect(metrics.rowGap).toBeGreaterThan(PYR_COL_GAP);
      expect(metrics.rowGap).toBeLessThan(metrics.pop);
      expect(metrics.padTop).toBeCloseTo(metrics.pop + PYR_STACK_TOP);
      expect(metrics.originY).toBeCloseTo(titleBottom + metrics.padTop);
      expect(
        metrics.originY +
          metrics.rowCount * metrics.cell +
          (metrics.rowCount - 1) * metrics.rowGap,
      ).toBeCloseTo(GRAPHIC_HEIGHT - PYR_PAD_BOTTOM);
      const first = pyramidCellRect(0, rows);
      expect(first.y - titleBottom).toBeCloseTo(metrics.padTop);
      expect(first.y - first.pop).toBeGreaterThanOrEqual(titleBottom);
      const last = pyramidCellRect(metrics.slotCount - 1, rows);
      expect(GRAPHIC_HEIGHT - (last.y + last.h)).toBeCloseTo(PYR_PAD_BOTTOM);
      expect(last.y + last.h).toBeGreaterThan(GRAPHIC_HEIGHT - 50);
      expect(first.w).toBe(first.h);
      expect(first.pop).toBeGreaterThan(40);
    }
    const story = pyramidMetrics(4, STORY_DESIGN_HEIGHT);
    expect(story.originY).toBeCloseTo(titleBottom + story.padTop);
    expect(story.padTop).toBeCloseTo(story.pop + PYR_STACK_TOP);
    expect(
      story.originY + 4 * story.cell + 3 * story.rowGap,
    ).toBeCloseTo(STORY_DESIGN_HEIGHT - PYR_PAD_BOTTOM);
    expect(story.rowGap).toBeGreaterThan(pyramidMetrics(4).rowGap);
    expect(pyramidMetrics(6).cell).toBeLessThan(pyramidMetrics(4).cell);
    expect(PYR_CELL).toBe(pyramidMetrics(PYR_DEFAULT_ROWS).cell);
    expect(PYR_CELL).toBeGreaterThan(200);
    expect(pyramidCellRect(0).x).toBeGreaterThan(pyramidCellRect(6).x);
    expect(pyramidCellRect(9).x + pyramidCellRect(9).w).toBeLessThanOrEqual(
      GRAPHIC_WIDTH,
    );
  });

  it("infers 5/6 rows from slot counts and resizes without dropping filled photos", () => {
    expect(parsePyramidRows(undefined, 10)).toBe(4);
    expect(parsePyramidRows(undefined, 15)).toBe(5);
    expect(parsePyramidRows(undefined, 21)).toBe(6);
    expect(parsePyramidRows(6, 10)).toBe(6);
    const ten = createEmptyPyramidSlots(4);
    expect(resizePyramidSlots(ten, 6)).toHaveLength(21);
    expect(resizePyramidSlots(createEmptyPyramidSlots(6), 4)).toHaveLength(10);
    const draft = defaultPyramidDraft();
    expect(draft.title).toBe(DEFAULT_PYRAMID_TITLE);
    expect(draft.showBa).toBe(true);
    expect(draft.rows).toBe(4);
    expect(draft.slots.every((slot) => slot.playerId === null)).toBe(true);
    expect(draft.showNames).toBe(false);
  });

  it("fills each square with a shinier kyber violet, not magenta studs", () => {
    expect(PYR_CELL_FILL.toLowerCase()).toBe("#6a00e6");
    const fillR = Number.parseInt(PYR_CELL_FILL.slice(1, 3), 16);
    const fillB = Number.parseInt(PYR_CELL_FILL.slice(5, 7), 16);
    expect(fillB).toBeGreaterThan(fillR);
    const studR = Number.parseInt(PYR_CELL_STUD.slice(1, 3), 16);
    const studB = Number.parseInt(PYR_CELL_STUD.slice(5, 7), 16);
    expect(studR).toBeGreaterThan(180);
    expect(studB).toBeGreaterThan(200);
    expect(PYR_CELL_STUD.toLowerCase()).not.toBe("#b026ff");
    expect(PYR_POP_RIM).toBeGreaterThan(1.5);
    expect(PYR_POP_RIM_GLOW).toBeGreaterThan(PYR_POP_RIM);
  });

  it("gaps the top stroke between the first and last opaque head columns", () => {
    const columns = Uint8Array.from({ length: 40 }, (_, index) =>
      index >= 12 && index <= 27 ? 200 : 0,
    );
    const span = opaqueSpanFromAlphas(columns, PYR_CUTOUT_ALPHA, 2);
    expect(span).toEqual({ left: 10, right: 30 });
    expect(opaqueSpanFromAlphas(new Uint8Array(16), 40, PYR_CUTOUT_DILATE)).toBeNull();
    expect(PYRAMID_HEADSHOT_PAN.zoom).toBeGreaterThan(1.25);
    expect(PYRAMID_HEADSHOT_PAN.y).toBeGreaterThan(0.45);
  });

  it("fills a slot from a player and frames the default headshot for the pop crop", () => {
    const luka = getPlayer("3945274")!;
    const next = applyPyramidPick(createEmptyPyramidSlots(), 6, luka);
    expect(next).toHaveLength(10);
    expect(next[6]?.playerId).toBe(luka.id);
    expect(next[6]?.pan).toEqual(PYRAMID_HEADSHOT_PAN);
    expect(usedPyramidPlayerIds(next)[luka.id]).toMatch(/^Slot /);
    expect(pyramidSlotPops(next[6]!)).toBe(true);
    expect(
      pyramidSlotPops({
        ...next[6]!,
        customPhoto: true,
        photoSrc: "data:image/png;base64,xx",
      }),
    ).toBe(false);
  });

  it("fills ten squares from a COY coach ladder or an MVP scoring ladder", () => {
    expect(pyramidBoardEmpty(createEmptyPyramidSlots())).toBe(true);
    expect(pyramidLadderKind("NBA COY PYRAMID")).toBe("coach");
    expect(pyramidLadderKind("NBA PLAYER PYRAMID")).toBe("player");
    expect(pyramidAwardFromTitle("NBA MVP PYRAMID")).toBe("mvp");
    expect(pyramidAwardFromTitle("NBA DPOY PYRAMID")).toBe("dpoy");
    expect(pyramidAwardLadder("roy", 4).every((player) => player.experienceYears <= 1)).toBe(
      true,
    );
    const coaches = coyCoachLadder(10);
    expect(coaches).toHaveLength(10);
    expect(coaches[0]?.id).toBe("coach-BOS");
    const filled = fillPyramidFromPlayers(4, coaches);
    expect(filled.filter((slot) => slot.playerId).length).toBe(10);
    expect(filled[0]?.playerId).toBe("coach-BOS");
    expect(filled[0]?.photoSrc).toBeTruthy();
    const mvp = mvpPlayerLadder(10);
    expect(mvp).toHaveLength(10);
    expect(mvp[0]!.ppg).toBeGreaterThanOrEqual(mvp[9]!.ppg);
  });
});
