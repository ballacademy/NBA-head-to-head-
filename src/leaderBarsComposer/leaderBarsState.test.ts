import { describe, expect, it } from "vitest";
import {
  GRAPHIC_HEIGHT,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { emptyLeaderRows, LEADER_ROW_DEFAULT } from "../leaderboardComposer/leaderboardFill";
import { LB_ROW_H, leaderBarsLayout } from "./leaderBarsLayout";
import {
  defaultLeaderBarsDraft,
  leaderBarsExportRows,
  normalizeLeaderBarsDraft,
  splitLeaderBarsTitle,
} from "./leaderBarsState";

describe("leader bars title", () => {
  it("splits PPG LEADERS onto two overlay lines, not four", () => {
    expect(splitLeaderBarsTitle("PPG LEADERS")).toEqual(["PPG", "LEADERS"]);
  });

  it("defaults name plates off", () => {
    expect(defaultLeaderBarsDraft().namePlates).toBe(false);
    expect(normalizeLeaderBarsDraft({}).namePlates).toBe(false);
    expect(normalizeLeaderBarsDraft({ namePlates: true }).namePlates).toBe(true);
  });
});

describe("leader bars pack", () => {
  it("gives leftover height to the photo and packs even rows to the floor", () => {
    const eight = leaderBarsLayout(8, true, GRAPHIC_HEIGHT);
    expect(eight.rowH).toBe(LB_ROW_H);
    expect(eight.rowH).toBeGreaterThan(64);
    expect(eight.photo.h).toBeGreaterThan(620);
    expect(eight.photo.y).toBe(0);
    expect(eight.board.y + eight.board.h).toBeCloseTo(
      GRAPHIC_HEIGHT - 16,
      5,
    );
    const five = leaderBarsLayout(5, true, GRAPHIC_HEIGHT);
    expect(five.photo.h).toBeGreaterThan(eight.photo.h);
    expect(five.rowH).toBe(LB_ROW_H);
    const empty = leaderBarsLayout(0, true, GRAPHIC_HEIGHT);
    expect(empty.photo.h).toBeGreaterThan(five.photo.h);
    expect(empty.board.h).toBe(0);
    const story = leaderBarsLayout(8, true, STORY_DESIGN_HEIGHT);
    expect(story.photo.h).toBeGreaterThan(eight.photo.h);
    expect(story.rowH).toBe(LB_ROW_H);
  });

  it("hides ghost bar tracks in preview the way export does", () => {
    const draft = defaultLeaderBarsDraft();
    expect(draft.rows).toHaveLength(8);
    expect(leaderBarsExportRows(draft, false, false)).toHaveLength(0);
    const filled = {
      ...draft,
      rows: emptyLeaderRows(LEADER_ROW_DEFAULT).map((row, index) =>
        index === 0
          ? { ...row, firstName: "Luka", lastName: "Doncic", value: "33.5" }
          : row,
      ),
    };
    expect(leaderBarsExportRows(filled, false, false)).toHaveLength(1);
    expect(leaderBarsExportRows(filled, true, false)).toHaveLength(1);
  });
});
