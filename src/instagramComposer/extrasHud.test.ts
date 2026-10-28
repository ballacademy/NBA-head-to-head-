import { describe, expect, it } from "vitest";
import { COMPOSER_TAB_GROUPS } from "./ComposerTabs";
import { jumpComposerMode, matchingComposerTabs } from "./composerJump";
import { parseComposerCarry } from "./composerCarry";
import { parseRecentPlayerIds } from "./composerRecentPlayers";
import {
  composerHotkeyAction,
  isComposerTypingTarget,
} from "./composerHotkeys";
import { fillQualityMessage } from "./composerFillToast";
import { nextEmptySlotIndex, slotMissingPlayer } from "./nextEmptySlot";
import { previewZoomFactor } from "./composerPreviewZoom";
import { parseComposerBaCorner } from "./composerBaCorner";
import { exportFilenameFromTitle } from "./composerPresets";
import { BLANK_POST_CONFIRM } from "./confirmBlankPost";

const tabs = COMPOSER_TAB_GROUPS.flatMap((group) => group.tabs);

describe("extras 17–32 HUD helpers", () => {
  it("jumps head to Headline and keeps TOTW filtered when ambiguous", () => {
    expect(jumpComposerMode("head", tabs)).toBe("headline");
    expect(matchingComposerTabs("totw", tabs).map((tab) => tab.mode)).toEqual(
      expect.arrayContaining(["team-of-the-week", "team-of-the-week-plus"]),
    );
    expect(jumpComposerMode("totw", tabs)).toBe("team-of-the-week");
    expect(jumpComposerMode("to", tabs)).toBeNull();
    expect(jumpComposerMode("shot", tabs)).toBe("shot-chart");
    expect(jumpComposerMode("shots", tabs)).toBe("shot-chart");
    expect(jumpComposerMode("picks", tabs)).toBe("picks");
    expect(jumpComposerMode("locks", tabs)).toBe("picks");
    expect(jumpComposerMode("takeaways", tabs)).toBe("takeaways-cover");
    expect(jumpComposerMode("takeaway cards", tabs)).toBe("takeaways-card");
    expect(jumpComposerMode("bars", tabs)).toBe("leader-bars");
    expect(jumpComposerMode("leaders", tabs)).toBe("leader-split");
    expect(jumpComposerMode("poster", tabs)).toBe("poster-news");
    expect(jumpComposerMode("dual", tabs)).toBe("dual-ranks");
  });

  it("parses carry and recent player ids", () => {
    expect(parseComposerCarry({ playerId: "3917376", playerName: "Jaylen Brown" })).toMatchObject({
      playerId: "3917376",
      playerName: "Jaylen Brown",
    });
    expect(parseRecentPlayerIds(["3917376", "", "4278073"])).toEqual([
      "3917376",
      "4278073",
    ]);
  });

  it("maps F/E/Z/1/2/3 and ignores typing targets", () => {
    expect(isComposerTypingTarget(null)).toBe(false);
    const key = (k: string) =>
      composerHotkeyAction({
        key: k,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        target: null,
      } as KeyboardEvent);
    expect(key("f")).toBe("fill");
    expect(key("e")).toBe("export");
    expect(key("z")).toBe("undo");
    expect(key("1")).toBe("ratio-4-5");
    expect(key("2")).toBe("ratio-9-16");
    expect(key("3")).toBe("ratio-1-1");
    expect(
      composerHotkeyAction({
        key: "f",
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        target: null,
      } as KeyboardEvent),
    ).toBe("fill");
  });

  it("toasts preseason and under-2 GP fills", () => {
    expect(fillQualityMessage("preseason", [4, 5])).toBe("Fill is preseason.");
    expect(fillQualityMessage("regular", [1, 4])).toBe("1 under 2 GP.");
    expect(fillQualityMessage("regular", [4, 5])).toBeNull();
  });

  it("keeps the picker on the next empty slot", () => {
    const slots = [{ playerId: "1" }, { playerId: "" }, { playerId: "3" }];
    expect(nextEmptySlotIndex(slots, 0, slotMissingPlayer)).toBe(1);
    expect(nextEmptySlotIndex([{ playerId: "1" }, { playerId: "2" }], 0, slotMissingPlayer)).toBeNull();
  });

  it("zooms Fit vs 75% vs 100%", () => {
    expect(previewZoomFactor(0.4, "fit")).toBe(0.4);
    expect(previewZoomFactor(0.4, "75")).toBe(0.75);
    expect(previewZoomFactor(0.4, "100")).toBe(1);
  });

  it("parses BA corners and names files with player + date", () => {
    expect(parseComposerBaCorner("top-left")).toBe("top-left");
    expect(parseComposerBaCorner("bottom-right")).toBe("bottom-right");
    expect(parseComposerBaCorner("nope")).toBe("top-right");
    expect(
      exportFilenameFromTitle("SHOT CHART", "shot-chart", "2026-10-16", false, "Jaylen Brown"),
    ).toBe("shot-chart-jaylen-brown-2026-10-16.png");
    expect(BLANK_POST_CONFIRM).toContain("Keep photos stays one click");
  });
});
