import { describe, expect, it } from "vitest";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  HL_HEADLINE_SIZE,
  HL_WATERMARK,
} from "./headlineLayout";
import {
  clipHeadlineBody,
  DEFAULT_HEADLINE,
  defaultHeadlineDraft,
  fillHeadlineFromPlayer,
  HEADLINE_BODY_MAX,
  headlineLabel,
} from "./headlineState";

describe("headline composer", () => {
  it("keeps a 4:5 full-bleed photo board with a headline plate", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
    expect(HL_HEADLINE_SIZE).toBeGreaterThan(48);
    expect(HL_WATERMARK).toBeLessThan(0.25);
    const draft = defaultHeadlineDraft();
    expect(draft.headline).toBe(DEFAULT_HEADLINE);
    expect(draft.body).toBe("");
    expect(draft.photoSrc).toBeNull();
    expect(draft.showBa).toBe(true);
    expect(headlineLabel("  massive leap ")).toBe("MASSIVE LEAP");
    expect(clipHeadlineBody("x".repeat(HEADLINE_BODY_MAX + 12))).toHaveLength(
      HEADLINE_BODY_MAX,
    );
  });

  it("picks a player for the photo and team watermark", () => {
    const luka = getPlayer("3945274")!;
    const next = fillHeadlineFromPlayer(luka, defaultHeadlineDraft());
    expect(next.playerId).toBe(luka.id);
    expect(next.teamId).toBeTruthy();
    expect(next.photoSrc).toBe(luka.headshotUrl);
    expect(next.customPhoto).toBe(false);
  });
});
