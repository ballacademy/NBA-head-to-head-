// @ts-nocheck
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sheet = readFileSync(
  join(root, "standingsComposer/standingsComposer.css"),
  "utf8",
);
const photo = readFileSync(
  join(root, "playerOfTheDayComposer/playerOfTheDayComposer.css"),
  "utf8",
);

describe("composer chrome", () => {
  it("lets the player list shrink and scroll inside the picker sheet", () => {
    expect(sheet).toContain(".sc-picker__grid");
    expect(sheet).toMatch(/\.sc-picker__grid[\s\S]*?min-height:\s*0/);
    expect(sheet).toMatch(/\.sc-picker__grid[\s\S]*?flex:\s*1 1 0/);
    expect(sheet).toMatch(/\.sc-picker[\s\S]*?height:\s*min\(78dvh/);
    expect(sheet).toContain("height: 100dvh");
    expect(sheet).toContain(".sc-picker__filters-toggle");
    expect(sheet).toContain("font-size: 16px");
    expect(sheet).toContain("min-height: 72px");
    expect(sheet).toContain("min-height: 44px");
    expect(sheet).toContain("max-height: min(42vh, 360px)");
    expect(sheet).toContain(".sc-picker__suggested");
    expect(sheet).toContain(".sc-picker__grid--suggested");
    expect(sheet).toContain(".sc-team__badge");
    expect(sheet).toContain(".sc-toolbar__scroll");
    expect(sheet).toContain("position: sticky");
  });

  it("keeps filters in one full-width toolbar slot", () => {
    expect(sheet).toContain(".sc-toolbar__row--primary");
    expect(sheet).toContain(".sc-toolbar__row--data");
    expect(sheet).toContain(".sc-toolbar__filters");
    expect(sheet).toMatch(/\.sc-toolbar__row--data[\s\S]*?flex:\s*0 0 auto/);
    expect(sheet).toMatch(/\.sc-toolbar__filters[\s\S]*?flex:\s*0 0 auto/);
    expect(sheet).toContain(".sc-player-filters");
    expect(sheet).toMatch(/\.sc-player-filters[\s\S]*?border:\s*0/);
  });

  it("shows photo tools on coarse pointers without waiting for hover", () => {
    expect(photo).toContain("@media (hover: none), (pointer: coarse)");
    expect(photo).toContain("min-height: 44px");
    expect(photo).toMatch(
      /@media \(hover: none\), \(pointer: coarse\)[\s\S]*?\.pod-photo__tools[\s\S]*?opacity:\s*1/,
    );
  });
});
