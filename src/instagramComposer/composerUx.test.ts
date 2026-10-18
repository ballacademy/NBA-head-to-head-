import { describe, expect, it } from "vitest";
import { EXAMPLE_PLAYER_IDS, searchPlayers } from "../tierListComposer/nbaActivePlayers";
import {
  COMPOSER_NAME_STYLE_EVENT,
  composerNameLines,
  formatComposerName,
  formatComposerPersonName,
  parseComposerNameStyle,
} from "./composerNameStyle";
import {
  parseComposerRecents,
  COMPOSER_RECENTS_MAX,
} from "./composerRecents";
import { composerShowsStamp, parseComposerStamp } from "./composerStamp";
import { squareFilename } from "./exportPack";
import { playerNicknameHaystack } from "./playerNicknames";

describe("composer UX extras", () => {
  it("formats last-only, full, and first-initial names", () => {
    expect(parseComposerNameStyle("last")).toBe("last");
    expect(formatComposerName("Anthony", "Edwards", "last")).toBe("Edwards");
    expect(formatComposerName("Anthony", "Edwards", "full")).toBe(
      "Anthony Edwards",
    );
    expect(formatComposerName("Anthony", "Edwards", "initial")).toBe("A. Edwards");
    expect(composerNameLines("Anthony", "Edwards", "last")).toEqual({
      given: "",
      family: "Edwards",
    });
    expect(composerNameLines("Anthony", "Edwards", "full")).toEqual({
      given: "Anthony",
      family: "Edwards",
    });
    expect(composerNameLines("Anthony", "Edwards", "initial")).toEqual({
      given: "A.",
      family: "Edwards",
    });
    expect(formatComposerPersonName("Nikola Jokic", "initial")).toBe("N. Jokic");
    expect(COMPOSER_NAME_STYLE_EVENT).toBe("ddgm:composer-name-style");
  });

  it("keeps the last five exported graphics", () => {
    const parsed = parseComposerRecents([
      { mode: "compare", title: "Split", at: 3 },
      { mode: "headline", title: "News", at: 2 },
      { mode: "standings", title: "East", at: 1 },
      { mode: "bogus", title: "nope", at: 0 },
    ]);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]?.mode).toBe("compare");
    expect(COMPOSER_RECENTS_MAX).toBe(5);
    expect(squareFilename("compare.png")).toBe("compare-square.png");
  });

  it("stamps ranking and news graphics only", () => {
    expect(composerShowsStamp("standings")).toBe(true);
    expect(composerShowsStamp("headline")).toBe(true);
    expect(composerShowsStamp("stat-card")).toBe(false);
    expect(parseComposerStamp({ on: true, text: "oct 16" }).text).toBe("OCT 16");
  });

  it("finds Ant, Wemby, and Bron from nicknames", () => {
    const ant = searchPlayers("ant").find(
      (player) => player.id === EXAMPLE_PLAYER_IDS.ant,
    );
    expect(ant?.name).toMatch(/Edwards/i);
    const wemby = searchPlayers("wemby");
    expect(wemby.some((player) => player.id === EXAMPLE_PLAYER_IDS.wemby)).toBe(
      true,
    );
    const bron = searchPlayers("bron");
    expect(bron.some((player) => player.id === EXAMPLE_PLAYER_IDS.lebron)).toBe(
      true,
    );
    expect(
      playerNicknameHaystack({
        id: EXAMPLE_PLAYER_IDS.wemby,
        name: "Victor Wembanyama",
        team: "SAS",
      }),
    ).toContain("wemby");
  });
});
