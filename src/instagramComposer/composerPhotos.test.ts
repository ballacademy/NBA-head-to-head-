import { describe, expect, it } from "vitest";
import { stripComposerPhotos } from "./composerPhotos";

describe("save as template", () => {
  it("keeps layout fields and clears nested photos", () => {
    const board = {
      title: "STAT CARD",
      photoSrc: "data:image/png;base64,abc",
      customPhoto: true,
      sides: [
        { photoSrc: "https://cdn/a.png", customPhoto: true, firstName: "Luka" },
        { photoSrc: null, customPhoto: false, firstName: "Shai" },
      ],
      cards: [{ photoSrc: "x", customPhoto: true, stats: { pts: "20" } }],
    };
    const template = stripComposerPhotos(board);
    expect(template.title).toBe("STAT CARD");
    expect(template.photoSrc).toBeNull();
    expect(template.customPhoto).toBe(false);
    expect(template.sides[0]?.photoSrc).toBeNull();
    expect(template.sides[0]?.customPhoto).toBe(false);
    expect(template.sides[0]?.firstName).toBe("Luka");
    expect(template.cards[0]?.stats.pts).toBe("20");
    expect(template.cards[0]?.photoSrc).toBeNull();
  });
});
