import { describe, expect, it } from "vitest";
import { keepComposerPhotos, stripComposerPhotos } from "./composerPhotos";

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

  it("keeps custom crops on a blanked board", () => {
    const live: {
      title: string;
      photoSrc: string | null;
      customPhoto: boolean;
      pan: { x: number; y: number; zoom: number; rotate: number };
      firstName: string;
      sides: Array<{
        photoSrc: string | null;
        customPhoto: boolean;
        firstName: string;
        pan?: { x: number; y: number; zoom: number; rotate: number };
      }>;
    } = {
      title: "STAT CARD",
      photoSrc: "data:image/png;base64,abc",
      customPhoto: true,
      pan: { x: 0.4, y: 0.2, zoom: 1.2, rotate: 0 },
      firstName: "Luka",
      sides: [
        {
          photoSrc: "https://cdn/a.png",
          customPhoto: true,
          firstName: "Shai",
          pan: { x: 0.5, y: 0.3, zoom: 1, rotate: 0 },
        },
        { photoSrc: null, customPhoto: false, firstName: "Luka" },
      ],
    };
    const blank: typeof live = {
      title: "COMPARE",
      photoSrc: null,
      customPhoto: false,
      pan: { x: 0.5, y: 0.5, zoom: 1, rotate: 0 },
      firstName: "",
      sides: [
        { photoSrc: null, customPhoto: false, firstName: "", pan: { x: 0.5, y: 0.5, zoom: 1, rotate: 0 } },
        { photoSrc: null, customPhoto: false, firstName: "" },
      ],
    };
    const kept = keepComposerPhotos(blank, live);
    expect(kept.title).toBe("COMPARE");
    expect(kept.firstName).toBe("");
    expect(kept.photoSrc).toBe("data:image/png;base64,abc");
    expect(kept.customPhoto).toBe(true);
    expect(kept.pan.zoom).toBe(1.2);
    expect(kept.sides[0]?.firstName).toBe("");
    expect(kept.sides[0]?.photoSrc).toBe("https://cdn/a.png");
    expect(kept.sides[0]?.customPhoto).toBe(true);
    expect(kept.sides[1]?.photoSrc).toBeNull();
  });
});
