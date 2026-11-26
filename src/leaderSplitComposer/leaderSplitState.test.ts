import { describe, expect, it } from "vitest";
import { measureTitleAdvance } from "../instagramComposer/titleLayout";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { emptyLeaderRows, LEADER_ROW_DEFAULT } from "../leaderboardComposer/leaderboardFill";
import {
  leaderSplitBoardHeight,
  leaderSplitLayout,
  leaderSplitRowCols,
  LS_LIST_PCT,
  LS_NAME_CAP,
  LS_NAME_TYPE,
  LS_VALUE_W,
} from "./leaderSplitLayout";
import {
  defaultLeaderSplitDraft,
  fitLeaderSplitName,
  leaderSplitExportRows,
  leaderSplitRowName,
  normalizeLeaderSplitDraft,
} from "./leaderSplitState";

describe("leader split pack", () => {
  it("defaults name plates off", () => {
    expect(defaultLeaderSplitDraft().namePlates).toBe(false);
    expect(normalizeLeaderSplitDraft({}).namePlates).toBe(false);
    expect(normalizeLeaderSplitDraft({ namePlates: true }).namePlates).toBe(true);
  });

  it("migrates the old 1.72 ESPN crop onto the looser hero pan", () => {
    expect(
      normalizeLeaderSplitDraft({
        pan: { x: 0.5, y: 0.4, zoom: 1.72, rotate: 0 },
      }).pan,
    ).toEqual({ x: 0.5, y: 0.36, zoom: 1.5, rotate: 0 });
    expect(
      normalizeLeaderSplitDraft({
        customPhoto: true,
        pan: { x: 0.5, y: 0.4, zoom: 1.72, rotate: 0 },
      }).pan.zoom,
    ).toBe(1.72);
  });

  it("packs even rows in the 42% pane and keeps leftover on the photo", () => {
    const eight = leaderSplitLayout(8, false, GRAPHIC_HEIGHT);
    expect(eight.list.w).toBe(Math.round(GRAPHIC_WIDTH * LS_LIST_PCT));
    expect(eight.photo.w).toBe(GRAPHIC_WIDTH - eight.list.w);
    expect(eight.photo.h).toBe(GRAPHIC_HEIGHT);
    expect(eight.rowH).toBeGreaterThan(56);
    expect(eight.rows.y + eight.rowH * 8).toBeCloseTo(eight.rows.y + eight.rows.h, 5);
    const five = leaderSplitLayout(5, false, GRAPHIC_HEIGHT);
    expect(five.rowH).toBeGreaterThan(eight.rowH);
    expect(five.photo.h).toBe(eight.photo.h);
    const empty = leaderSplitLayout(0, false, GRAPHIC_HEIGHT);
    expect(empty.rowH).toBe(0);
    expect(empty.photo.h).toBe(GRAPHIC_HEIGHT);
    const story = leaderSplitLayout(8, false, STORY_DESIGN_HEIGHT);
    expect(story.photo.h).toBeGreaterThan(eight.photo.h);
    expect(leaderSplitBoardHeight(false, true)).toBe(GRAPHIC_WIDTH);
  });

  it("period-abbreviates overflow last names instead of ellipsis", () => {
    expect(
      fitLeaderSplitName({ firstName: "Payton", lastName: "Pritchard" }),
    ).toBe("PRITCHARD");
    expect(
      fitLeaderSplitName({ firstName: "Shai", lastName: "Gilgeous-Alexander" }),
    ).toMatch(/GILGEOUS-A\.|G\.-ALEXANDER|\.$/);
    expect(
      fitLeaderSplitName({ firstName: "Shai", lastName: "Gilgeous-Alexander" }),
    ).not.toBe("GILGEOUS-ALEXANDER");
  });

  it("keeps hyphenated last names full so the packed row can wrap at the hyphen", () => {
    expect(
      leaderSplitRowName({ firstName: "Payton", lastName: "Pritchard" }),
    ).toBe("PRITCHARD");
    expect(
      leaderSplitRowName({ firstName: "Anthony", lastName: "Edwards" }),
    ).toBe("EDWARDS");
    expect(
      leaderSplitRowName({ firstName: "Shai", lastName: "Gilgeous-Alexander" }),
    ).toBe("GILGEOUS-\nALEXANDER");
  });

  it("leaves enough name width for a wrapped GILGEOUS- / ALEXANDER", () => {
    const eight = leaderSplitLayout(8, false, GRAPHIC_HEIGHT);
    const cols = leaderSplitRowCols(eight.rows.w);
    const namePx = Math.min(eight.rowH * LS_NAME_TYPE, LS_NAME_CAP);
    expect(cols.valueW).toBe(LS_VALUE_W);
    expect(cols.valueW).toBeLessThan(170);
    expect(cols.nameW).toBeGreaterThanOrEqual(
      measureTitleAdvance("ALEXANDER", -0.02) * namePx * 1.16 - 1,
    );
    expect(cols.nameW).toBeGreaterThanOrEqual(
      measureTitleAdvance("PRITCHARD", -0.02) * namePx * 1.16 - 1,
    );
  });

  it("hides ghost ranks in preview the way export does", () => {
    const draft = defaultLeaderSplitDraft();
    expect(draft.rows).toHaveLength(8);
    expect(leaderSplitExportRows(draft, false, false)).toHaveLength(0);
    const filled = {
      ...draft,
      rows: emptyLeaderRows(LEADER_ROW_DEFAULT).map((row, index) =>
        index === 0
          ? { ...row, firstName: "Luka", lastName: "Doncic", value: "33.5" }
          : row,
      ),
    };
    expect(leaderSplitExportRows(filled, false, false)).toHaveLength(1);
    expect(leaderSplitExportRows(filled, true, false)).toHaveLength(1);
  });
});
