import { describe, expect, it } from "vitest";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  GRAPHIC_ASPECT,
  QT_FADE_H,
  QT_LAST_TOP,
  QT_QUOTE_BOTTOM,
  QT_QUOTE_H,
  QT_QUOTE_SIZE,
  quoteLastName,
} from "./quoteLayout";
import {
  defaultQuoteDraft,
  fillQuoteFromPlayer,
  hasCustomPhoto,
} from "./quoteState";

describe("quote composer", () => {
  it("is a 4:5 magazine cover with the last name above the quote", () => {
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(QT_FADE_H).toBeGreaterThan(400);
    expect(QT_QUOTE_SIZE).toBeGreaterThan(48);
    expect(QT_LAST_TOP + 120).toBeLessThan(
      1500 - QT_QUOTE_BOTTOM - QT_QUOTE_H,
    );
    const draft = defaultQuoteDraft();
    expect(draft.showHeadshot).toBe(true);
    expect(draft.photoSrc).toBeNull();
    expect(quoteLastName("Nikola Jokic")).toBe("JOKIC");
  });

  it("fills photo, name, and team from the picker", () => {
    const jokic = getPlayer("3112335")!;
    const next = fillQuoteFromPlayer(jokic, defaultQuoteDraft());
    expect(next.photoSrc).toBe(jokic.headshotUrl);
    expect(next.attribution.toUpperCase()).toContain("JOKIC");
    expect(next.teamId).toBe(jokic.team);
    expect(next.showHeadshot).toBe(true);
    expect(hasCustomPhoto(next)).toBe(false);
  });

  it("replaces name, last name, team, and photo when switching speakers", () => {
    const jokic = getPlayer("3112335")!;
    const luka = getPlayer("3945274")!;
    const first = fillQuoteFromPlayer(jokic, {
      ...defaultQuoteDraft(),
      quote: "I’M HIM.",
    });
    const next = fillQuoteFromPlayer(luka, first);
    expect(next.playerId).toBe(luka.id);
    expect(next.attribution.toUpperCase()).toContain("DONCIC");
    expect(next.attribution.toUpperCase()).not.toContain("JOKIC");
    expect(quoteLastName(next.attribution)).toBe("DONCIC");
    expect(next.teamId).toBe(luka.team);
    expect(next.teamId).not.toBe(first.teamId);
    expect(next.photoSrc).toBe(luka.headshotUrl);
    expect(next.quote).toBe("I’M HIM.");
  });
});
