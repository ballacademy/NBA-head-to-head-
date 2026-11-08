import { describe, expect, it, vi } from "vitest";
import { COMPOSER_TAB_GROUPS } from "./ComposerTabs";
import { jumpComposerMode, matchingComposerTabs } from "./composerJump";
import { parseComposerCarry } from "./composerCarry";
import { parseRecentPlayerIds } from "./composerRecentPlayers";
import {
  COMPOSER_HOTKEY_FILL_LABELS,
  composerHotkeyAction,
  isComposerTypingTarget,
  runComposerHotkey,
} from "./composerHotkeys";
import { parseComposerHudMode } from "./composerHudMode";
import { fillQualityMessage } from "./composerFillToast";
import { nextEmptySlotIndex, slotMissingPlayer } from "./nextEmptySlot";
import {
  bumpFromWheelDelta,
  composerPreviewAllowsPageScroll,
  leftoverContainFit,
  PREVIEW_ZOOM_FIT_BUMP,
  PREVIEW_ZOOM_NATURAL_SCALE,
  PREVIEW_ZOOM_SEVENTY_FIVE,
  previewZoomFactor,
  stepPreviewZoomBump,
  wheelScalesPhoto,
  wheelScalesPost,
} from "./composerPreviewZoom";
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

  it("defaults HUD to Simple and keeps a remembered Full", () => {
    expect(parseComposerHudMode(null)).toBe("simple");
    expect(parseComposerHudMode(undefined)).toBe("simple");
    expect(parseComposerHudMode("simple")).toBe("simple");
    expect(parseComposerHudMode("full")).toBe("full");
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
    expect(COMPOSER_HOTKEY_FILL_LABELS).toEqual(
      expect.arrayContaining([
        "Fill East",
        "Fill West",
        "Fill range",
        "Fill cover",
        "Fill names",
        "Fill ranking",
        "Fill schedule",
        "Fill report",
        "Auto-fill 7–10",
        "Populate matching",
        "Sort into tiers",
      ]),
    );
    const east = { textContent: "Fill East", disabled: false, click: vi.fn() };
    const generic = { textContent: "Fill", disabled: false, click: vi.fn() };
    runComposerHotkey("fill", {
      querySelectorAll: () => [generic, east],
    } as unknown as ParentNode);
    expect(east.click).toHaveBeenCalledTimes(1);
    expect(generic.click).not.toHaveBeenCalled();
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
    expect(PREVIEW_ZOOM_NATURAL_SCALE).toBe(0.5);
    expect(PREVIEW_ZOOM_FIT_BUMP).toBeCloseTo(1.4375);
    expect(PREVIEW_ZOOM_SEVENTY_FIVE).toBeCloseTo(0.41);
    expect(previewZoomFactor(0.36, "fit")).toBeCloseTo(0.36 * 1.4375);
    expect(previewZoomFactor(0.36, "75")).toBeCloseTo(0.43);
    expect(previewZoomFactor(0.36, "100")).toBe(0.5);
    expect(previewZoomFactor(0.36, "75")).toBeLessThan(
      previewZoomFactor(0.36, "100"),
    );
    expect(previewZoomFactor(0.36, "fit")).toBeGreaterThan(0.36);
    expect(previewZoomFactor(0.36, "fit")).toBeLessThan(0.36 * 1.5);
    expect(previewZoomFactor(0.6, "100")).toBe(0.5);
    expect(previewZoomFactor(0.6, "75")).toBeGreaterThan(
      previewZoomFactor(0.6, "100"),
    );
    expect(previewZoomFactor(0.6, "75")).toBeLessThan(
      previewZoomFactor(0.6, "fit"),
    );
    const laptopFit = leftoverContainFit({
      frameW: 1440,
      viewW: 1440,
      viewH: 900,
      hudH: 357,
      width: 1200,
      height: 1500,
    });
    expect(laptopFit).toBeCloseTo(543 / 1500);
    expect(laptopFit * 1200).toBeCloseTo(434.4, 0);
    const phoneFit = leftoverContainFit({
      frameW: 390,
      viewW: 390,
      viewH: 844,
      hudH: 1174,
      width: 1200,
      height: 1500,
    });
    expect(phoneFit).toBeCloseTo(390 / 1200);
    const stampWell = leftoverContainFit({
      frameW: 1440,
      viewW: 1440,
      viewH: 900,
      hudH: 720,
      width: 1200,
      height: 1500,
    });
    expect(stampWell).toBeCloseTo(180 / 1500);
    expect(stampWell).toBeLessThan(PREVIEW_ZOOM_NATURAL_SCALE);
    expect(stampWell * 1500).toBeCloseTo(180);
    expect(stampWell * 1200).toBeCloseTo(144);
    expect(
      leftoverContainFit({
        frameW: 1440,
        viewW: 1440,
        viewH: 900,
        hudH: 357,
        width: 1200,
        height: 1500,
        padY: 32,
      }),
    ).toBeCloseTo(511 / 1500);
  });

  it("scales the whole post with +/− and wheel without changing 100%", () => {
    expect(previewZoomFactor(0.36, "100")).toBe(0.5);
    expect(previewZoomFactor(0.36, "100", 1)).toBe(0.5);
    expect(previewZoomFactor(0.36, "fit", 1)).toBeCloseTo(0.5175);
    expect(previewZoomFactor(0.36, "fit", 1.12)).toBeCloseTo(0.5796);
    expect(previewZoomFactor(0.36, "100", 2)).toBe(1);
    expect(stepPreviewZoomBump(1, 1)).toBeCloseTo(1.12);
    expect(stepPreviewZoomBump(1, -1)).toBeCloseTo(1 / 1.12);
    expect(bumpFromWheelDelta(1, -80)).toBeGreaterThan(1);
    expect(bumpFromWheelDelta(1, 80)).toBeLessThan(1);
    expect(composerPreviewAllowsPageScroll("fit")).toBe(true);
    expect(composerPreviewAllowsPageScroll("100")).toBe(true);
  });

  it("keeps photo-slot wheel on the crop and post-zooms only the 4:5 board", () => {
    type Host = { closest: (sel: string) => Host | null };
    const matching = (labels: string[]): Host => {
      const node: Host = {
        closest: (sel) => {
          const parts = sel.split(",").map((part) => part.trim());
          if (parts.some((part) => labels.includes(part))) {
            return node;
          }
          return null;
        },
      };
      return node;
    };
    const photo = matching([".pod-photo:not(.is-empty)", ".sc-stage__board"]);
    const empty = matching([".pod-photo", ".sc-stage__board"]);
    const board = matching([".sc-stage__board"]);
    const hud = matching([".sc-root", ".sc-toolbar"]);
    const picker = matching([".sc-picker", ".sc-root"]);
    const wheel = (target: Host) => ({
      target,
      clientX: 0,
      clientY: 0,
    });
    expect(wheelScalesPhoto(wheel(photo))).toBe(true);
    expect(wheelScalesPost(wheel(photo))).toBe(false);
    expect(wheelScalesPhoto(wheel(empty))).toBe(false);
    expect(wheelScalesPost(wheel(empty))).toBe(true);
    expect(wheelScalesPost(wheel(board))).toBe(true);
    expect(wheelScalesPost(wheel(hud))).toBe(false);
    expect(wheelScalesPost(wheel(picker))).toBe(false);
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
