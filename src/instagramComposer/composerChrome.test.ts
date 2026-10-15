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
  join(root, "instagramComposer/photoGrade.css"),
  "utf8",
);
const toolbar = readFileSync(
  join(root, "instagramComposer/ComposerToolbar.tsx"),
  "utf8",
);
const board = readFileSync(
  join(root, "instagramComposer/ComposerBoard.tsx"),
  "utf8",
);
const titleField = readFileSync(
  join(root, "instagramComposer/ComposerTitleField.tsx"),
  "utf8",
);
const statCardCss = readFileSync(
  join(root, "statCardComposer/statCardComposer.css"),
  "utf8",
);
const statCardCanvas = readFileSync(
  join(root, "statCardComposer/renderStatCardCanvas.ts"),
  "utf8",
);
const coverCss = readFileSync(
  join(root, "statCardCoverComposer/statCardCoverComposer.css"),
  "utf8",
);
const statCardApp = readFileSync(
  join(root, "statCardComposer/StatCardComposerApp.tsx"),
  "utf8",
);
const coverApp = readFileSync(
  join(root, "statCardCoverComposer/StatCardCoverComposerApp.tsx"),
  "utf8",
);
const quoteApp = readFileSync(
  join(root, "quoteComposer/QuoteComposerApp.tsx"),
  "utf8",
);
const quoteGraphic = readFileSync(
  join(root, "quoteComposer/QuoteGraphic.tsx"),
  "utf8",
);
const quoteCss = readFileSync(
  join(root, "quoteComposer/quoteComposer.css"),
  "utf8",
);
const headlineApp = readFileSync(
  join(root, "headlineComposer/HeadlineComposerApp.tsx"),
  "utf8",
);
const lastGame = readFileSync(
  join(root, "playerOfTheDayComposer/lastGame.ts"),
  "utf8",
);
const totwPlusApp = readFileSync(
  join(root, "teamOfTheWeekPlusComposer/TeamOfTheWeekPlusComposerApp.tsx"),
  "utf8",
);
const totwPlusState = readFileSync(
  join(root, "teamOfTheWeekPlusComposer/teamOfTheWeekPlusState.ts"),
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
    expect(sheet).toContain("max-height: min(56vh, 480px)");
    expect(sheet).toContain(".sc-picker__suggested");
    expect(sheet).toContain(".sc-picker__grid--suggested");
    expect(sheet).toMatch(
      /\.sc-picker__grid--suggested[\s\S]*?overflow:\s*auto/,
    );
    expect(sheet).toMatch(
      /\.sc-picker__grid--suggested[\s\S]*?min-height:\s*0/,
    );
    expect(sheet).toMatch(
      /\.sc-picker__suggested[\s\S]*?overflow:\s*hidden/,
    );
    expect(sheet).toContain(".sc-team__badge");
    expect(sheet).toContain(".sc-toolbar__scroll");
    expect(sheet).toContain("position: sticky");
    expect(toolbar).toMatch(
      /sc-toolbar__scroll[\s\S]*sc-toolbar__row--actions/,
    );
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

  it("applies the photo grade to custom photos in preview", () => {
    expect(photo).toContain(".is-grade .pod-photo__img");
    expect(photo).toMatch(/contrast\(1\.42\)/);
    expect(photo).not.toMatch(/\.is-grade\s*\{[^}]*filter:/);
  });

  it("does not shrink or condense Stat card type when Grade is on", () => {
    expect(statCardCss).not.toMatch(
      /\.stc-board\.is-grade \.stc-value[\s\S]*?letter-spacing/,
    );
    expect(statCardCss).not.toMatch(
      /\.stc-board\.is-grade \.stc-label[\s\S]*?letter-spacing/,
    );
    expect(statCardCss).not.toMatch(
      /\.stc-board\.is-grade \.stc-matchup__line/,
    );
    expect(statCardCanvas).not.toMatch(/type\.value \* s \* -0\.02/);
    expect(statCardCanvas).not.toMatch(/type\.label \* s \* 0\.12/);
    expect(statCardCanvas).not.toMatch(
      /photoGrade \? "rgba\(17, 17, 17, 0\.55\)"/,
    );
  });

  it("keeps overlay title carets on the glyphs instead of a scaled parent", () => {
    expect(board).toMatch(/zoom:\s*scale/);
    expect(board).not.toMatch(/transform:\s*`scale\(/);
    expect(titleField).toContain("composer-title-stack__paint");
    expect(sheet).toContain(".composer-title-stack__paint");
    expect(sheet).toMatch(/\.sc-stage__board-inner[\s\S]*?transform:\s*none/);
  });

  it("flips the Stat card columns without a CSS scale(-1)", () => {
    expect(statCardCss).toContain(".stc-board.is-stats-left");
    expect(statCardCss).not.toMatch(/scale\(\s*-1\s*\)/);
    expect(statCardCanvas).toContain("statCardFeedRects");
    expect(statCardCanvas).not.toMatch(/scale\(\s*-1\s*\)/);
    expect(statCardApp).toContain("StatCardFlipToggle");
    expect(statCardApp).toContain("nextStatsLeft");
    expect(coverApp).toContain("statsLeftAt");
    expect(coverApp).toContain("persistStatCardStatsLeft");
  });

  it("keeps the pull-quote as a quote when picking a player", () => {
    expect(quoteApp).toContain("setGamePresets(lastGameQuotePresets(game))");
    expect(quoteApp).not.toMatch(/quote:\s*chip/);
    expect(quoteApp).not.toMatch(/isStockQuote\(current\.quote\)/);
    expect(quoteApp).toMatch(/keepQuote !== false/);
    expect(quoteApp).toContain("Last game · tap to insert");
    expect(quoteGraphic).toContain("is-empty");
    expect(quoteGraphic).not.toContain("SOURCE (OPTIONAL)");
    expect(quoteCss).toContain(".qt-source.is-empty:not(:focus)");
  });

  it("wires Headline Fill last night to the player’s last 2026-27 game", () => {
    expect(headlineApp).toContain("gameOnOrBeforeDate");
    expect(headlineApp).toContain("fetchRecentGames");
    expect(headlineApp).toContain("Pick a player first");
    expect(headlineApp).toContain("Fill last night (pick a player first)");
    expect(headlineApp).not.toMatch(/disabled=\{!draft\.teamId\}/);
    expect(headlineApp).not.toMatch(/fetchLastGame\(next\.playerId/);
    expect(lastGame).toContain("gameOnOrBeforeDate");
    expect(lastGame).not.toMatch(
      /sample === "preseason" && !night\.game/,
    );
  });

  it("fills TOTW Plus as a 2/2/1 week plus surprise non-stars", () => {
    expect(totwPlusState).toContain("selectPlusStarters");
    expect(totwPlusState).toContain("selectPlusStandouts");
    expect(totwPlusState).toContain("plusLineupGroup");
    expect(totwPlusState).toMatch(/G:\s*2/);
    expect(totwPlusState).toContain("isPlusStar");
    expect(totwPlusApp).toContain("ComposerNightDate");
    expect(totwPlusApp).toContain("fetchWeekStandouts");
    expect(totwPlusApp).not.toContain("totwStarterStrips");
    expect(totwPlusApp).not.toContain("ddgm:team-of-the-week-composer");
  });

  it("puts gold on the cover lockup, seams, date pill, and swipe cue", () => {
    expect(coverCss).toMatch(/\.scc-title-line[\s\S]*?#facc15/);
    expect(coverCss).toContain(".scc-seam::after");
    expect(coverCss).toMatch(/\.scc-pill[\s\S]*?#d4af37/);
    expect(coverCss).toMatch(/\.scc-swipe__label[\s\S]*?#facc15/);
    expect(coverCss).toMatch(/\.scc-swipe__chev[\s\S]*?#d4af37/);
  });

  it("shows photo tools on coarse pointers without waiting for hover", () => {
    expect(photo).toContain("@media (hover: none), (pointer: coarse)");
    expect(photo).toContain("min-height: 44px");
    expect(photo).toMatch(
      /@media \(hover: none\), \(pointer: coarse\)[\s\S]*?\.pod-photo__tools[\s\S]*?opacity:\s*1/,
    );
  });
});
