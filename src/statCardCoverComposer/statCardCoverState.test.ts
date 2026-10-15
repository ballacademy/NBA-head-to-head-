import { describe, expect, it } from "vitest";
import catalog from "../../data/every-team-historical-rosters.json";
import { hydrateEveryTeamRosters } from "../everyTeamComposer/historicalRosters";
import { emptyStats, type LastGame } from "../playerOfTheDayComposer/lastGame";
import type { NightStandout } from "../playerOfTheDayComposer/nightStandouts";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  SCC_COL_W,
  SCC_GOLD,
  SCC_GOLD_DEEP,
  SCC_SLOT_COUNT,
  coverCellRect,
  coverSeamXs,
} from "./statCardCoverLayout";
import {
  DEFAULT_COVER_TITLE,
  applyCoverNight,
  coverDateLine,
  coverTitleForNight,
  defaultStatCardCoverDraft,
  fillCoverFromStandouts,
  fillCoverSlotFromPlayer,
  hasCustomPhoto,
  isAutoCoverTitle,
  normalizeStatCardCoverDraft,
  setCoverSlotPhoto,
  splitCoverTitle,
} from "./statCardCoverState";

hydrateEveryTeamRosters(
  catalog as unknown as Parameters<typeof hydrateEveryTeamRosters>[0],
);

const game = (teamId: string): LastGame => ({
  eventId: "1",
  gameDate: "2026-10-14",
  teamId,
  opponentId: "NYK",
  opponentAbbrev: "NYK",
  result: "W",
  playerScore: "120",
  opponentScore: "110",
  home: true,
  resultLine: "W",
  dateLabel: "10/14",
  stats: emptyStats(),
});

const standout = (athleteId: string, score: number): NightStandout => {
  const player = getPlayer(athleteId)!;
  return {
    athleteId,
    name: player.name,
    teamId: player.team,
    badge: `${score} PTS`,
    flags: ["pts"],
    line: `${score} PTS`,
    score,
    game: game(player.team),
  };
};

describe("stat card cover", () => {
  it("is a 4:5 full-bleed row of three even portraits", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(SCC_SLOT_COUNT).toBe(3);
    expect(SCC_COL_W).toBe(400);
    expect(coverCellRect(0)).toEqual({
      x: 0,
      y: 0,
      w: 400,
      h: GRAPHIC_HEIGHT,
    });
    expect(coverCellRect(1)).toEqual({
      x: 400,
      y: 0,
      w: 400,
      h: GRAPHIC_HEIGHT,
    });
    expect(coverCellRect(2)).toEqual({
      x: 800,
      y: 0,
      w: 400,
      h: GRAPHIC_HEIGHT,
    });
    expect(coverCellRect(2).x + coverCellRect(2).w).toBe(GRAPHIC_WIDTH);
    expect(coverSeamXs()).toEqual([400, 800]);
    expect(SCC_GOLD.toLowerCase()).toBe("#facc15");
    expect(SCC_GOLD_DEEP.toLowerCase()).toBe("#d4af37");
  });

  it("defaults to a two-line STARS AND / STANDOUTS lockup with a date pill", () => {
    const draft = defaultStatCardCoverDraft(new Date("2026-10-15T18:00:00"));
    expect(draft.slots).toHaveLength(3);
    expect(draft.slots.every((slot) => slot.playerId === null)).toBe(true);
    expect(draft.slots.every((slot) => !("stats" in slot))).toBe(true);
    expect(draft.title).toBe(DEFAULT_COVER_TITLE);
    expect(splitCoverTitle(draft.title)).toEqual(["STARS AND", "STANDOUTS"]);
    expect(draft.dateLine).toBe("OCT 15");
    expect(coverTitleForNight("2026-10-14", "2026-10-15", "2026-10-14")).toBe(
      DEFAULT_COVER_TITLE,
    );
    expect(draft.showBa).toBe(true);
  });

  it("keeps STARS AND STANDOUTS when the night changes and only updates the pill", () => {
    expect(coverDateLine("2026-10-14")).toBe("OCT 14");
    expect(isAutoCoverTitle("last night")).toBe(true);
    expect(isAutoCoverTitle(DEFAULT_COVER_TITLE)).toBe(true);
    expect(isAutoCoverTitle("My Cover")).toBe(false);
    const auto = applyCoverNight(
      {
        ...defaultStatCardCoverDraft(),
        title: "TONIGHT",
        dateLine: "OCT 15",
        gameDate: "2026-10-15",
      },
      "2026-10-14",
      "2026-10-15",
      "2026-10-14",
    );
    expect(auto.title).toBe(DEFAULT_COVER_TITLE);
    expect(auto.dateLine).toBe("OCT 14");
    const custom = applyCoverNight(
      {
        ...defaultStatCardCoverDraft(),
        title: "HEAT CHECK",
        dateLine: "LOCK-IN",
        gameDate: "2026-10-15",
      },
      "2026-10-14",
      "2026-10-15",
      "2026-10-14",
    );
    expect(custom.title).toBe("HEAT CHECK");
    expect(custom.dateLine).toBe("LOCK-IN");
    expect(custom.gameDate).toBe("2026-10-14");
  });

  it("fills the first three ranked standouts and leaves leftover slots empty", () => {
    const jokic = getPlayer("3112335")!;
    const shai = getPlayer("4278073")!;
    const wemby = getPlayer("4684737")!;
    const ranked = [
      standout(wemby.id, 90),
      standout(jokic.id, 80),
      standout(shai.id, 70),
      standout("3975", 60),
    ];
    const filled = fillCoverFromStandouts(defaultStatCardCoverDraft(), ranked);
    expect(filled.slots).toHaveLength(3);
    expect(filled.slots[0]!.playerId).toBe(wemby.id);
    expect(filled.slots[1]!.playerId).toBe(jokic.id);
    expect(filled.slots[2]!.playerId).toBe(shai.id);
    expect(filled.slots[0]!.photoSrc).toBe(wemby.headshotUrl);
    expect(filled.slots[0]!.customPhoto).toBe(false);
    expect(filled.slots.every((slot) => !("stats" in slot))).toBe(true);
    expect(filled.title).toBe(DEFAULT_COVER_TITLE);
    const short = fillCoverFromStandouts(defaultStatCardCoverDraft(), [
      standout(jokic.id, 80),
      standout(shai.id, 70),
    ]);
    expect(short.slots[0]!.playerId).toBe(jokic.id);
    expect(short.slots[1]!.playerId).toBe(shai.id);
    expect(short.slots[2]!.playerId).toBeNull();
  });

  it("keeps a custom photo when the same player stays in the top three", () => {
    const jokic = getPlayer("3112335")!;
    const shai = getPlayer("4278073")!;
    const withPhoto = {
      ...defaultStatCardCoverDraft(),
      slots: [
        setCoverSlotPhoto(fillCoverSlotFromPlayer(jokic), "data:image/png;base64,aaa"),
        fillCoverSlotFromPlayer(shai),
        ...defaultStatCardCoverDraft().slots.slice(2),
      ],
    };
    expect(hasCustomPhoto(withPhoto.slots[0]!)).toBe(true);
    const next = fillCoverFromStandouts(withPhoto, [
      standout(shai.id, 90),
      standout(jokic.id, 80),
    ]);
    expect(next.slots[0]!.playerId).toBe(shai.id);
    expect(next.slots[0]!.customPhoto).toBe(false);
    expect(next.slots[1]!.playerId).toBe(jokic.id);
    expect(next.slots[1]!.photoSrc).toBe("data:image/png;base64,aaa");
    expect(next.slots[1]!.customPhoto).toBe(true);
    expect(next.slots[2]!.playerId).toBeNull();
  });

  it("migrates stored LAST NIGHT titles to STARS AND STANDOUTS and drops a fourth slot", () => {
    const draft = normalizeStatCardCoverDraft({
      ...defaultStatCardCoverDraft(),
      title: "LAST NIGHT",
      slots: [
        fillCoverSlotFromPlayer(getPlayer("3112335")!),
        fillCoverSlotFromPlayer(getPlayer("4278073")!),
        fillCoverSlotFromPlayer(getPlayer("4684737")!),
        fillCoverSlotFromPlayer(getPlayer("3975")!),
      ],
    });
    expect(draft.title).toBe(DEFAULT_COVER_TITLE);
    expect(draft.slots).toHaveLength(3);
    expect(draft.slots[0]!.lastName.toUpperCase()).toContain("JOKIC");
    expect(JSON.stringify(draft.slots[0])).not.toMatch(/"pts"|"reb"|"ast"/);
  });
});
