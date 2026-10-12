import { describe, expect, it } from "vitest";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { parseLastGamePayload } from "./lastGame";
import { BANNER_FILL_BASE, BANNER_STUD_FILL } from "../standingsComposer/headerTexture";
import { stretchedLogoRect } from "../standingsComposer/logoDraw";
import { isPhotoChromeClassName } from "./PhotoFrame";
import * as potdLayout from "./playerOfTheDayLayout";
import { coverPanDraw, statsFillForTeam } from "./playerOfTheDayLayout";
import {
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
  DEFAULT_POTD_TITLE,
  applyPlayerPick,
  clampPan,
  createEmptyCards,
  exportPotdFilename,
  fillCardFromPlayer,
  setCardPhoto,
  splitPlayerName,
  splitPotdTitle,
  usedPlayerIds,
} from "./playerOfTheDayState";

describe("player of the day state", () => {
  it("keeps the Instagram 4:5 PNG size", () => {
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
  });

  it("splits names and the outlined title onto two lines", () => {
    expect(splitPlayerName("James Harden")).toEqual({
      firstName: "James",
      lastName: "Harden",
    });
    expect(splitPlayerName("Giannis Antetokounmpo")).toEqual({
      firstName: "Giannis",
      lastName: "Antetokounmpo",
    });
    const lines = splitPotdTitle(DEFAULT_POTD_TITLE);
    expect(lines).toHaveLength(2);
    expect(`${lines[0]} ${lines[1]}`).toBe(DEFAULT_POTD_TITLE);
    expect(exportPotdFilename(DEFAULT_POTD_TITLE)).toBe(
      "player-of-the-day.png",
    );
  });

  it("auto-fills headshot, team, stats, and result from the latest game", () => {
    const luka = getPlayer("3945274");
    expect(luka).toBeTruthy();
    const game = parseLastGamePayload({
      labels: ["FG", "3PT", "REB", "AST", "BLK", "STL", "TO", "PTS"],
      events: {
        e1: {
          id: "e1",
          gameDate: "2026-10-20T00:00:00.000Z",
          homeTeamId: "13",
          awayTeamId: "16",
          homeTeamScore: "128",
          awayTeamScore: "110",
          gameResult: "W",
          team: {
            id: "13",
            abbreviation: "LAL",
            displayName: "Los Angeles Lakers",
          },
          opponent: {
            abbreviation: "MIN",
            displayName: "Minnesota Timberwolves",
          },
        },
      },
      seasonTypes: [
        {
          displayName: "2026-27 Regular Season",
          categories: [
            {
              events: [
                {
                  eventId: "e1",
                  stats: ["12-20", "4-9", "8", "11", "1", "2", "3", "31"],
                },
              ],
            },
          ],
        },
      ],
    });
    const card = fillCardFromPlayer(luka!, game);
    expect(card.playerId).toBe("3945274");
    expect(card.teamId).toBe("LAL");
    expect(card.photoSrc).toBe(luka!.headshotUrl);
    expect(card.customPhoto).toBe(false);
    expect(card.pan).toEqual(DEFAULT_HEADSHOT_PAN);
    expect(card.stats.pts).toBe("31");
    expect(card.stats.reb).toBe("8");
    expect(card.stats.fg).toBe("12-20");
    expect(card.result).toBe("128-110 W VS MIN");
    expect(statsFillForTeam("LAL")).toMatch(/^#/);
    expect(statsFillForTeam("LAL")).not.toBe(statsFillForTeam("MIL"));
  });

  it("replaces a custom photo only after upload, and pans inside the frame", () => {
    const luka = getPlayer("3945274")!;
    const cards = applyPlayerPick(createEmptyCards(), 0, luka, null);
    expect(cards[0]!.customPhoto).toBe(false);
    const withPhoto = setCardPhoto(cards, 0, "data:image/png;base64,aaa");
    expect(withPhoto[0]!.customPhoto).toBe(true);
    expect(withPhoto[0]!.photoSrc).toBe("data:image/png;base64,aaa");
    expect(withPhoto[0]!.pan).toEqual(DEFAULT_CUSTOM_PAN);
    expect(clampPan({ x: -1, y: 2 })).toEqual({ x: 0, y: 1 });
    const drawn = coverPanDraw(2000, 1000, 0, 0, 520, 640, 1, 0.5);
    expect(drawn.dw).toBeGreaterThanOrEqual(520);
    expect(drawn.dh).toBeGreaterThanOrEqual(640);
    expect(drawn.dx).toBeLessThanOrEqual(0);
    expect(usedPlayerIds(withPhoto)["3945274"]).toBe("Left card");
  });

  it("clears a player if they are already on the other card", () => {
    const luka = getPlayer("3945274")!;
    const once = applyPlayerPick(createEmptyCards(), 0, luka, null);
    const twice = applyPlayerPick(once, 1, luka, null);
    expect(twice[0]!.playerId).toBeNull();
    expect(twice[1]!.playerId).toBe("3945274");
  });

  it("replacing a player overwrites that slot's name and photo", () => {
    const luka = getPlayer("3945274")!;
    const lebron = getPlayer("1966")!;
    const once = applyPlayerPick(createEmptyCards(), 0, luka, null);
    const custom = setCardPhoto(once, 0, "data:image/png;base64,aaa");
    const replaced = applyPlayerPick(custom, 0, lebron, null);
    expect(replaced[0]!.playerId).toBe("1966");
    expect(replaced[0]!.lastName).toBe("James");
    expect(replaced[0]!.photoSrc).toBe(lebron.headshotUrl);
    expect(replaced[0]!.customPhoto).toBe(false);
    expect(replaced[1]!.playerId).toBeNull();
  });

  it("uses the studded near-black title fill and no circled BA mark", () => {
    expect(BANNER_FILL_BASE.toLowerCase()).toBe("#1c1c1c");
    expect(BANNER_STUD_FILL.toLowerCase()).toBe("#2a2a2a");
    expect("POTD_BA_SRC" in potdLayout).toBe(false);
    expect("potdBadgeRect" in potdLayout).toBe(false);
    expect(stretchedLogoRect(0, 0, 520, 116)).toEqual({
      x: 0,
      y: 0,
      w: 520,
      h: 116,
    });
  });

  it("treats upload and change-player chrome as non-pan targets", () => {
    expect(isPhotoChromeClassName("pod-photo__tool")).toBe(true);
    expect(isPhotoChromeClassName("pod-photo__file")).toBe(true);
    expect(isPhotoChromeClassName("pod-photo__pick extra")).toBe(true);
    expect(isPhotoChromeClassName("pod-photo__img")).toBe(false);
  });
});
