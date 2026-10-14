import { describe, expect, it } from "vitest";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  GRAPHIC_ASPECT,
  QT_FADE_H,
  QT_QUOTE_SIZE,
  quoteGhostName,
} from "./quoteLayout";
import {
  defaultQuoteDraft,
  fillQuoteFromPlayer,
  hasCustomPhoto,
} from "./quoteState";

describe("quote composer", () => {
  it("is a 4:5 magazine cover with type on the portrait", () => {
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(QT_FADE_H).toBeGreaterThan(500);
    expect(QT_QUOTE_SIZE).toBeGreaterThan(60);
    const draft = defaultQuoteDraft();
    expect(draft.showHeadshot).toBe(true);
    expect(draft.photoSrc).toBeNull();
    expect(quoteGhostName("Nikola Jokic")).toBe("JOKIC");
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
