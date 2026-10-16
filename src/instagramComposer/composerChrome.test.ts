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
const headlineCss = readFileSync(
  join(root, "headlineComposer/headlineComposer.css"),
  "utf8",
);
const headlineGraphic = readFileSync(
  join(root, "headlineComposer/HeadlineGraphic.tsx"),
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
const coverCanvas = readFileSync(
  join(root, "statCardCoverComposer/renderStatCardCoverCanvas.ts"),
  "utf8",
);
const coverState = readFileSync(
  join(root, "statCardCoverComposer/statCardCoverState.ts"),
  "utf8",
);
const coverLayout = readFileSync(
  join(root, "statCardCoverComposer/statCardCoverLayout.ts"),
  "utf8",
);
const browserStorage = readFileSync(
  join(root, "lib/browserStorage.ts"),
  "utf8",
);
const composerLibrary = readFileSync(
  join(root, "instagramComposer/composerLibrary.ts"),
  "utf8",
);
const composerSaves = readFileSync(
  join(root, "instagramComposer/ComposerSaves.tsx"),
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
    expect(toolbar).toContain("sc-toolbar__body");
    expect(toolbar).toMatch(
      /sc-toolbar__pinned[\s\S]*filters[\s\S]*sc-toolbar__scroll[\s\S]*sc-toolbar__row--actions/,
    );
  });

  it("pins export outside the scrolling HUD and does not hide photo tools in preview", () => {
    expect(sheet).toMatch(/\.sc-toolbar__row--actions[\s\S]*?flex:\s*0 0 auto/);
    expect(sheet).toMatch(/\.sc-toolbar \{[\s\S]*?grid-template-rows:\s*minmax\(0,\s*1fr\) auto/);
    expect(sheet).toContain(".sc-toolbar__body");
    expect(sheet).not.toContain(".sc-stage__board .pod-photo__tools");
    expect(sheet).not.toContain(".sc-stage__board .pod-photo__pick");
    expect(photo).not.toContain(".sc-stage__board .pod-photo__tools");
    expect(headlineCss).toMatch(
      /\.hl-board\.is-exporting \.pod-photo__tools[\s\S]*?display:\s*none/,
    );
    expect(headlineApp).toContain("Export PNG");
    expect(headlineApp).toContain("Export 9:16");
    expect(headlineApp).toContain("Export pack");
    expect(headlineApp).toContain("Fill last night");
    expect(headlineApp).toMatch(/aria-label="Team"/);
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

  it("restyles Headline as a photo | team-panel split with a chevron kicker", () => {
    expect(headlineCss).toContain(".hl-panel");
    expect(headlineCss).toContain(".hl-chevron");
    expect(headlineCss).toContain(".hl-logo");
    expect(headlineGraphic).toContain("headlineSplitLayout");
    expect(headlineGraphic).toContain("hl-chevron");
    expect(headlineApp).toContain("Kicker");
    expect(headlineApp).not.toContain("aria-label=\"Headline plate color\"");
    expect(headlineApp).not.toContain("aria-label=\"Team watermark\"");
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
    expect(coverCss).toContain(".scc-board.is-gold");
    expect(coverApp).toContain("Gold");
    expect(coverApp).toContain("showGold");
  });

  it("keeps swipe on the cover only and drops Ranked SWIPE", () => {
    const rankedGraphic = readFileSync(
      join(root, "rankedLineupsComposer/RankedLineupsGraphic.tsx"),
      "utf8",
    );
    const rankedCanvas = readFileSync(
      join(root, "rankedLineupsComposer/renderRankedLineupsCanvas.ts"),
      "utf8",
    );
    expect(rankedGraphic).not.toContain("rl-swipe");
    expect(rankedCanvas).not.toContain("SWIPE");
    expect(coverCss).toContain(".scc-swipe");
    expect(coverApp).toContain("peekStatCardStatsLeft(draft.gameDate)");
  });

  it("exports a right-pointing Cover swipe chevron that matches the preview", () => {
    expect(coverLayout).toMatch(/SCC_SWIPE_SIZE = 88/);
    expect(coverLayout).toMatch(/SCC_SWIPE_LABEL = 18/);
    expect(coverLayout).toMatch(/SCC_SWIPE_CHEV = 22/);
    expect(coverCss).toMatch(/\.scc-swipe__label[\s\S]*?font-size:\s*calc\(18 \* var\(--u\)\)/);
    expect(coverCss).toMatch(/\.scc-swipe__chev \{[\s\S]*?width:\s*calc\(88 \* var\(--u\)\)/);
    expect(coverCss).toMatch(
      /\.scc-swipe__chev::after[\s\S]*?border-right:[\s\S]*?border-top:[\s\S]*?rotate\(45deg\)/,
    );
    expect(coverCanvas).toContain("moveTo(-arm, -arm)");
    expect(coverCanvas).toContain("lineTo(arm, -arm)");
    expect(coverCanvas).toContain("lineTo(arm, arm)");
    expect(coverCanvas).not.toContain("moveTo(-7 * s, 7 * s)");
    expect(coverCanvas).toContain("fillText(\"SWIPE\"");
  });

  it("keeps custom photos on the same graphic save and skips Cover auto-fill over them", () => {
    expect(browserStorage).toContain("writeDurableJson");
    expect(browserStorage).toContain("readDurableJson");
    expect(coverState).toContain("coverDraftOccupied");
    expect(coverApp).toContain("coverDraftOccupied(loaded)");
    expect(coverApp).toContain("autoFill.current = false");
    expect(coverApp).toMatch(/if \(!hydrated \|\| !autoFill\.current\)/);
    expect(composerSaves).toContain("stripComposerPhotos");
    expect(composerSaves).toContain("Saved as template (no photos).");
    expect(composerLibrary).toContain("writeNamedGraphics");
    const hub = readFileSync(
      join(root, "instagramComposer/ComposerHub.tsx"),
      "utf8",
    );
    expect(hub).toContain("hydrateJsonStorage");
    expect(hub).toContain("persistReady");
  });

  it("copies postable captions on Every Team and Tier", () => {
    const etApp = readFileSync(
      join(root, "everyTeamComposer/EveryTeamComposerApp.tsx"),
      "utf8",
    );
    const tierApp = readFileSync(
      join(root, "tierListComposer/TierListComposerApp.tsx"),
      "utf8",
    );
    expect(etApp).toContain("Copy caption");
    expect(etApp).toContain("everyTeamCaption");
    expect(tierApp).toContain("Copy caption");
    expect(tierApp).toContain("tierListCaption");
  });

  it("drops the BALLACADEMY wordmark when BA is on and shrinks TOTW Plus logos", () => {
    const etGraphic = readFileSync(
      join(root, "everyTeamComposer/EveryTeamGraphic.tsx"),
      "utf8",
    );
    const totwPlusLayout = readFileSync(
      join(root, "teamOfTheWeekPlusComposer/teamOfTheWeekPlusLayout.ts"),
      "utf8",
    );
    const nameFade = readFileSync(
      join(root, "instagramComposer/PlayerNameFade.tsx"),
      "utf8",
    );
    expect(etGraphic).toContain("showBa ? null");
    expect(totwPlusLayout).toContain("PLUS_STARTER_LOGO = 22");
    expect(nameFade).not.toMatch(/TeamLogo[\s\S]*cover/);
  });

  it("fills play-in scores on Auto-fill and ships real 9:16 plus POTD pack", () => {
    const playInApp = readFileSync(
      join(root, "playInComposer/PlayInComposerApp.tsx"),
      "utf8",
    );
    const rankedExport = readFileSync(
      join(root, "rankedLineupsComposer/exportRankedLineupsPng.ts"),
      "utf8",
    );
    const potdApp = readFileSync(
      join(root, "playerOfTheDayComposer/PlayerOfTheDayComposerApp.tsx"),
      "utf8",
    );
    const pyramidApp = readFileSync(
      join(root, "pyramidComposer/PyramidComposerApp.tsx"),
      "utf8",
    );
    const appMain = readFileSync(join(root, "main.tsx"), "utf8");
    expect(playInApp).toContain("applyLivePlayInScores");
    expect(rankedExport).not.toContain("toStoryCanvas");
    expect(potdApp).toContain("Export pack");
    expect(potdApp).toContain("renderPotdLeaderboardCanvas");
    expect(pyramidApp).toContain("PYRAMID_AWARD_GROUPS");
    expect(appMain).toContain("applyComposerFavicon");
    const rankedApp = readFileSync(
      join(root, "rankedLineupsComposer/RankedLineupsComposerApp.tsx"),
      "utf8",
    );
    expect(rankedApp).toContain('aria-label="9:16 crop check"');
    expect(rankedApp).toContain("story={storyCrop}");
    expect(totwPlusApp).toContain("story={storyCrop}");
    expect(playInApp).toContain("story={storyCrop}");
    expect(pyramidApp).toContain("story={storyCrop}");
    const compareApp = readFileSync(
      join(root, "compareComposer/CompareComposerApp.tsx"),
      "utf8",
    );
    const compareCss = readFileSync(
      join(root, "compareComposer/compareComposer.css"),
      "utf8",
    );
    const compareExport = readFileSync(
      join(root, "compareComposer/exportComparePng.ts"),
      "utf8",
    );
    expect(compareApp).toContain("story={storyCrop}");
    expect(compareExport).not.toContain("toStoryCanvas");
    expect(compareCss).toMatch(
      /\.cmp-board\.is-story \{[\s\S]*?aspect-ratio:\s*9\s*\/\s*16/,
    );
    expect(compareCss).toMatch(
      /\.cmp-photos \{[\s\S]*?bottom:\s*calc\(36 \* var\(--u\)\)/,
    );
    const totwCss = readFileSync(
      join(root, "teamOfTheWeekPlusComposer/teamOfTheWeekPlusComposer.css"),
      "utf8",
    );
    const rankedCss = readFileSync(
      join(root, "rankedLineupsComposer/rankedLineupsComposer.css"),
      "utf8",
    );
    expect(totwCss).toMatch(/\.twp-board \{[\s\S]*?display:\s*grid/);
    expect(rankedCss).toMatch(/\.rl-board \{[\s\S]*?display:\s*grid/);
    expect(totwCss).toMatch(
      /\.twp-board\.is-story \{[\s\S]*?aspect-ratio:\s*9\s*\/\s*16/,
    );
    const mockTradeApp = readFileSync(
      join(root, "mockTradeComposer/MockTradeComposerApp.tsx"),
      "utf8",
    );
    const mockTradeCss = readFileSync(
      join(root, "mockTradeComposer/mockTradeComposer.css"),
      "utf8",
    );
    const mockTradeExport = readFileSync(
      join(root, "mockTradeComposer/exportMockTradePng.ts"),
      "utf8",
    );
    expect(mockTradeApp).toContain("story={storyCrop}");
    expect(mockTradeApp).toContain("Add 3rd team");
    expect(mockTradeApp).toContain("Add pick");
    expect(mockTradeExport).not.toContain("toStoryCanvas");
    expect(mockTradeCss).toMatch(
      /\.mt-board\.is-story \{[\s\S]*?aspect-ratio:\s*9\s*\/\s*16/,
    );
  });

  it("pastes Cover photos into the last-clicked slot and drops faces below the fade", () => {
    const coverState = readFileSync(
      join(root, "statCardCoverComposer/statCardCoverState.ts"),
      "utf8",
    );
    const coverGraphic = readFileSync(
      join(root, "statCardCoverComposer/StatCardCoverGraphic.tsx"),
      "utf8",
    );
    const photoFrame = readFileSync(
      join(root, "playerOfTheDayComposer/PhotoFrame.tsx"),
      "utf8",
    );
    expect(coverCss).toContain("--photo-shift:");
    expect(coverCss).toMatch(
      /\.scc-cell \.pod-photo__img \{[\s\S]*?top:\s*calc\(var\(--photo-shift/,
    );
    expect(coverApp).toContain("coverPasteSlotIndex(photoTarget, activeIndex)");
    expect(coverApp).toContain('target.closest(".pod-photo")');
    expect(coverGraphic).toContain("onPointerDown={() => onHover?.(index)}");
    expect(coverGraphic).not.toContain("onPointerEnter={() => onHover?.(index)}");
    expect(coverState).toContain("coverPasteSlotIndex");
    expect(photoFrame).toMatch(
      /onPaste=\{\(event\) => \{\n\s*event\.stopPropagation\(\);/,
    );
  });

  it("keeps Headline transaction kickers on the chevron presets", () => {
    const presets = readFileSync(
      join(root, "instagramComposer/composerPresets.ts"),
      "utf8",
    );
    for (const plate of [
      "TRADE RUMOR",
      "TRADE",
      "SIGNING",
      "WAIVED",
      "BOUGHT OUT",
      "EXTENSION",
      "RE-SIGNED",
    ]) {
      expect(presets).toContain(plate);
    }
    expect(headlineApp).toContain("headline-kicker-presets");
  });

  it("opens Quote blank with a real-quote bank", () => {
    const quoteState = readFileSync(
      join(root, "quoteComposer/quoteState.ts"),
      "utf8",
    );
    expect(quoteState).toMatch(/DEFAULT_QUOTE = ""/);
    expect(quoteState).not.toContain("I’M HIM.");
    expect(quoteApp).toContain("Quote bank");
    expect(quoteApp).toContain("QUOTE_PRESETS");
  });

  it("shows photo tools on coarse pointers without waiting for hover", () => {
    expect(photo).toContain("@media (hover: none), (pointer: coarse)");
    expect(photo).toContain("min-height: 44px");
    expect(photo).toMatch(
      /@media \(hover: none\), \(pointer: coarse\)[\s\S]*?\.pod-photo__tools[\s\S]*?opacity:\s*1/,
    );
  });

  it("keeps compose-preview pick and zoom tools visible without HUD Edit", () => {
    const photoFrame = readFileSync(
      join(root, "playerOfTheDayComposer/PhotoFrame.tsx"),
      "utf8",
    );
    const photoCss = readFileSync(
      join(root, "playerOfTheDayComposer/playerOfTheDayComposer.css"),
      "utf8",
    );
    expect(photoFrame).toMatch(/pickLabel = "Pick player"/);
    expect(headlineGraphic).toContain('pickLabel="Pick player"');
    expect(photoCss).toMatch(
      /\.pod-photo__tools \{\n(?:[^\n]+\n){0,8}\s*opacity:\s*1;/,
    );
    expect(photoCss).not.toMatch(
      /\.pod-photo__tools \{\n(?:[^\n]+\n){0,8}\s*opacity:\s*0;/,
    );
  });
});
