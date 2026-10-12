import { describe, expect, it } from "vitest";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { parseLastGamePayload } from "./lastGame";
import {
  BANNER_FILL_BASE,
  BANNER_STUD_FILL,
  FIELD_TEXTURE_SRC,
} from "../standingsComposer/headerTexture";
import { coveredLogoRect } from "../standingsComposer/logoDraw";
import { isPhotoChromeClassName } from "./PhotoFrame";
import * as potdLayout from "./playerOfTheDayLayout";
import { coverPanDraw, statsFillForTeam } from "./playerOfTheDayLayout";
import {
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
  DEFAULT_PHOTO_ZOOM,
  DEFAULT_POTD_TITLE,
  MAX_PHOTO_ZOOM,
  applyPlayerPick,
  clampPan,
  clampZoom,
  createEmptyCards,
  exportPotdFilename,
  fillCardFromPlayer,
  photoRotate,
  photoZoom,
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
    expect(clampPan({ x: -1, y: 2 })).toEqual({
      x: 0,
      y: 1,
      zoom: DEFAULT_PHOTO_ZOOM,
      rotate: 0,
    });
    const drawn = coverPanDraw(2000, 1000, 0, 0, 520, 640, 1, 0.5);
    expect(drawn.dw).toBeGreaterThanOrEqual(520);
    expect(drawn.dh).toBeGreaterThanOrEqual(640);
    expect(drawn.dx).toBeLessThanOrEqual(0);
    const zoomed = coverPanDraw(2000, 1000, 0, 0, 520, 640, 0.5, 0.5, 2);
    expect(zoomed.dw).toBeCloseTo(drawn.dw * 2);
    expect(zoomed.dh).toBeCloseTo(drawn.dh * 2);
    expect(clampZoom(0.2)).toBe(1);
    expect(clampZoom(9)).toBe(MAX_PHOTO_ZOOM);
    expect(photoZoom({ x: 0.5, y: 0.5 })).toBe(DEFAULT_PHOTO_ZOOM);
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
    expect(FIELD_TEXTURE_SRC).toBe("/composer-background-texture.png");
    expect("POTD_CRACKS_SRC" in potdLayout).toBe(false);
    expect("POTD_BA_SRC" in potdLayout).toBe(false);
    expect("potdBadgeRect" in potdLayout).toBe(false);
    const covered = coveredLogoRect({ x: 0, y: 0, w: 500, h: 500 }, 0, 0, 520, 116);
    expect(covered.w / covered.h).toBeCloseTo(1);
    expect(covered.w).toBeGreaterThanOrEqual(520);
    expect(potdLayout.POTD_NAME_SIZE).toBe(36);
    expect(potdLayout.POTD_STAT_SIZE).toBe(38);
  });

  it("always frames the photo and centers larger stat pairs", () => {
    expect(potdLayout.POTD_PHOTO_BORDER).toBe(4);
    expect(potdLayout.potdPhotoBorderColor("classic")).toBe("#ffffff");
    expect(potdLayout.potdPhotoBorderColor("improve")).toBe("#0a0a0a");
    expect(potdLayout.potdPhotoBorderColor("improve")).not.toMatch(/d4|ec|ff.?f4/i);
    const left = potdLayout.potdStatCell(0, 520, 0, 236, 0);
    const right = potdLayout.potdStatCell(0, 520, 0, 236, 1);
    const nextRow = potdLayout.potdStatCell(0, 520, 0, 236, 2);
    expect(left.cx).toBeCloseTo(130);
    expect(right.cx).toBeCloseTo(390);
    expect(left.cy).toBeCloseTo(nextRow.cy - (236 * 0.8) / 4);
    expect(left.cy).toBeGreaterThan(20);
    expect(left.cy).toBeLessThan(80);
    expect(potdLayout.POTD_CARD_RADIUS).toBe(14);
    expect(potdLayout.POTD_CARD_RADIUS).toBeGreaterThan(8);
    expect(potdLayout.POTD_CARD_RADIUS).toBeLessThan(28);
  });

  it("treats upload and change-player chrome as non-pan targets", () => {
    expect(isPhotoChromeClassName("pod-photo__tool")).toBe(true);
    expect(isPhotoChromeClassName("pod-photo__file")).toBe(true);
    expect(isPhotoChromeClassName("pod-photo__pick extra")).toBe(true);
    expect(isPhotoChromeClassName("pod-photo__zoom")).toBe(true);
    expect(isPhotoChromeClassName("pod-photo__rotate")).toBe(true);
    expect(isPhotoChromeClassName("pod-photo__img")).toBe(false);
  });

  it("rotates custom photos in 90-degree steps and keeps rotate while panning", () => {
    expect(photoRotate({ x: 0.5, y: 0.5, rotate: 90 })).toBe(90);
    expect(photoRotate({ x: 0.5, y: 0.5, rotate: 360 })).toBe(0);
    expect(photoRotate({ x: 0.5, y: 0.5, rotate: -90 })).toBe(270);
    const panned = clampPan({
      x: 0.2,
      y: 0.3,
      zoom: 1.5,
      rotate: 90,
    });
    expect(panned.rotate).toBe(90);
    expect(panned.zoom).toBe(1.5);
  });
});
