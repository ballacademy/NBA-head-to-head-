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
  SCC_GUTTER,
  SCC_MAST_H,
  SCC_SLOT_COUNT,
  coverCellRect,
} from "./statCardCoverLayout";
import {
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
  it("is a 4:5 magazine grid with a masthead and four photo cells", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(SCC_SLOT_COUNT).toBe(4);
    const first = coverCellRect(0);
    const last = coverCellRect(3);
    expect(first).toEqual({
      x: 0,
      y: SCC_MAST_H,
      w: (GRAPHIC_WIDTH - SCC_GUTTER) / 2,
      h: (GRAPHIC_HEIGHT - SCC_MAST_H - SCC_GUTTER) / 2,
    });
    expect(coverCellRect(1).x).toBe(first.w + SCC_GUTTER);
    expect(last.y + last.h).toBe(GRAPHIC_HEIGHT);
    expect(last.x + last.w).toBe(GRAPHIC_WIDTH);
  });

  it("defaults to an empty cover with tonight’s auto title", () => {
    const draft = defaultStatCardCoverDraft(new Date("2026-10-15T18:00:00"));
    expect(draft.slots).toHaveLength(4);
    expect(draft.slots.every((slot) => slot.playerId === null)).toBe(true);
    expect(draft.slots.every((slot) => !("stats" in slot))).toBe(true);
    expect(draft.title).toBe("TONIGHT");
    expect(draft.dateLine).toBe("OCT 15");
    expect(draft.showBa).toBe(true);
  });

  it("titles tonight, last night, and a custom date", () => {
    expect(coverTitleForNight("2026-10-15", "2026-10-15", "2026-10-14")).toBe(
      "TONIGHT",
    );
    expect(coverTitleForNight("2026-10-14", "2026-10-15", "2026-10-14")).toBe(
      "LAST NIGHT",
    );
    expect(coverTitleForNight("2026-10-12", "2026-10-15", "2026-10-14")).toBe(
      "STANDOUTS",
    );
    expect(coverDateLine("2026-10-14")).toBe("OCT 14");
    expect(isAutoCoverTitle("last night")).toBe(true);
    expect(isAutoCoverTitle("My Cover")).toBe(false);
  });

  it("fills the first four ranked standouts and leaves leftover slots empty", () => {
    const jokic = getPlayer("3112335")!;
    const shai = getPlayer("4278073")!;
    const wemby = getPlayer("4684737")!;
    const ranked = [
      standout(wemby.id, 90),
      standout(jokic.id, 80),
      standout(shai.id, 70),
    ];
    const filled = fillCoverFromStandouts(defaultStatCardCoverDraft(), ranked);
    expect(filled.slots[0]!.playerId).toBe(wemby.id);
    expect(filled.slots[1]!.playerId).toBe(jokic.id);
    expect(filled.slots[2]!.playerId).toBe(shai.id);
    expect(filled.slots[3]!.playerId).toBeNull();
    expect(filled.slots[0]!.photoSrc).toBe(wemby.headshotUrl);
    expect(filled.slots[0]!.customPhoto).toBe(false);
    expect(filled.slots.every((slot) => !("stats" in slot))).toBe(true);
  });

  it("keeps a custom photo when the same player stays in the top four", () => {
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
  });

  it("only auto-updates the title when it is still a stock night label", () => {
    const auto = applyCoverNight(
      { ...defaultStatCardCoverDraft(), title: "TONIGHT", dateLine: "OCT 15", gameDate: "2026-10-15" },
      "2026-10-14",
      "2026-10-15",
      "2026-10-14",
    );
    expect(auto.title).toBe("LAST NIGHT");
    expect(auto.dateLine).toBe("OCT 14");
    const custom = applyCoverNight(
      { ...defaultStatCardCoverDraft(), title: "HEAT CHECK", dateLine: "LOCK-IN", gameDate: "2026-10-15" },
      "2026-10-14",
      "2026-10-15",
      "2026-10-14",
    );
    expect(custom.title).toBe("HEAT CHECK");
    expect(custom.dateLine).toBe("LOCK-IN");
    expect(custom.gameDate).toBe("2026-10-14");
  });

  it("pads to four slots and does not carry stats onto the cover", () => {
    const draft = normalizeStatCardCoverDraft({
      ...defaultStatCardCoverDraft(),
      slots: [fillCoverSlotFromPlayer(getPlayer("3112335")!)],
    });
    expect(draft.slots).toHaveLength(4);
    expect(draft.slots[0]!.lastName.toUpperCase()).toContain("JOKIC");
    expect(JSON.stringify(draft.slots[0])).not.toMatch(/"pts"|"reb"|"ast"/);
  });
});
