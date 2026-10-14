import { describe, expect, it } from "vitest";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { GRAPHIC_ASPECT, QT_FADE_H, QT_QUOTE_SIZE } from "./quoteLayout";
import {
  defaultQuoteDraft,
  fillQuoteFromPlayer,
  hasCustomPhoto,
} from "./quoteState";

describe("quote composer", () => {
  it("is a 4:5 photo-first pull quote, not a blank type card", () => {
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(QT_FADE_H).toBeGreaterThan(400);
    expect(QT_QUOTE_SIZE).toBeGreaterThan(40);
    const draft = defaultQuoteDraft();
    expect(draft.showHeadshot).toBe(true);
    expect(draft.photoSrc).toBeNull();
  });

  it("fills a centered player photo and name from the picker", () => {
    const jokic = getPlayer("3112335")!;
    const next = fillQuoteFromPlayer(jokic, defaultQuoteDraft());
    expect(next.photoSrc).toBe(jokic.headshotUrl);
    expect(next.attribution.toUpperCase()).toContain("JOKIC");
    expect(next.showHeadshot).toBe(true);
    expect(hasCustomPhoto(next)).toBe(false);
  });
});
