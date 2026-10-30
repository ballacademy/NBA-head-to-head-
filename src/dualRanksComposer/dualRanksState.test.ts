import { describe, expect, it } from "vitest";
import { emptyLeaderRow, emptyLeaderRows } from "../leaderboardComposer/leaderboardFill";
import {
  defaultDualRanksDraft,
  dualExportColumns,
  fitDualRankName,
  normalizeDualRanksDraft,
} from "./dualRanksState";

describe("dual ranks", () => {
  it("hides an empty column on export and keeps both in preview", () => {
    const draft = normalizeDualRanksDraft({
      ...defaultDualRanksDraft(),
      leftRows: emptyLeaderRows(8).map((row, index) =>
        index === 0
          ? {
              ...row,
              playerId: "1",
              firstName: "Shai",
              lastName: "Gilgeous-Alexander",
              value: "32.7",
              rawValue: 32.7,
            }
          : row,
      ),
      rightRows: emptyLeaderRows(8),
    });
    const preview = dualExportColumns(draft, false, false);
    expect(preview.hideRight).toBe(false);
    expect(preview.right).toHaveLength(8);
    const exported = dualExportColumns(draft, true, false);
    expect(exported.hideRight).toBe(true);
    expect(exported.hideLeft).toBe(false);
    expect(exported.left).toHaveLength(1);
  });

  it("keeps short full names and period-abbreviates overflow", () => {
    expect(
      fitDualRankName({ firstName: "Payton", lastName: "Pritchard" }),
    ).toBe("PAYTON PRITCHARD");
    expect(
      fitDualRankName({ firstName: "Anthony", lastName: "Edwards" }),
    ).toBe("ANTHONY EDWARDS");
    expect(
      fitDualRankName({ firstName: "Shai", lastName: "Gilgeous-Alexander" }),
    ).toMatch(/GILGEOUS|G\.-ALEXANDER|\.$/);
    expect(
      fitDualRankName({ firstName: "Shai", lastName: "Gilgeous-Alexander" }),
    ).not.toBe("SHAI GILGEOUS-ALEXANDER");
  });

  it("defaults team-color name plates on and Off restores the stored false", () => {
    expect(defaultDualRanksDraft().namePlates).toBe(true);
    expect(normalizeDualRanksDraft({}).namePlates).toBe(true);
    expect(normalizeDualRanksDraft({ namePlates: false }).namePlates).toBe(false);
  });

  it("does not invent a featured rank when the player is missing from the table", () => {
    const draft = defaultDualRanksDraft();
    expect(draft.featuredPlayerId).toBeNull();
    expect(draft.leftRows.every((row) => row.playerId == null)).toBe(true);
    expect(emptyLeaderRow().value).toBe("");
  });
});
