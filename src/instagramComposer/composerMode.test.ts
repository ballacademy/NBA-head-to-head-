import { describe, expect, it } from "vitest";
import {
  composerHref,
  readComposerMode,
} from "./composerMode";
import { COMPOSER_TAB_GROUPS } from "./ComposerTabs";

describe("composer mode", () => {
  it("keeps `/` on standings", () => {
    expect(readComposerMode("", "/")).toBe("standings");
    expect(readComposerMode("?hub=rankings", "/")).toBe("standings");
    expect(composerHref("standings")).toBe("/");
  });

  it("opens the tier list from path or query", () => {
    expect(readComposerMode("", "/tier-list")).toBe("tier");
    expect(readComposerMode("", "/tiers")).toBe("tier");
    expect(readComposerMode("?composer=tier", "/")).toBe("tier");
    expect(composerHref("tier")).toBe("/tier-list");
  });

  it("opens the every-team grid from path or query", () => {
    expect(readComposerMode("", "/every-team")).toBe("every-team");
    expect(readComposerMode("", "/by-team")).toBe("every-team");
    expect(readComposerMode("?composer=every-team", "/")).toBe("every-team");
    expect(readComposerMode("?composer=by-team", "/")).toBe("every-team");
    expect(composerHref("every-team")).toBe("/every-team");
  });

  it("opens player of the day from path or query", () => {
    expect(readComposerMode("", "/player-of-the-day")).toBe("player-of-the-day");
    expect(readComposerMode("", "/potd")).toBe("player-of-the-day");
    expect(readComposerMode("?composer=player-of-the-day", "/")).toBe(
      "player-of-the-day",
    );
    expect(composerHref("player-of-the-day")).toBe("/player-of-the-day");
  });

  it("opens the POTD leaderboard next to player of the day", () => {
    expect(readComposerMode("", "/potd-leaderboard")).toBe("potd-leaderboard");
    expect(readComposerMode("", "/leaderboard")).toBe("potd-leaderboard");
    expect(readComposerMode("?composer=potd-leaderboard", "/")).toBe(
      "potd-leaderboard",
    );
    expect(readComposerMode("", "/potd")).toBe("player-of-the-day");
    expect(composerHref("potd-leaderboard")).toBe("/potd-leaderboard");
  });

  it("opens team of the week from path or query", () => {
    expect(readComposerMode("", "/team-of-the-week")).toBe("team-of-the-week");
    expect(readComposerMode("", "/totw")).toBe("team-of-the-week");
    expect(readComposerMode("?composer=team-of-the-week", "/")).toBe(
      "team-of-the-week",
    );
    expect(readComposerMode("?composer=totw", "/")).toBe("team-of-the-week");
    expect(composerHref("team-of-the-week")).toBe("/team-of-the-week");
  });

  it("opens the plus composer from a separate path", () => {
    expect(readComposerMode("", "/team-of-the-week-plus")).toBe(
      "team-of-the-week-plus",
    );
    expect(readComposerMode("", "/totw-plus")).toBe("team-of-the-week-plus");
    expect(readComposerMode("?composer=totw-plus", "/")).toBe(
      "team-of-the-week-plus",
    );
    expect(readComposerMode("", "/team-of-the-week")).toBe("team-of-the-week");
    expect(readComposerMode("?composer=totw", "/team-of-the-week-plus")).toBe(
      "team-of-the-week-plus",
    );
    expect(composerHref("team-of-the-week-plus")).toBe(
      "/team-of-the-week-plus",
    );
  });

  it("groups hub tabs as Rankings, Night / week / stats, and News", () => {
    expect(COMPOSER_TAB_GROUPS.map((group) => group.label)).toEqual([
      "Rankings",
      "Night / week / stats",
      "News",
    ]);
    expect(COMPOSER_TAB_GROUPS[0]!.tabs.map((tab) => tab.mode)).toEqual([
      "standings",
      "tier",
      "every-team",
      "pyramid",
      "plot",
      "ranked-lineups",
      "lineup",
    ]);
    expect(COMPOSER_TAB_GROUPS[1]!.tabs.map((tab) => tab.mode)).toEqual([
      "stat-card",
      "stat-card-cover",
      "compare",
      "player-of-the-day",
      "potd-leaderboard",
      "team-of-the-week",
      "team-of-the-week-plus",
    ]);
    expect(COMPOSER_TAB_GROUPS[2]!.tabs.map((tab) => tab.mode)).toEqual([
      "headline",
      "quote",
      "mock-trade",
      "play-in",
    ]);
    const modes = COMPOSER_TAB_GROUPS.flatMap((group) =>
      group.tabs.map((tab) => tab.mode),
    );
    expect(new Set(modes).size).toBe(modes.length);
    expect(modes).toHaveLength(18);
  });

  it("opens pyramid and headline from path or query", () => {
    expect(readComposerMode("", "/pyramid")).toBe("pyramid");
    expect(readComposerMode("?composer=pyramid", "/")).toBe("pyramid");
    expect(composerHref("pyramid")).toBe("/pyramid");
    expect(readComposerMode("", "/headline")).toBe("headline");
    expect(readComposerMode("", "/hot-take")).toBe("headline");
    expect(readComposerMode("?composer=headline", "/")).toBe("headline");
    expect(composerHref("headline")).toBe("/headline");
  });

  it("opens lineup, compare, quote, and play-in from path", () => {
    expect(readComposerMode("", "/lineup")).toBe("lineup");
    expect(readComposerMode("", "/lineups")).toBe("ranked-lineups");
    expect(composerHref("lineup")).toBe("/lineup");
    expect(readComposerMode("", "/compare")).toBe("compare");
    expect(readComposerMode("", "/quote")).toBe("quote");
    expect(readComposerMode("", "/play-in")).toBe("play-in");
    expect(composerHref("play-in")).toBe("/play-in");
    expect(readComposerMode("", "/stat-card")).toBe("stat-card");
    expect(composerHref("stat-card")).toBe("/stat-card");
    expect(readComposerMode("", "/stat-card-cover")).toBe("stat-card-cover");
    expect(readComposerMode("", "/stat-cover")).toBe("stat-card-cover");
    expect(readComposerMode("", "/cover")).toBe("stat-card-cover");
    expect(readComposerMode("?composer=stat-card-cover", "/")).toBe(
      "stat-card-cover",
    );
    expect(composerHref("stat-card-cover")).toBe("/stat-card-cover");
    expect(readComposerMode("", "/mock-trade")).toBe("mock-trade");
    expect(readComposerMode("", "/trade-machine")).toBe("mock-trade");
    expect(readComposerMode("?composer=mock-trade", "/")).toBe("mock-trade");
    expect(composerHref("mock-trade")).toBe("/mock-trade");
    expect(readComposerMode("", "/plot")).toBe("plot");
    expect(readComposerMode("", "/scatter")).toBe("plot");
    expect(readComposerMode("?composer=plot", "/")).toBe("plot");
    expect(composerHref("plot")).toBe("/plot");
  });

  it("opens ranked lineups from path or query", () => {
    expect(readComposerMode("", "/ranked-lineups")).toBe("ranked-lineups");
    expect(readComposerMode("", "/lineups")).toBe("ranked-lineups");
    expect(readComposerMode("?composer=ranked-lineups", "/")).toBe(
      "ranked-lineups",
    );
    expect(composerHref("ranked-lineups")).toBe("/ranked-lineups");
  });

  it("lets the path win when query and path disagree", () => {
    expect(readComposerMode("?composer=tier", "/every-team")).toBe("every-team");
    expect(readComposerMode("?composer=every-team", "/tier-list")).toBe("tier");
    expect(readComposerMode("?composer=tier", "/player-of-the-day")).toBe(
      "player-of-the-day",
    );
    expect(readComposerMode("?composer=potd", "/team-of-the-week")).toBe(
      "team-of-the-week",
    );
  });
});
