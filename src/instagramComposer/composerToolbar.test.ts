// @ts-nocheck
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const APPS = [
  "standingsComposer/StandingsComposerApp.tsx",
  "everyTeamComposer/EveryTeamComposerApp.tsx",
  "tierListComposer/TierListComposerApp.tsx",
  "rankedLineupsComposer/RankedLineupsComposerApp.tsx",
  "teamOfTheWeekComposer/TeamOfTheWeekComposerApp.tsx",
  "teamOfTheWeekPlusComposer/TeamOfTheWeekPlusComposerApp.tsx",
  "playerOfTheDayComposer/PlayerOfTheDayComposerApp.tsx",
  "potdLeaderboardComposer/PotdLeaderboardComposerApp.tsx",
  "pyramidComposer/PyramidComposerApp.tsx",
  "headlineComposer/HeadlineComposerApp.tsx",
  "compareComposer/CompareComposerApp.tsx",
  "quoteComposer/QuoteComposerApp.tsx",
  "playInComposer/PlayInComposerApp.tsx",
  "statCardComposer/StatCardComposerApp.tsx",
  "statCardCoverComposer/StatCardCoverComposerApp.tsx",
  "mockTradeComposer/MockTradeComposerApp.tsx",
];

describe("composer toolbar chrome", () => {
  it("keeps shared slot order title → data → filters → board → save → export", () => {
    const source = readFileSync(
      join(root, "instagramComposer/ComposerToolbar.tsx"),
      "utf8",
    );
    expect(source).toContain("sc-toolbar__body");
    expect(source).toContain("sc-toolbar__scroll");
    expect(source).toContain("sc-toolbar__row--primary");
    expect(source).toContain("sc-toolbar__row--data");
    expect(source).toContain("sc-toolbar__row--filters");
    expect(source).toContain("sc-toolbar__row--board");
    expect(source).toContain("sc-toolbar__row--persist");
    expect(source).toContain("sc-toolbar__row--actions");
    const identity = source.indexOf("sc-toolbar__identity");
    const data = source.indexOf("sc-toolbar__data");
    const filters = source.indexOf("sc-toolbar__filters");
    const board = source.indexOf("sc-toolbar__board");
    const persist = source.indexOf("sc-toolbar__persist");
    const actions = source.indexOf("sc-toolbar__actions");
    expect(identity).toBeGreaterThan(0);
    expect(data).toBeGreaterThan(identity);
    expect(filters).toBeGreaterThan(data);
    expect(board).toBeGreaterThan(filters);
    expect(persist).toBeGreaterThan(board);
    expect(actions).toBeGreaterThan(persist);
  });

  it("uses the shared toolbar slots on every composer tab", () => {
    for (const file of APPS) {
      const source = readFileSync(join(root, file), "utf8");
      expect(source, file).toContain("ComposerToolbar");
      expect(source, file).toContain("identity=");
      expect(source, file).toContain("board=");
      expect(source, file).toContain("persist=");
      expect(source, file).toContain("actions=");
      expect(source, file).toContain("Export PNG");
      expect(source, file).not.toContain("</header>");
    }
  });

  it("keeps filters in the shared filters slot on Every Team, Tier, and Headline", () => {
    const everyTeam = readFileSync(
      join(root, "everyTeamComposer/EveryTeamComposerApp.tsx"),
      "utf8",
    );
    const tier = readFileSync(
      join(root, "tierListComposer/TierListComposerApp.tsx"),
      "utf8",
    );
    const headline = readFileSync(
      join(root, "headlineComposer/HeadlineComposerApp.tsx"),
      "utf8",
    );
    expect(everyTeam).toContain("filters=");
    expect(everyTeam).toContain("Same position");
    expect(tier).toContain("filters=");
    expect(tier).toContain("PlayerFilterBar");
    expect(headline).toContain("filters=");
    expect(headline).toContain("aria-label=\"Team\"");
  });
});
