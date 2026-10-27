import { describe, expect, it } from "vitest";
import type { NightStandout } from "../playerOfTheDayComposer/nightStandouts";
import {
  DEFAULT_TAKEAWAYS_TITLE,
  applyTakeawaysRange,
  defaultTakeawaysDraft,
  emptyTakeawaysCard,
  fillTakeawaysNames,
  landCarriedTakeawaysPlayer,
  nbaTakeawaysWeekNumber,
  normalizeTakeawaysDraft,
  parseTakeawaysCoverFaces,
  parseTakeawaysWell,
  setTakeawaysCardCount,
  setTakeawaysCardPlayer,
  splitTakeawaysTitle,
  takeawaysCaptionLines,
  takeawaysCoverCards,
  takeawaysCoverViewCards,
  takeawaysRangeLine,
  takeawaysWeekOf,
  takeawaysWeekPill,
  takeawaysWeekX,
  visibleTakeawaysCards,
} from "./takeawaysState";

const player = {
  id: "3975",
  name: "Stephen Curry",
  team: "GSW",
  headshotUrl: "https://example.com/curry.png",
};

const row = (id: string, name: string): NightStandout => ({
  athleteId: id,
  name,
  teamId: "GSW",
  badge: "",
  flags: [],
  line: "30 PTS",
  score: 10,
  games: 3,
  final: true,
  game: {
    eventId: "1",
    gameDate: "2026-10-24",
    teamId: "GSW",
    opponentId: "PHX",
    opponentAbbrev: "PHX",
    result: "W",
    playerScore: "30",
    opponentScore: "20",
    resultLine: "W 120-110",
    dateLabel: "OCT 24",
    stats: {
      pts: "30",
      reb: "4",
      ast: "6",
      stl: "1",
      blk: "0",
      fg: "10-20",
      three: "4-9",
      tov: "2",
      min: "34",
    },
  },
});

describe("takeaways state", () => {
  it("defaults NBA TAKEAWAYS as a two-line gold lockup with WEEK X", () => {
    const draft = defaultTakeawaysDraft(new Date("2026-10-26T16:00:00-04:00"));
    expect(draft.title).toBe(DEFAULT_TAKEAWAYS_TITLE);
    expect(splitTakeawaysTitle(draft.title, "lockup")).toEqual([
      "NBA",
      "TAKEAWAYS",
    ]);
    expect(splitTakeawaysTitle(draft.title, "plate")).toEqual(["NBA TAKEAWAYS"]);
    expect(draft.coverFaces).toBe(3);
    expect(draft.cards).toHaveLength(5);
    expect(draft.well).toBe("fade");
    expect(draft.showFactChip).toBe(false);
    expect(draft.cards.every((card) => !card.line1 && !card.line2)).toBe(true);
    expect(nbaTakeawaysWeekNumber("2026-10-24")).toBe(1);
    expect(nbaTakeawaysWeekNumber("2026-10-26")).toBe(2);
    expect(takeawaysWeekX("2026-10-26")).toBe("WEEK 2");
    expect(takeawaysWeekOf("2026-10-20", "2026-10-26")).toMatch(/WEEK OF/);
    expect(takeawaysRangeLine("2026-10-20", "2026-10-26")).toBe("OCT 20–26");
    expect(takeawaysWeekPill(draft)).toMatch(/^WEEK /);
  });

  it("keeps conflicting options as explicit HUD values", () => {
    expect(parseTakeawaysCoverFaces(0)).toBe(0);
    expect(parseTakeawaysCoverFaces(4)).toBe(4);
    expect(parseTakeawaysCoverFaces(3)).toBe(3);
    expect(parseTakeawaysWell("metal")).toBe("metal");
    expect(parseTakeawaysWell("charcoal")).toBe("charcoal");
    expect(parseTakeawaysWell("team")).toBe("team");
    expect(parseTakeawaysWell("overlay")).toBe("overlay");
    expect(parseTakeawaysWell("fade")).toBe("fade");
    const four = normalizeTakeawaysDraft({
      ...defaultTakeawaysDraft(),
      coverFaces: 4,
    });
    expect(takeawaysCoverCards(four)).toHaveLength(4);
    expect(takeawaysCoverCards({ ...four, coverFaces: 0 })).toHaveLength(0);
  });

  it("hides empty cover portraits on export and lands carry into the next empty card", () => {
    const withName = normalizeTakeawaysDraft({
      ...defaultTakeawaysDraft(),
      cards: [
        {
          ...emptyTakeawaysCard(),
          playerId: "3975",
          firstName: "Stephen",
          lastName: "Curry",
        },
        ...defaultTakeawaysDraft().cards.slice(1),
      ],
    });
    expect(takeawaysCoverViewCards(withName, false)).toHaveLength(3);
    expect(takeawaysCoverViewCards(withName, true)).toHaveLength(1);
    const landed = landCarriedTakeawaysPlayer(defaultTakeawaysDraft(), "3975");
    expect(landed.cards[0]?.playerId).toBe("3975");
    expect(landed.cards[0]?.line1).toBe("");
    expect(landCarriedTakeawaysPlayer(withName, "3975").cards[0]?.playerId).toBe(
      "3975",
    );
  });

  it("fills TOTW names only and never invents takeaway copy", () => {
    const draft = setTakeawaysCardPlayer(
      defaultTakeawaysDraft().cards,
      0,
      player,
    );
    expect(draft[0]?.playerId).toBe("3975");
    expect(draft[0]?.line1).toBe("");
    const withCopy = draft.map((card, index) =>
      index === 0 ? { ...card, line1: "Keep this" } : card,
    );
    const filled = fillTakeawaysNames(
      { ...defaultTakeawaysDraft(), cards: withCopy },
      [
        row("3975", "Stephen Curry"),
        row("1966", "LeBron James"),
        row("3032977", "Giannis Antetokounmpo"),
        row("4066648", "Jayson Tatum"),
        row("4277905", "Luka Doncic"),
      ],
    );
    expect(filled.cards[0]?.line1).toBe("Keep this");
    expect(filled.cards.every((card) => card.line1 !== "30 PTS")).toBe(true);
  });

  it("hides empty cards on export and builds a caption without invented lines", () => {
    const draft = normalizeTakeawaysDraft({
      ...defaultTakeawaysDraft(),
      cards: [
        {
          ...defaultTakeawaysDraft().cards[0]!,
          playerId: "3975",
          firstName: "Stephen",
          lastName: "Curry",
          line1: "Still the pull-up king",
        },
        ...defaultTakeawaysDraft().cards.slice(1),
      ],
    });
    expect(visibleTakeawaysCards(draft.cards, false)).toHaveLength(5);
    expect(visibleTakeawaysCards(draft.cards, true)).toHaveLength(1);
    const caption = takeawaysCaptionLines(draft);
    expect(caption[0]).toBe("NBA TAKEAWAYS");
    expect(caption.some((line) => line.includes("Still the pull-up king"))).toBe(
      true,
    );
    expect(caption.join(" ")).not.toContain("30 PTS");
  });

  it("clamps 3–8 cards and follows the shared week range", () => {
    const six = setTakeawaysCardCount(defaultTakeawaysDraft(), 6);
    expect(six.cards).toHaveLength(6);
    expect(setTakeawaysCardCount(six, 2).cards).toHaveLength(3);
    expect(setTakeawaysCardCount(six, 20).cards).toHaveLength(8);
    const ranged = applyTakeawaysRange(six, "2026-10-20", "2026-10-26");
    expect(ranged.from).toBe("2026-10-20");
    expect(ranged.weekLine).toMatch(/^WEEK /);
  });
});
