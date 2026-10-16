// @ts-nocheck
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chainHudWheel } from "./chainHudWheel";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("chainHudWheel", () => {
  it("exports a page-scroll chain for HUD wheel events", () => {
    expect(chainHudWheel).toBeTypeOf("function");
    const source = readFileSync(
      join(root, "instagramComposer/chainHudWheel.ts"),
      "utf8",
    );
    expect(source).toContain("document.scrollingElement");
    expect(source).toContain("page.scrollBy");
    expect(source).toContain(".sc-picker, dialog, .sc-modal");
    const hub = readFileSync(
      join(root, "instagramComposer/ComposerHub.tsx"),
      "utf8",
    );
    expect(hub).toContain("chainHudWheel(root)");
    expect(hub).toContain('data-scroller="page"');
  });

  it("does not trap wheel on overflow:hidden HUD chrome", () => {
    const sheet = readFileSync(
      join(root, "standingsComposer/standingsComposer.css"),
      "utf8",
    );
    const tabs = readFileSync(
      join(root, "instagramComposer/ComposerTabs.tsx"),
      "utf8",
    );
    const grade = readFileSync(
      join(root, "instagramComposer/photoGrade.css"),
      "utf8",
    );
    expect(sheet).toMatch(/\.sc-toolbar__body \{[^}]*overflow:\s*visible/);
    expect(sheet).not.toMatch(
      /\.sc-toolbar__body \{[^}]*overscroll-behavior:\s*contain/,
    );
    expect(sheet).toMatch(/\.sc-tabs \{[^}]*overflow:\s*visible/);
    expect(sheet).toMatch(
      /\.sc-toolbar__row--actions \{[^}]*position:\s*sticky/,
    );
    expect(sheet).not.toMatch(/overflow-x:\s*auto;\s*\n\s*overflow-y:\s*hidden/);
    expect(sheet).toMatch(/touch-action:\s*none/);
    expect(sheet).toMatch(/\.sc-range \{[^}]*overflow:\s*clip/);
    expect(tabs).toContain("sc-tabs__bar");
    expect(tabs).toContain("sc-tabs__group--recents");
    expect(grade).toContain("sc-grade__mix");
    expect(grade).toMatch(/overflow:\s*clip/);
    expect(grade).toMatch(/\.sc-grade__mix \.sc-toolbar__eyebrow \{[^}]*white-space:\s*nowrap/);
    const toggle = readFileSync(
      join(root, "instagramComposer/PhotoGradeToggle.tsx"),
      "utf8",
    );
    expect(toggle).toContain("sc-range");
    expect(toggle).toContain("setPointerCapture");
    expect(toggle).toContain("clampPhotoGradeIntensity");
  });
});
