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
const indexHtml = readFileSync(join(root, "../index.html"), "utf8");

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
    expect(sheet).toContain("max-height: min(30dvh, 240px)");
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
    expect(sheet).toMatch(
      /\.sc-picker__suggested[\s\S]*?flex:\s*0 0 auto/,
    );
    expect(sheet).not.toMatch(/flex:\s*1 1 52%/);
    expect(sheet).toContain(
      ".sc-picker--players:not(.is-filters-open) .sc-picker__filters-slot",
    );
    expect(sheet).toMatch(
      /@media \(max-width: 900px\)[\s\S]*\.sc-picker \{[\s\S]*?overflow:\s*hidden/,
    );
    expect(sheet).toMatch(
      /@media \(max-width: 900px\)[\s\S]*\.sc-picker__grid--rest \{[\s\S]*?overflow:\s*auto/,
    );
    expect(sheet).toMatch(
      /@media \(max-width: 900px\)[\s\S]*\.sc-picker__grid--rest \{[\s\S]*?min-height:\s*0/,
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
    expect(sheet).toMatch(/\.sc-toolbar \{[^}]*overflow:\s*visible/);
    expect(sheet).toMatch(
      /\.sc-toolbar__row--actions \{[^}]*position:\s*sticky/,
    );
    expect(sheet).toMatch(
      /@media \(max-width: 900px\)[\s\S]*\.sc-toolbar__row--actions \{[\s\S]*?position:\s*fixed/,
    );
    expect(sheet).not.toMatch(/height:\s*min\(52vh/);
    expect(sheet).toMatch(/html:has\(\.sc-root\)[\s\S]{0,180}?overflow-y:\s*auto/);
    expect(sheet).toContain("touch-action: none");
    expect(sheet).toMatch(/\.sc-root \{[^}]*touch-action:\s*pan-y pinch-zoom/);
    expect(sheet).toContain("var(--vvh, 100dvh)");
    expect(indexHtml).toContain("viewport-fit=cover");
    expect(sheet).toMatch(/\.sc-range \{[^}]*overflow:\s*clip/);
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
    expect(photo).toMatch(/contrast\(/);
    expect(photo).toContain("sc-grade__mix");
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

  it("fills TOTW Plus as PG–C plus role-player standouts", () => {
    expect(totwPlusState).toContain("selectPlusStarters");
    expect(totwPlusState).toContain("selectPlusStandouts");
    expect(totwPlusState).toContain("orderPlusLineup");
    expect(totwPlusState).toContain("a C cannot sit in slot 1");
    expect(totwPlusState).toContain("plusLineupGroup");
    expect(totwPlusState).toContain("PLUS_LINEUP_SLOTS");
    expect(totwPlusState).toContain("plusLineupSlotMatches");
    expect(totwPlusState).toContain("Brown SF ≠ G");
    expect(totwPlusState).toContain("Never a forward left of a guard");
    expect(totwPlusState).toContain("totwProductionScore");
    expect(totwPlusState).toContain("totwWeekScore");
    expect(totwPlusState).toContain("totwEfficiencyIndex");
    expect(totwPlusState).toContain("TOTW_MIN_GAMES");
    expect(totwPlusState).toContain("TOTW_TS_REF");
    const nightStandouts = readFileSync(
      join(root, "playerOfTheDayComposer/nightStandouts.ts"),
      "utf8",
    );
    expect(nightStandouts).toContain("export const totwCountingScore");
    expect(nightStandouts).toContain("export const totwEfficiencyIndex");
    expect(totwPlusState).toContain("TOTW_EFF_MAX");
    expect(totwPlusState).toContain("TOTW_EFF_FGA_REF");
    expect(totwPlusState).toContain("TOTW_GROUP_SOFT_MAX");
    expect(totwPlusState).toContain("TOTW_TOV_WEIGHT");
    expect(totwPlusState).toContain("totwAvailabilityIndex");
    expect(totwPlusState).toContain("TOTW_GP_BONUS");
    expect(totwPlusState).toContain("TOTW_GP_EXTRA_CAP");
    expect(totwPlusState).toContain("not a 2G/2F/1C quota");
    expect(totwPlusState).toContain("totwPickerSuggestions");
    expect(totwPlusState).toContain('"PG", "SG", "SF", "PF", "C"');
    expect(totwPlusState).toMatch(/G:\s*2/);
    expect(totwPlusState).toContain("isPlusStar");
    expect(totwPlusState).toContain("isSurpriseNight");
    expect(totwPlusState).toContain("totwStandoutScore");
    expect(totwPlusState).toContain("isCampStandout");
    expect(totwPlusState).toContain("isStandoutCandidate");
    expect(totwPlusState).toContain("STANDOUT_CAMP_PPG");
    expect(totwPlusState).toContain("STANDOUT_CAMP_HAIRCUT");
    expect(totwPlusState).not.toContain("TOTW_USAGE_FLOOR");
    expect(totwPlusState).not.toContain("isTotwRegular");
    expect(totwPlusApp).toContain("ComposerDateRange");
    expect(totwPlusApp).toContain("fetchRangeProduction");
    expect(totwPlusApp).toContain("totwPickerSuggestions");
    expect(totwPlusApp).toContain("positionless: true");
    expect(totwPlusApp).toContain("Anyone can go in this slot");
    expect(totwPlusApp).toContain('heading="Pick a player"');
    expect(totwPlusApp).not.toContain("Pick ${slotLabel");
    expect(totwPlusApp).toContain("role-player standouts");
    expect(totwPlusApp).toContain("rotation/role players who beat");
    expect(totwPlusApp).toContain("not two-way/camp 10-point weeks");
    expect(totwPlusApp).toContain("TotwStatsExportHud");
    expect(totwPlusApp).toContain("buildPlusStatsSheet");
    expect(totwPlusApp).toContain("exportTotwStatsPng");
    expect(totwPlusApp).not.toContain("fetchStandoutsInRange");
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
    expect(coverApp).toContain("setRangeStandouts(rows)");
    expect(coverApp).toContain("if (!autoFill.current)");
    expect(coverApp).not.toMatch(/if \(!hydrated \|\| !autoFill\.current\)/);
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
    expect(totwPlusLayout).toContain("PLUS_STARTER_LOGO = 18");
    expect(nameFade).toContain("ig-name-fade__lockup");
    expect(nameFade).toContain("shadow={1}");
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
    expect(potdApp).toContain("story: true");
    expect(
      readFileSync(
        join(root, "teamOfTheWeekComposer/TeamOfTheWeekComposerApp.tsx"),
        "utf8",
      ),
    ).toContain("Export pack");
    expect(potdApp).toContain("renderPotdLeaderboardCanvas");
    expect(potdApp).toContain('aria-label="Fill players from this night’s best lines"');
    expect(potdApp).toContain('aria-label={`${count} players`}');
    expect(potdApp).toContain("resizePotdCards");
    expect(potdApp).toContain("fillPotdFromStandouts");
    expect(potdApp).toContain("rankPotdNightBest");
    expect(potdApp).toContain("potdPickerSuggestions");
    expect(potdApp).toContain("fetchNightBoxAppearances");
    expect(potdApp).not.toContain("nightStandoutPickerRows(night.standouts)");
    expect(potdApp).toContain("W/L color");
    expect(potdApp).toContain('aria-label="Color W/L on the score strip"');
    expect(potdApp).toContain("wlColor={wlColor}");
    expect(potdApp).toContain("showBa, wlColor");
    const potdGraphic = readFileSync(
      join(root, "playerOfTheDayComposer/PlayerOfTheDayGraphic.tsx"),
      "utf8",
    );
    const potdCanvas = readFileSync(
      join(root, "playerOfTheDayComposer/renderPlayerOfTheDayCanvas.ts"),
      "utf8",
    );
    expect(potdGraphic).toContain("pod-wl-chip is-win");
    expect(potdGraphic).toContain("pod-wl-chip is-loss");
    expect(potdGraphic).toContain("is-3up");
    expect(potdCanvas).toContain("paintWlChip");
    expect(potdCanvas).toContain("potdResultChipFill");
    expect(potdCanvas).toContain("wlColor?: boolean");
    expect(potdCanvas).toContain("potdCardW(cardCount)");
    expect(pyramidApp).toContain("PYRAMID_AWARD_GROUPS");
    expect(appMain).toContain("applyComposerFavicon");
    const rankedApp = readFileSync(
      join(root, "rankedLineupsComposer/RankedLineupsComposerApp.tsx"),
      "utf8",
    );
    expect(rankedApp).toContain('aria-label="Story crop check"');
    expect(rankedApp).toContain("story={storyCrop}");
    expect(rankedApp).toContain("EVERY_TEAM_STAT_METRICS");
    expect(rankedApp).toContain("fillLineupByStatLeaders");
    expect(rankedApp).toContain('aria-label="Auto-fill stat"');
    expect(rankedApp).toContain('aria-label="Lineup season"');
    expect(rankedApp).toContain("Populate");
    expect(totwPlusApp).toContain("story={storyCrop}");
    expect(playInApp).toContain("story={storyCrop}");
    expect(pyramidApp).toContain("story={storyCrop}");
    expect(pyramidApp).toContain("STORY_DESIGN_HEIGHT");
    expect(pyramidApp).toContain('sc-stage__frame is-story');
    const plotApp = readFileSync(
      join(root, "plotComposer/PlotComposerApp.tsx"),
      "utf8",
    );
    expect(plotApp).toContain("populatePlotPoints");
    expect(plotApp).toContain('aria-label="X axis stat"');
    expect(plotApp).toContain('aria-label="Y axis stat"');
    expect(plotApp).toContain('aria-label="Swap X and Y"');
    expect(plotApp).toContain("Populate");
    expect(plotApp).toContain("PlayerFilterBar");
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
    expect(compareApp).toContain("Swap sides");
    expect(compareApp).toContain("Reset keep photos");
    expect(compareApp).toContain("Blank post");
    expect(compareApp).toContain("Export 1:1");
    const statCardAppUx = readFileSync(
      join(root, "statCardComposer/StatCardComposerApp.tsx"),
      "utf8",
    );
    const headlineAppUx = readFileSync(
      join(root, "headlineComposer/HeadlineComposerApp.tsx"),
      "utf8",
    );
    expect(statCardAppUx).toContain("Reset keep photos");
    expect(statCardAppUx).toContain("Blank post");
    expect(statCardAppUx).toContain("Export 1:1");
    expect(headlineAppUx).toContain("Export 1:1");
    expect(headlineAppUx).toContain("Reset keep photos");
    expect(compareCss).toContain(".cmp-brand");
    const compareGraphic = readFileSync(
      join(root, "compareComposer/CompareGraphic.tsx"),
      "utf8",
    );
    expect(compareGraphic).toContain("CMP_BRAND");
    expect(compareGraphic).not.toContain("ba-logo-circled.png");
    expect(composerSaves).toContain("Duplicate this post");
    const tabs = readFileSync(
      join(root, "instagramComposer/ComposerTabs.tsx"),
      "utf8",
    );
    expect(tabs).toContain("Recents");
    expect(tabs).toContain("Search composers");
    expect(tabs).toContain("ComposerNameStyleToggle");
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
    expect(coverGraphic).toContain("onHover?.(index)");
    expect(coverGraphic).toContain("onPointerDown=");
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

  it("keeps Cover photo tools on the portrait above the name fade", () => {
    expect(coverCss).toContain(
      "bottom: calc(var(--name-h) * var(--u) + 10 * var(--u))",
    );
    expect(coverCss).not.toMatch(
      /\.scc-cell \.pod-photo__tools \{[^}]*top:\s*calc\(8 \* var\(--u\)\)/,
    );
    expect(statCardCss).toContain("top: calc(112 * var(--u))");
    expect(headlineCss).toContain("top: calc(108 * var(--u))");
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

  it("ships the extras pack: range, multi-highlight, 2–4 cover, 6–10 lineup, duo, HUD Simple", () => {
    const tabs = readFileSync(
      join(root, "instagramComposer/ComposerTabs.tsx"),
      "utf8",
    );
    const hub = readFileSync(
      join(root, "instagramComposer/ComposerHub.tsx"),
      "utf8",
    );
    const rankedApp = readFileSync(
      join(root, "rankedLineupsComposer/RankedLineupsComposerApp.tsx"),
      "utf8",
    );
    const plotApp = readFileSync(
      join(root, "plotComposer/PlotComposerApp.tsx"),
      "utf8",
    );
    const coverApp = readFileSync(
      join(root, "statCardCoverComposer/StatCardCoverComposerApp.tsx"),
      "utf8",
    );
    const etApp = readFileSync(
      join(root, "everyTeamComposer/EveryTeamComposerApp.tsx"),
      "utf8",
    );
    const compareApp = readFileSync(
      join(root, "compareComposer/CompareComposerApp.tsx"),
      "utf8",
    );
    const mockTradeApp = readFileSync(
      join(root, "mockTradeComposer/MockTradeComposerApp.tsx"),
      "utf8",
    );
    const totwApp = readFileSync(
      join(root, "teamOfTheWeekComposer/TeamOfTheWeekComposerApp.tsx"),
      "utf8",
    );
    expect(tabs).toContain("Simple");
    expect(tabs).toContain("Full");
    expect(tabs).toContain("Last {exports.length} PNGs");
    expect(tabs).toContain("Re-download");
    expect(tabs).toContain("downloadExportHistoryItem");
    expect(tabs).toContain('mode: "injury"');
    expect(tabs).toContain('mode: "schedule"');
    expect(tabs).toContain('mode: "shot-chart"');
    expect(tabs).toContain('mode: "picks"');
    expect(hub).toContain("PicksComposerApp");
    expect(hub).toContain("is-hud-simple");
    expect(hub).toContain("InjuryComposerApp");
    expect(sheet).toContain(".sc-root.is-hud-simple .sc-toolbar__filters");
    expect(sheet).toContain(".sc-root.is-hud-simple .sc-toolbar__board");
    expect(sheet).toContain(".sc-root.is-hud-simple .sc-toolbar__persist");
    expect(sheet).toContain(".sc-root.is-hud-simple .sc-stat-slots");
    expect(sheet).toContain(
      ".sc-root.is-hud-simple .sc-tabs__group:not(.sc-tabs__group--recents)",
    );
    expect(sheet).toContain(".sc-root.is-hud-simple .sc-hud-full-only");
    expect(totwApp).toContain('simpleSet="week"');
    expect(coverApp).toContain('simpleSet="night"');
    expect(coverApp).toContain("onJumpLastNight");
    expect(coverApp).toContain('label: "Photo look"');
    expect(coverApp).toContain('label: "Story crop"');
    expect(statCardApp).toContain('simpleSet="night"');
    expect(statCardApp).toContain('label: "Photo look"');
    expect(headlineApp).toContain('className="sc-hud-full-only"');
    expect(headlineApp).toContain("onJumpLastNight");
    const potdApp = readFileSync(
      join(root, "playerOfTheDayComposer/PlayerOfTheDayComposerApp.tsx"),
      "utf8",
    );
    expect(potdApp).toContain('className="sc-look sc-hud-full-only"');
    expect(potdApp).toContain("onJumpLastNight");
    expect(potdApp).toContain("Export PNG");
    expect(potdApp).toContain("sc-hud-full-only");
    const picker = readFileSync(
      join(root, "tierListComposer/PlayerPicker.tsx"),
      "utf8",
    );
    expect(picker).toContain("onJumpLastNight");
    expect(picker.indexOf("sc-picker__suggested")).toBeLessThan(
      picker.indexOf("sc-picker__filters-slot"),
    );
    expect(totwApp).toContain("ComposerDateRange");
    expect(totwApp).toContain("fillStartersFromStandouts");
    expect(totwApp).toContain("fetchRangeProduction");
    expect(totwApp).toContain("totwPickerSuggestions");
    expect(totwApp).not.toContain("positionless: true");
    expect(totwApp).not.toContain("fetchStandoutsInRange");
    expect(totwApp).toContain("PG, SG, SF, PF, C");
    expect(totwApp).toContain("TotwStatsExportHud");
    expect(totwApp).toContain("buildTotwStatsSheet");
    expect(totwApp).toContain("exportTotwStatsPng");
    const totwStatsHud = readFileSync(
      join(root, "teamOfTheWeekComposer/TotwStatsExportHud.tsx"),
      "utf8",
    );
    expect(totwStatsHud).toContain("Copy stats");
    expect(totwStatsHud).toContain("Download CSV");
    expect(totwStatsHud).toContain("Stats sheet");
    const totwStats = readFileSync(
      join(root, "teamOfTheWeekComposer/totwStatsExport.ts"),
      "utf8",
    );
    expect(totwStats).toContain('"GP"');
    expect(totwStats).toContain('"PTS"');
    expect(totwStats).toContain('"3PM"');
    expect(totwStats).toContain('"TS%"');
    expect(totwStats).toContain('"eFG%"');
    expect(totwStats).toContain("buildPlusStatsSheet");
    expect(totwStats).toContain("totwStatsSheetName");
    const totwStatsGraphic = readFileSync(
      join(root, "teamOfTheWeekComposer/TotwStatsGraphic.tsx"),
      "utf8",
    );
    expect(totwStatsGraphic).toContain("totwStatsSheetName");
    expect(totwStatsGraphic).not.toContain("composerNameLines");
    const totwStatsCanvas = readFileSync(
      join(root, "teamOfTheWeekComposer/renderTotwStatsCanvas.ts"),
      "utf8",
    );
    expect(totwStatsCanvas).toContain("totwStatsSheetName");
    expect(totwStatsCanvas).not.toContain("composerNameLines");
    const totwStatsLayout = readFileSync(
      join(root, "teamOfTheWeekComposer/totwStatsLayout.ts"),
      "utf8",
    );
    const totwStatsCss = readFileSync(
      join(root, "teamOfTheWeekComposer/totwStatsComposer.css"),
      "utf8",
    );
    expect(totwStatsLayout).toContain("TWS_HEAD_SIZE = 13");
    expect(totwStatsLayout).toContain("TWS_VALUE_SIZE = 19");
    expect(totwStatsCanvas).toContain("TWS_HEAD_SIZE");
    expect(totwStatsCanvas).toContain("TWS_VALUE_SIZE");
    expect(totwStatsCss).toMatch(
      /\.tws-th \{[\s\S]*?font-size:\s*calc\(13 \* var\(--u\)\)/,
    );
    expect(totwStatsCss).toMatch(
      /\.tws-td \{[\s\S]*?font-size:\s*calc\(19 \* var\(--u\)\)/,
    );
    expect(totwStatsCss).toMatch(
      /\.tws-player__name \{[\s\S]*?font-size:\s*calc\(13 \* var\(--u\)\)/,
    );
    const totwGraphic = readFileSync(
      join(root, "teamOfTheWeekComposer/TeamOfTheWeekGraphic.tsx"),
      "utf8",
    );
    expect(totwGraphic).not.toContain("totwStatsFromStandout");
    expect(totwGraphic).not.toContain("Copy stats");
    expect(sheet).toContain(".sc-team.is-deserving");
    expect(picker).toContain("deserving");
    expect(picker).toContain("is-deserving");
    expect(totwPlusApp).toContain("PG, SG, SF, PF, C");
    expect(rankedApp).toContain("parsePositionLabels(undefined");
    expect(coverApp).toContain("ComposerDateRange");
    expect(statCardApp).toContain("ComposerDateRange");
    expect(rankedApp).toContain("ComposerHudSelect");
    expect(rankedApp).toContain("Lineup size");
    expect(rankedApp).toContain("RANKED_LINEUP_STRIP_MAX");
    expect(plotApp).toContain("togglePlotId");
    expect(plotApp).toContain("highlightedIds");
    expect(plotApp).toContain("applyPlot");
    expect(plotApp).toContain("skipLivePlot");
    expect(plotApp).toContain("setPopulated");
    expect(plotApp).toContain('label="All names"');
    expect(plotApp).toContain('ariaLabel="Include names on every plot dot"');
    expect(plotApp).toContain("remember={false}");
    expect(plotApp).toContain("writePlotAllNames");
    expect(plotApp).toContain("PLOT_ALL_NAMES_KEY");
    const namesToggle = readFileSync(
      join(root, "instagramComposer/ComposerNamesToggle.tsx"),
      "utf8",
    );
    expect(namesToggle).toContain("remember = true");
    expect(namesToggle).toContain("writeLastShowNames");
    const nameStyle = readFileSync(
      join(root, "instagramComposer/composerNameStyle.ts"),
      "utf8",
    );
    const nameFade = readFileSync(
      join(root, "instagramComposer/PlayerNameFade.tsx"),
      "utf8",
    );
    expect(nameStyle).toContain("COMPOSER_NAME_STYLE_EVENT");
    expect(nameStyle).toContain("composerNameLines");
    expect(nameStyle).toContain('formatComposerName(first, last, "initial")');
    expect(nameFade).toContain("useComposerNameStyle");
    expect(nameFade).toContain("composerNameLines");
    expect(coverApp).toContain("portraitCount");
    const injuryGraphic = readFileSync(
      join(root, "injuryComposer/InjuryGraphic.tsx"),
      "utf8",
    );
    const scheduleGraphic = readFileSync(
      join(root, "scheduleComposer/ScheduleGraphic.tsx"),
      "utf8",
    );
    const injuryCss = readFileSync(
      join(root, "injuryComposer/injuryComposer.css"),
      "utf8",
    );
    const scheduleCss = readFileSync(
      join(root, "scheduleComposer/scheduleComposer.css"),
      "utf8",
    );
    const picksGraphic = readFileSync(
      join(root, "picksComposer/PicksGraphic.tsx"),
      "utf8",
    );
    const picksApp = readFileSync(
      join(root, "picksComposer/PicksComposerApp.tsx"),
      "utf8",
    );
    const picksCss = readFileSync(
      join(root, "picksComposer/picksComposer.css"),
      "utf8",
    );
    const picksCanvas = readFileSync(
      join(root, "picksComposer/renderPicksCanvas.ts"),
      "utf8",
    );
    expect(injuryGraphic).toContain("inj-team__logo");
    expect(injuryGraphic).toContain("injuryFillLayout");
    expect(scheduleGraphic).toContain("sch-game__logo");
    expect(scheduleGraphic).toContain("sch-day__games");
    expect(injuryCss).toContain("grid-template-rows: repeat(var(--inj-rows");
    expect(injuryCss).toContain("align-content: stretch");
    expect(injuryCss).toMatch(/\.inj-team__logo \{[\s\S]*?position:\s*relative/);
    expect(scheduleCss).toContain(".sch-day__games");
    expect(scheduleCss).toMatch(/\.sch-game__logo \{[\s\S]*?position:\s*relative/);
    expect(picksGraphic).toContain("pk-logo");
    expect(picksGraphic).toContain("pk-check");
    expect(picksGraphic).toContain("pk-line");
    expect(picksGraphic).toContain("picksNameLabel");
    expect(picksGraphic).not.toContain(" @</span>");
    expect(picksCanvas).toContain("picksNameLabel");
    expect(picksGraphic).toContain("sortPicksGames");
    expect(picksGraphic).not.toContain("picksConferenceGroups");
    expect(picksApp).toContain("TeamPicker");
    expect(picksApp).toContain("picksDefaultTitle");
    expect(picksApp).toContain("isAutoPicksTitle");
    expect(picksApp).toContain("mergePicksFill");
    expect(picksApp).toContain("restorePicksLines");
    expect(picksApp).toContain("fetchMissingPicksLines");
    expect(picksApp).toContain('aria-label="Refresh lines"');
    expect(picksApp).toContain("Refresh lines");
    expect(picksApp).toContain("void refreshLines(draft.date, true)");
    expect(picksApp).toContain("setPicksTeam");
    expect(picksApp).toContain("showTotal");
    expect(picksApp).toContain("Plate opacity");
    expect(picksCss).toContain("--pk-plate-opacity");
    expect(picksCss).toContain("#161616 22%");
    expect(picksCss).not.toContain("#161616 36%");
    expect(picksCss).not.toContain("#161616 16%");
    expect(picksCanvas).toContain("addColorStop(0.22");
    expect(picksCss).not.toContain(".pk-logo.is-on:not(.is-empty)::after");
    expect(picksCss).toContain(".pk-check.is-on");
    expect(picksCss).toContain("border-radius: 50%");
    expect(picksCss).not.toContain(".pk-mark");
    expect(picksCss).toContain(".pk-board.is-exporting .pk-check:not(.is-on)");
    expect(picksCss).toContain(".pk-ats");
    expect(picksCss).toContain(".pk-ats-lockup");
    expect(picksCss).toContain(".pk-ats-kicker");
    expect(picksCss).toContain("calc(54 * var(--u))");
    expect(picksCss).not.toContain(".pk-footer");
    expect(picksCss).not.toContain(".pk-parlay");
    expect(picksCss).not.toContain(".pk-side.is-dim");
    expect(picksCss).toContain(".pk-ticket.is-dim");
    expect(picksCss).toContain(".pk-ticket.is-on .pk-line");
    expect(picksCss).toContain(".pk-ticket.is-dim .pk-line");
    expect(picksCss).toContain(".pk-date-notch");
    expect(picksCss).toContain(".pk-title-plate");
    expect(picksCanvas).not.toContain("paintLogoRing");
    expect(picksCanvas).toContain("paintCheck");
    expect(picksCanvas).toContain("visiblePicksGames");
    expect(picksCanvas).toContain("picksLineForSide");
    expect(picksCanvas).toContain("picksDatePill");
    expect(picksCanvas).toContain("muted ? 0.4");
    expect(picksCanvas).toContain("muted ? 700 : 900");
    expect(picksGraphic).toContain("pk-logo-edit");
    expect(picksGraphic).not.toContain("pk-mark");
    expect(picksGraphic).not.toContain("picksRecordLine");
    expect(picksGraphic).toContain("pk-ats");
    expect(picksGraphic).toContain("pk-ats-lockup");
    expect(picksGraphic).toContain("picksRecordKicker");
    expect(picksGraphic).not.toContain("pk-footer");
    expect(picksGraphic).not.toContain("pk-parlay");
    expect(picksGraphic).toContain("muted ? \"is-dim\"");
    expect(picksGraphic).not.toContain("pk-side.is-dim");
    expect(picksGraphic).toContain("visiblePicksGames");
    expect(picksApp).toContain("PICKS_LEDGER_KEY");
    expect(picksApp).toContain("Picks record");
    expect(picksApp).toContain("Record wins");
    expect(picksApp).toContain("Record losses");
    expect(picksApp).toContain("Record pushes");
    expect(picksApp).toContain("setPicksRecordField");
    expect(picksApp).toContain("ungradedPicksDates");
    expect(picksApp).toContain("applyScoresToPicksLedger");
    expect(picksCanvas).toContain("arc(x, y, size / 2");
    expect(picksCanvas).toContain("atsRecord");
    expect(picksCanvas).toContain("PICKS_RECORD_PLATE_H");
    expect(picksCanvas).toContain("picksRecordKicker");
    expect(picksCanvas).not.toContain("weekY + weekH + 12");
    expect(picksCanvas).not.toContain("picksRecordLine");
    expect(picksApp).toContain("ComposerHudExtras");
    expect(picksApp).toContain("picksCaptionLines");
    expect(picksApp).toContain('label: "Juice"');
    expect(picksApp).toContain('label: "Confidence"');
    expect(picksApp).toContain("Toggle ATS or straight up");
    const coverNameFade = readFileSync(
      join(root, "instagramComposer/PlayerNameFade.tsx"),
      "utf8",
    );
    const nameFadeCss = readFileSync(
      join(root, "instagramComposer/playerNameFade.css"),
      "utf8",
    );
    expect(coverNameFade).toContain("abbreviateOverflowName");
    expect(nameFadeCss).toContain("ig-name-fade__lockup");
    expect(nameFadeCss).toContain("align-items: center");
    const fadeDraw = readFileSync(
      join(root, "instagramComposer/drawPlayerNameFade.ts"),
      "utf8",
    );
    expect(fadeDraw).toContain("drawCenteredLogo");
    expect(fadeDraw).not.toContain("drawCoveredLogo");
    expect(nameFadeCss).toContain("white-space: nowrap");
    expect(coverCss).toContain("white-space: nowrap");
    expect(etApp).toContain("Two players per team");
    expect(compareApp).toContain("last-5");
    expect(compareApp).toContain("this-week");
    expect(mockTradeApp).toContain("showSalaries");
    expect(statCardApp).toContain("showHighPip");
    expect(statCardApp).toContain('aria-label="Season and career high pip"');
    expect(statCardApp).not.toContain('key: "high-pip"');
    expect(statCardApp).toContain("reapplyHighs");
    expect(statCardApp).toContain("rememberHighPip");
    expect(statCardApp).toContain("withStatCardHighPip");
    expect(statCardApp).toContain("void reapplyHighs(player.id)");
    expect(statCardApp).toContain("rememberHighPip(false)");
    const statGraphic = readFileSync(
      join(root, "statCardComposer/StatCardGraphic.tsx"),
      "utf8",
    );
    expect(statGraphic).toContain("statHighLabel");
    expect(statCardCanvas).toContain("statHighLabel");
    expect(statCardCanvas).toMatch(/const size = 24 \* s/);
    expect(statCardCss).toMatch(
      /\.stc-high \{[\s\S]*?position:\s*relative[\s\S]*?font-size:\s*calc\(24 \* var\(--u\)\)/,
    );
    expect(coverCss).toContain(
      "bottom: calc(var(--name-h) * var(--u) + 10 * var(--u))",
    );
  });

  it("lets Andrew drag-swap player slots on the preview", () => {
    const totwGraphic = readFileSync(
      join(root, "teamOfTheWeekComposer/TeamOfTheWeekGraphic.tsx"),
      "utf8",
    );
    const totwApp = readFileSync(
      join(root, "teamOfTheWeekComposer/TeamOfTheWeekComposerApp.tsx"),
      "utf8",
    );
    const totwPlusGraphic = readFileSync(
      join(root, "teamOfTheWeekPlusComposer/TeamOfTheWeekPlusGraphic.tsx"),
      "utf8",
    );
    const rankedGraphic = readFileSync(
      join(root, "rankedLineupsComposer/RankedLineupsGraphic.tsx"),
      "utf8",
    );
    const rankedState = readFileSync(
      join(root, "rankedLineupsComposer/rankedLineupsState.ts"),
      "utf8",
    );
    const rankedApp = readFileSync(
      join(root, "rankedLineupsComposer/RankedLineupsComposerApp.tsx"),
      "utf8",
    );
    const photoFrame = readFileSync(
      join(root, "playerOfTheDayComposer/PhotoFrame.tsx"),
      "utf8",
    );
    const coverGraphic = readFileSync(
      join(root, "statCardCoverComposer/StatCardCoverGraphic.tsx"),
      "utf8",
    );
    const pyramidGraphic = readFileSync(
      join(root, "pyramidComposer/PyramidGraphic.tsx"),
      "utf8",
    );
    const compareGraphic = readFileSync(
      join(root, "compareComposer/CompareGraphic.tsx"),
      "utf8",
    );
    const mockTradeGraphic = readFileSync(
      join(root, "mockTradeComposer/MockTradeGraphic.tsx"),
      "utf8",
    );
    expect(totwGraphic).toContain("data-composer-slot");
    expect(totwGraphic).toContain("useComposerSlotSwap");
    expect(totwGraphic).toContain("slotSwapEnabled");
    expect(totwApp).toContain("swapStrips");
    expect(totwPlusGraphic).toContain("data-composer-slot");
    expect(totwPlusGraphic).toContain("onSwapStart={slotSwap.startDrag}");
    expect(totwPlusApp).toContain("swapStrips");
    expect(rankedGraphic).toContain("data-composer-slot");
    expect(rankedGraphic).toContain("useComposerSlotSwap");
    expect(rankedState).toContain("swapRankedLineup");
    expect(rankedApp).toContain("swapRankedLineup");
    expect(photoFrame).toContain("slotSwapEnabled");
    expect(coverGraphic).toContain("data-composer-slot");
    expect(coverGraphic).toContain("onHover?.(index)");
    expect(pyramidGraphic).toContain("data-composer-slot");
    expect(compareGraphic).toContain("data-composer-slot");
    expect(mockTradeGraphic).toContain("mockTradePlayerSlot");
    expect(mockTradeGraphic).toContain("data-composer-slot");
    const standingsGraphic = readFileSync(
      join(root, "standingsComposer/StandingsGraphic.tsx"),
      "utf8",
    );
    const standingsApp = readFileSync(
      join(root, "standingsComposer/StandingsComposerApp.tsx"),
      "utf8",
    );
    const rankingState = readFileSync(
      join(root, "standingsComposer/rankingState.ts"),
      "utf8",
    );
    expect(standingsGraphic).toContain("data-composer-slot");
    expect(standingsGraphic).toContain("useComposerSlotSwap");
    expect(standingsGraphic).toContain("standingRecordForTeam");
    expect(standingsApp).toContain("insertRankingSlots");
    expect(standingsApp).toContain("Save last week East");
    expect(standingsApp).toContain("Save last week West");
    expect(standingsApp).toContain("LAST_WEEK_STORAGE_KEYS");
    expect(rankingState).toContain("insertRankingSlots");
    expect(rankingState).toContain("last-week:east");
    expect(rankingState).toContain("last-week:west");
  });

  it("ships HUD extras 17–32 on the shared chrome", () => {
    const tabs = readFileSync(
      join(root, "instagramComposer/ComposerTabs.tsx"),
      "utf8",
    );
    const hub = readFileSync(
      join(root, "instagramComposer/ComposerHub.tsx"),
      "utf8",
    );
    const grade = readFileSync(
      join(root, "instagramComposer/PhotoGradeToggle.tsx"),
      "utf8",
    );
    const pack = readFileSync(
      join(root, "instagramComposer/exportPack.ts"),
      "utf8",
    );
    const picker = readFileSync(
      join(root, "tierListComposer/PlayerPicker.tsx"),
      "utf8",
    );
    const photo = readFileSync(
      join(root, "playerOfTheDayComposer/PhotoFrame.tsx"),
      "utf8",
    );
    const ba = readFileSync(
      join(root, "instagramComposer/BaMarkToggle.tsx"),
      "utf8",
    );
    const totwApp = readFileSync(
      join(root, "teamOfTheWeekComposer/TeamOfTheWeekComposerApp.tsx"),
      "utf8",
    );
    expect(tabs).toContain("Search composers");
    expect(tabs).toContain("jumpComposerMode");
    expect(tabs).toContain("Focus");
    expect(tabs).toContain("Fit");
    expect(tabs).toContain("Preview zoom");
    expect(tabs).toContain('"75"');
    expect(tabs).toContain("sc-unsaved");
    expect(hub).toContain("is-hud-focus");
    expect(hub).toContain("composerHotkeyAction");
    expect(hub).toContain("data-ba-corner");
    expect(grade).toContain("Photo look");
    expect(grade).not.toMatch(/aria-label="Photo grade"/);
    expect(pack).toContain("toSquareCanvas");
    expect(picker).not.toContain("Recently used");
    expect(picker).toContain("rememberComposerPlayer");
    expect(picker).not.toContain("rememberRecentPlayer");
    expect(picker).not.toContain("recentPickerPlayers");
    expect(picker).toContain("suggestedHeading");
    expect(picker).toContain("extraSuggestedHeading");
    expect(picker).toContain("sc-picker__suggested");
    expect(picker).toContain("sc-picker__suggested--dud");
    expect(picker).toContain("LIVE / IN GAME");
    expect(picker).toContain("sc-team__live");
    expect(photo).toContain("ArrowLeft");
    expect(ba).toContain("Top left");
    expect(ba).toContain("Bottom right");
    expect(ba).toContain("ComposerHudSelect");
    const lookToggle = readFileSync(
      join(root, "instagramComposer/ComposerLookToggle.tsx"),
      "utf8",
    );
    const namesToggle = readFileSync(
      join(root, "instagramComposer/ComposerNameStyleToggle.tsx"),
      "utf8",
    );
    const hudSelect = readFileSync(
      join(root, "instagramComposer/ComposerHudSelect.tsx"),
      "utf8",
    );
    expect(lookToggle).toContain("ComposerHudSelect");
    expect(lookToggle).toContain("Frames");
    expect(lookToggle).toContain("White");
    expect(lookToggle).toContain("Black");
    expect(lookToggle).toContain("None");
    expect(lookToggle).not.toContain("aria-pressed");
    expect(namesToggle).toContain("ComposerHudSelect");
    expect(hudSelect).toContain("sc-hud-select__trigger");
    expect(hudSelect).toContain("sc-hud-select__value");
    expect(hudSelect).toContain("sc-hud-select__menu");
    expect(hudSelect).toContain("visualViewport");
    expect(hudSelect).toContain("maxHeight");
    expect(sheet).toContain(".sc-hud-select__menu");
    const totwHud = readFileSync(
      join(root, "teamOfTheWeekComposer/TeamOfTheWeekComposerApp.tsx"),
      "utf8",
    );
    const totwPlusHud = readFileSync(
      join(root, "teamOfTheWeekPlusComposer/TeamOfTheWeekPlusComposerApp.tsx"),
      "utf8",
    );
    const shotHud = readFileSync(
      join(root, "shotChartComposer/ShotChartComposerApp.tsx"),
      "utf8",
    );
    expect(totwHud).toContain("Export pack");
    expect(totwPlusHud).toContain("Export pack");
    expect(shotHud).toContain("story: true");
    expect(shotHud).toContain("{ letterbox: false }");
    const hotkeys = readFileSync(
      join(root, "instagramComposer/composerHotkeys.ts"),
      "utf8",
    );
    expect(hotkeys).toContain(".sc-hud-select");
    expect(hotkeys).toContain(".sc-hud-select__menu");
    expect(totwApp).toContain("nextEmptySlotIndex");
    expect(totwApp).toContain("confirmBlankPost");
    expect(totwApp).toContain("showComposerToast");
    expect(sheet).toContain("is-hud-focus");
    expect(sheet).toContain("data-ba-corner");
  });

  it("plots ESPN play-by-play shot coordinates on a full half-court", () => {
    const shotState = readFileSync(
      join(root, "shotChartComposer/shotChartState.ts"),
      "utf8",
    );
    const shotGraphic = readFileSync(
      join(root, "shotChartComposer/ShotChartGraphic.tsx"),
      "utf8",
    );
    const shotCanvas = readFileSync(
      join(root, "shotChartComposer/renderShotChartCanvas.ts"),
      "utf8",
    );
    expect(shotState).toContain("site.web.api.espn.com");
    expect(shotState).toContain("item.shootingPlay !== true");
    expect(shotState).toContain("isFreeThrow");
    expect(shotState).not.toContain("Math.random");
    expect(shotGraphic).toContain("No shot location data");
    expect(shotGraphic).toContain("shotChartBoardRects");
    expect(shotCanvas).toContain("shotChartBoardRects");
    expect(shotCanvas).toContain("paintHalfCourt");
    expect(shotCanvas).toContain("paintHeaderMetalField");
    const shotCss = readFileSync(
      join(root, "shotChartComposer/shotChartComposer.css"),
      "utf8",
    );
    const plotCss = readFileSync(
      join(root, "plotComposer/plotComposer.css"),
      "utf8",
    );
    const plotCanvas = readFileSync(
      join(root, "plotComposer/renderPlotCanvas.ts"),
      "utf8",
    );
    expect(shotCss).toContain("clip-path: inset(0 0 calc(100% - var(--header-h)) 0)");
    expect(shotCss).not.toMatch(
      /\.shc-board \{[^}]*composer-background-texture/,
    );
    expect(plotCss).toContain("repeating-linear-gradient");
    expect(plotCss).not.toMatch(
      /\.plt-board \{[^}]*composer-background-texture/,
    );
    expect(plotCanvas).toContain("paintCharcoalHairlineFloor");
  });

  it("keeps Stat card + POTD recs on finals and leaderboard rows name then photo then logo", () => {
    const picker = readFileSync(
      join(root, "tierListComposer/PlayerPicker.tsx"),
      "utf8",
    );
    const potdState = readFileSync(
      join(root, "playerOfTheDayComposer/playerOfTheDayState.ts"),
      "utf8",
    );
    const potdGraphic = readFileSync(
      join(root, "potdLeaderboardComposer/PotdLeaderboardGraphic.tsx"),
      "utf8",
    );
    const plbCss = readFileSync(
      join(root, "potdLeaderboardComposer/potdLeaderboardComposer.css"),
      "utf8",
    );
    const nights = readFileSync(
      join(root, "playerOfTheDayComposer/nightStandouts.ts"),
      "utf8",
    );
    const statCardState = readFileSync(
      join(root, "statCardComposer/statCardState.ts"),
      "utf8",
    );
    expect(statCardApp).toContain("completedNightRows");
    expect(statCardApp).toContain("fetchDudsInRange");
    expect(statCardApp).toContain("extraSuggestedHeading");
    expect(statCardApp).toContain('"Rough night"');
    expect(statCardApp).toContain("fillStatCardFromRoughNight");
    expect(statCardApp).toContain("fillPickedLastGame");
    expect(statCardApp).toContain("fromRoughNight");
    expect(statCardApp).toContain('recs === "rough-night"');
    expect(statCardApp).toContain("samePlayer");
    expect(statCardApp).toContain("fillSeq");
    expect(statCardApp).not.toContain("draft.playerId]);");
    expect(statCardApp).toContain("fillStatCardFromGame(current, game)");
    expect(statCardApp).toContain("applyHudStats");
    expect(statCardApp).toContain("commitHudStats");
    expect(statCardState).toContain("ensurePtsFirst");
    expect(statCardState).toContain("keepTovThenMin");
    expect(statCardState).toContain("NO_HIGH_PIP_KEYS");
    expect(statCardState).toMatch(/NO_HIGH_PIP_KEYS[\s\S]*"min"/);
    expect(statCardState).toContain("withAutoFillStatOrder");
    expect(statCardApp).not.toContain("filters=");
    expect(statCardApp).toContain("nightStandoutPickerRows(completedNightRows(rangeStandouts))");
    const dataAt = statCardApp.indexOf("data=");
    const onCardAt = statCardApp.indexOf("On-card stats");
    const boardAt = statCardApp.indexOf("board=");
    expect(dataAt).toBeGreaterThan(0);
    expect(onCardAt).toBeGreaterThan(dataAt);
    expect(onCardAt).toBeLessThan(boardAt);
    const hudSlots = statCardApp.slice(onCardAt, boardAt);
    expect(hudSlots).toContain("setStatCardLineKey");
    expect(hudSlots).toContain("removeStatCardLine");
    expect(hudSlots).toContain("addStatCardLine");
    expect(hudSlots).toContain("commitHudStats");
    expect(hudSlots).toContain("sc-stat-slots");
    const slotBlock = hudSlots.slice(
      0,
      hudSlots.indexOf('aria-label="Stat source"'),
    );
    expect(slotBlock).not.toContain("fillStats");
    const addAt = slotBlock.indexOf("sc-stat-slots__add");
    const firstSlotAt = slotBlock.indexOf("Stat ${index + 1}");
    expect(addAt).toBeGreaterThan(0);
    expect(addAt).toBeLessThan(firstSlotAt);
    expect(sheet).toContain(".sc-stat-slots");
    expect(picker).toContain('aria-label="Recs"');
    expect(picker).toContain("Standouts");
    expect(picker).toContain("Rough night");
    expect(picker).toContain('useState<"standouts" | "rough-night">');
    expect(picker).toContain("metaOverride || (isCurrent ? \"This slot\" : identity)");
    expect(picker).toContain('recs?: "standouts" | "rough-night"');
    expect(picker).toContain(
      'handlePick(id, showDudRecs ? "rough-night" : "standouts")',
    );
    expect(picker).not.toContain("isCurrent ? \"This slot\" : (metaOverride || identity)");
    expect(picker).not.toContain("showExtraSuggestedSection");
    expect(sheet).toContain(".sc-picker__recs");
    expect(sheet).not.toContain(
      ".sc-picker:has(.sc-picker__suggested--dud) .sc-picker__suggested:not(.sc-picker__suggested--dud)",
    );
    expect(coverApp).toContain("completedNightRows");
    expect(coverApp).toContain("fetchStandoutsInRange");
    expect(coverApp).toContain("useStatCoverDateRange");
    expect(coverApp).toContain("Cover + cards");
    expect(coverApp).toContain("story: true");
    expect(coverApp).toContain("hasCustomPhoto(slot)");
    expect(statCardApp).toContain("useStatCoverDateRange");
    expect(statCardApp).toContain("ComposerHudExtras");
    expect(coverApp).toContain("pickerOpen");
    expect(coverApp).not.toContain("if (!hydrated || !autoFill.current)");
    expect(coverApp).not.toContain("suggestedLoading={false}");
    expect(coverApp).not.toContain("fetchDudsInRange");
    expect(coverApp).not.toContain("extraSuggested");
    expect(potdState).toContain("isCompletedNightRow");
    expect(potdState).toContain("LIVE / IN GAME");
    expect(nights).toContain("espnEventIsFinal");
    expect(nights).toContain("espnEventIsLive");
    expect(nights).toContain("rankNightDuds");
    expect(nights).toContain("isHighTovNight");
    expect(nights).toContain("isStandoutOverRoughNight");
    expect(nights).not.toMatch(/eventIsPlayed[\s\S]*?state === "in"[\s\S]{0,80}return false/);
    expect(picker).toContain("LIVE / IN GAME");
    expect(picker).toContain("const searching = Boolean(query.trim());");
    expect(picker).toMatch(/searching\s*\?\s*players/);
    expect(sheet).toContain(".sc-picker__suggested--dud");
    expect(sheet).toContain(".sc-team.is-live");
    expect(sheet).toContain(".sc-team__live");
    expect(potdGraphic).toMatch(
      /plb-rank[\s\S]*plb-name-cell[\s\S]*plb-head[\s\S]*plb-pip[\s\S]*plb-wins/,
    );
    expect(plbCss).toMatch(
      /\.plb-board\.is-pips-on \.plb-row \{[\s\S]*118 \* var\(--u\)\) minmax\(0, 1fr\) calc\(70 \* var\(--u\)\) calc\(64 \* var\(--u\)\)/,
    );
    expect(plbCss).toContain("min-height: calc(78 * var(--u))");
    expect(plbCss).toContain("width: calc(62 * var(--u))");
    expect(plbCss).toContain("width: calc(56 * var(--u))");
  });
});
