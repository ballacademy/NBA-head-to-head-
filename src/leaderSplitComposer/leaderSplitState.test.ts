import { describe, expect, it } from "vitest";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { emptyLeaderRows, LEADER_ROW_DEFAULT } from "../leaderboardComposer/leaderboardFill";
import {
  leaderSplitBoardHeight,
  leaderSplitLayout,
  LS_LIST_PCT,
} from "./leaderSplitLayout";
import {
  defaultLeaderSplitDraft,
  leaderSplitExportRows,
  normalizeLeaderSplitDraft,
} from "./leaderSplitState";

describe("leader split pack", () => {
  it("defaults name plates off", () => {
    expect(defaultLeaderSplitDraft().namePlates).toBe(false);
    expect(normalizeLeaderSplitDraft({}).namePlates).toBe(false);
    expect(normalizeLeaderSplitDraft({ namePlates: true }).namePlates).toBe(true);
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
