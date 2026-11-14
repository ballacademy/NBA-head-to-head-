// @ts-nocheck
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  SCC_DATE_SIZE,
  SCC_FADE_H,
  SCC_PILL_H,
  SCC_TITLE_SIZE,
} from "../statCardCoverComposer/statCardCoverLayout";
import {
  TK_DATE_SIZE,
  TK_FADE_H,
  TK_LINE_SIZE,
  TK_NAME_FAMILY,
  TK_PILL_H,
  TK_TITLE_SIZE,
  TK_WELL_H,
} from "./takeawaysLayout";

const root = dirname(fileURLToPath(import.meta.url));

describe("takeaways visual punch", () => {
  it("uses a stronger lockup, WEEK pip, fade, and card well than standouts", () => {
    expect(TK_TITLE_SIZE).toBeGreaterThan(SCC_TITLE_SIZE);
    expect(TK_FADE_H).toBeGreaterThan(SCC_FADE_H);
    expect(TK_PILL_H).toBeGreaterThan(SCC_PILL_H);
    expect(TK_DATE_SIZE).toBeGreaterThan(SCC_DATE_SIZE);
    expect(TK_WELL_H).toBeGreaterThan(340);
    expect(TK_LINE_SIZE).toBeGreaterThan(34);
    expect(TK_NAME_FAMILY).toBeGreaterThan(28);
  });

  it("paints gold-fill WEEK, gold seams, and card name lockup in CSS", () => {
    const css = readFileSync(join(root, "takeawaysComposer.css"), "utf8");
    const cover = readFileSync(join(root, "TakeawaysCoverGraphic.tsx"), "utf8");
    const card = readFileSync(join(root, "TakeawaysCardGraphic.tsx"), "utf8");
    const coverCanvas = readFileSync(
      join(root, "renderTakeawaysCoverCanvas.ts"),
      "utf8",
    );
    expect(css).toContain(".tk-cover.is-gold .scc-pill");
    expect(css).toMatch(/\.tk-cover\.is-gold \.scc-pill \{[\s\S]*?background:\s*#facc15/);
    expect(css).toContain(".tk-cover.is-gold .scc-seam::after");
    expect(css).toContain(".tk-card .ig-name-fade");
    expect(css).not.toContain(".tk-card .nf-fade");
    expect(css).toContain(".tk-card .pod-photo.is-empty");
    expect(css).toContain(".tk-cover.is-type-only:not(.is-metal)");
    expect(css).toContain(".tk-well::before");
    expect(cover).toContain("TK_FADE_H");
    expect(cover).toContain("TK_TITLE_SIZE");
    expect(cover).toContain("TK_PHOTO_SHIFT");
    expect(card).toContain("TK_NAME_FAMILY");
    expect(card).toContain("--name-h");
    expect(coverCanvas).not.toContain("renderStatCardCoverCanvas");
  });
});
