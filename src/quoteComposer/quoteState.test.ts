import { describe, expect, it } from "vitest";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  GRAPHIC_ASPECT,
  QT_FADE_H,
  QT_LAST_TOP,
  QT_QUOTE_BOTTOM,
  QT_QUOTE_H,
  QT_QUOTE_MAX_LINES,
  QT_QUOTE_SIZE,
  formatQuoteSource,
  isLongQuote,
  quoteLastName,
  quoteLastNameSize,
  quoteMaxLines,
  quoteTypeSize,
} from "./quoteLayout";
import {
  defaultQuoteDraft,
  fillQuoteFromPlayer,
  hasCustomPhoto,
} from "./quoteState";

describe("quote composer", () => {
  it("is a 4:5 magazine cover with one last-name masthead", () => {
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(QT_FADE_H).toBeGreaterThan(400);
    expect(QT_QUOTE_SIZE).toBeGreaterThan(60);
    expect(QT_QUOTE_MAX_LINES).toBe(3);
    expect(QT_LAST_TOP + 120).toBeLessThan(1500 - QT_QUOTE_BOTTOM - QT_QUOTE_H);
    const draft = defaultQuoteDraft();
    expect(draft.showHeadshot).toBe(true);
    expect(draft.photoSrc).toBeNull();
    expect(draft.source).toBe("");
    expect(quoteLastName("Nikola Jokic")).toBe("JOKIC");
    expect(formatQuoteSource("espn")).toBe("— ESPN");
  });

  it("fills name and team from the picker without a mugshot", () => {
    const jokic = getPlayer("3112335")!;
    const next = fillQuoteFromPlayer(jokic, defaultQuoteDraft());
    expect(next.photoSrc).toBeNull();
    expect(next.attribution.toUpperCase()).toContain("JOKIC");
    expect(next.teamId).toBe(jokic.team);
    expect(next.showHeadshot).toBe(true);
    expect(hasCustomPhoto(next)).toBe(false);
  });

  it("can keep or clear the quote when switching speakers", () => {
    const jokic = getPlayer("3112335")!;
    const luka = getPlayer("3945274")!;
    const first = fillQuoteFromPlayer(jokic, {
      ...defaultQuoteDraft(),
      quote: "I’M HIM.",
    });
    const kept = fillQuoteFromPlayer(luka, first, false, true);
    expect(kept.playerId).toBe(luka.id);
    expect(kept.attribution.toUpperCase()).toContain("DONCIC");
    expect(kept.attribution.toUpperCase()).not.toContain("JOKIC");
    expect(quoteLastName(kept.attribution)).toBe("DONCIC");
    expect(kept.teamId).toBe(luka.team);
    expect(kept.photoSrc).toBeNull();
    expect(kept.quote).toBe("I’M HIM.");
    const cleared = fillQuoteFromPlayer(luka, first, false, false);
    expect(cleared.quote).toBe("");
    expect(quoteLastName(cleared.attribution)).toBe("DONCIC");
  });

  it("wraps long quotes to two lines and shrinks the last name", () => {
    const short = "I’M HIM.";
    const long =
      "I DIDN’T COME THIS FAR TO ONLY COME THIS FAR TONIGHT";
    expect(isLongQuote(short)).toBe(false);
    expect(isLongQuote(long)).toBe(true);
    expect(quoteMaxLines(long)).toBe(2);
    expect(quoteTypeSize(long)).toBeLessThan(quoteTypeSize(short));
    expect(quoteLastNameSize("JOKIC", long)).toBeLessThan(
      quoteLastNameSize("JOKIC", short),
    );
  });
});
