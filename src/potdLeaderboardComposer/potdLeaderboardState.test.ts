import { describe, expect, it } from "vitest";
import {
  BANNER_FILL_BASE,
  BANNER_STUD_FILL,
} from "../standingsComposer/headerTexture";
import { EXPORT_HEIGHT, EXPORT_WIDTH, GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import {
  PLB_INK,
  PLB_PIP_SIZE,
  PLB_PIP_W,
  PLB_RANK_W,
  PLB_ROW_H,
  PLB_TITLE_H,
  PLB_TITLE_PAD,
  PLB_TITLE_SIZE,
  leaderboardBlankCount,
} from "./potdLeaderboardLayout";
import { applyPlayerPick, createEmptyCards } from "../playerOfTheDayComposer/playerOfTheDayState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  createLeaderboardEntry,
  defaultLeaderboardDraft,
  fitLeaderboardName,
  formatWinsLabel,
  isPotdPairName,
  medalForRank,
  parseWinsInput,
  rankLeaderboard,
  readLeaderboardDraft,
  splitLeaderboardName,
  teamForLeaderboardName,
  winsForName,
  writeLeaderboardDraft,
} from "./potdLeaderboardState";

const entry = (name: string, wins: number) => {
  const row = createLeaderboardEntry(name, wins);
  return row;
};

describe("POTD leaderboard ranks", () => {
  it("keeps the Instagram 4:5 PNG size", () => {
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
  });

  it("uses the Player of the Day title-box studded fill on both boxes", () => {
    expect(BANNER_FILL_BASE.toLowerCase()).toBe("#1c1c1c");
    expect(BANNER_STUD_FILL.toLowerCase()).toBe("#2a2a2a");
    expect(PLB_INK.toLowerCase()).toBe("#050505");
  });

  it("keeps leaderboard title type inside the plate with padding", () => {
    expect(PLB_TITLE_H).toBe(100);
    expect(PLB_TITLE_SIZE).toBe(54);
    expect(PLB_TITLE_PAD).toBe(14);
    expect(PLB_TITLE_SIZE + 5 + 8 + PLB_TITLE_PAD * 2).toBeLessThanOrEqual(
      PLB_TITLE_H,
    );
  });

  it("computes competition ranks and T labels from win totals", () => {
    const ranked = rankLeaderboard([
      entry("Luka Doncic", 12),
      entry("Giannis Antetokounmpo", 12),
      entry("Nikola Jokic", 11),
      entry("Joel Embiid", 10),
      entry("Damian Lillard", 7),
      entry("Shai Gilgeous-Alexander", 7),
      entry("Stephen Curry", 6),
      entry("Anthony Davis", 6),
      entry("Jayson Tatum", 6),
      entry("LeBron James", 5),
      entry("Kevin Durant", 4),
      entry("DeMar DeRozan", 4),
      entry("Donovan Mitchell", 3),
    ]);
    expect(ranked.map((row) => row.rankLabel)).toEqual([
      "T1.",
      "T1.",
      "3.",
      "4.",
      "T5.",
      "T5.",
      "T7.",
      "T7.",
      "T7.",
      "10.",
      "T11.",
      "T11.",
      "13.",
    ]);
    expect(ranked[0]!.winsLabel).toBe("(12)");
    expect(ranked.map((row) => row.rank)).not.toContain(2);
    expect(ranked.every((row) => !row.name.toUpperCase().startsWith("T1"))).toBe(
      true,
    );
    expect(medalForRank(1)).toBe("gold");
    expect(medalForRank(2)).toBe("silver");
    expect(medalForRank(3)).toBe("bronze");
    expect(medalForRank(4)).toBeNull();
    expect(medalForRank(ranked[0]!.rank)).toBe("gold");
    expect(medalForRank(ranked[2]!.rank)).toBe("bronze");
  });

  it("wraps long names onto two lines instead of GILGEOUS-AL.", () => {
    expect(splitLeaderboardName("Shai Gilgeous-Alexander")).toEqual([
      "SHAI",
      "GILGEOUS-ALEXANDER",
    ]);
    const shai = fitLeaderboardName("Shai Gilgeous-Alexander");
    expect(shai.lines.join(" ")).toContain("GILGEOUS-ALEXANDER");
    expect(shai.lines.join(" ")).not.toContain("GILGEOUS-AL.");
    expect(shai.lines.length).toBe(2);
    const giannis = fitLeaderboardName("Giannis Antetokounmpo");
    expect(giannis.lines).toEqual(["GIANNIS", "ANTETOKOUNMPO"]);
    expect(fitLeaderboardName("Luka Doncic").lines).toEqual(["LUKA DONCIC"]);
    const ranked = rankLeaderboard([entry("Shai Gilgeous-Alexander", 7)]);
    expect(ranked[0]!.displayLines[1]).toBe("GILGEOUS-ALEXANDER");
    expect(ranked[0]!.teamId).toBe("OKC");
    expect(ranked[0]!.headshotUrl).toContain("4278073");
    expect(teamForLeaderboardName("Luka Doncic")).toBe("LAL");
    expect(isPotdPairName("Luka Doncic", ["LUKA DONCIC"])).toBe(true);
    expect(isPotdPairName("LeBron James", ["LUKA DONCIC"])).toBe(false);
  });

  it("keeps real names and at most two blank hairlines, never a dummy spreadsheet", () => {
    const five = rankLeaderboard([
      entry("Luka Doncic", 12),
      entry("Nikola Jokic", 11),
      entry("Joel Embiid", 10),
      entry("Stephen Curry", 6),
      entry("LeBron James", 5),
    ]);
    const blanks = leaderboardBlankCount(five);
    expect(blanks).toBeGreaterThanOrEqual(0);
    expect(blanks).toBeLessThanOrEqual(2);
    expect(PLB_ROW_H).toBe(52);
    expect(five.length + blanks).toBeLessThanOrEqual(7);
    expect(leaderboardBlankCount([])).toBe(2);
    expect(leaderboardBlankCount([])).toBeLessThanOrEqual(2);
  });

  it("defaults team pips on and stores the toggle", () => {
    expect(defaultLeaderboardDraft().showPips).toBe(true);
    expect(PLB_PIP_SIZE).toBeLessThanOrEqual(PLB_PIP_W);
    expect(PLB_PIP_W).toBeLessThan(PLB_RANK_W);
    expect(PLB_PIP_W).toBeLessThan(GRAPHIC_WIDTH / 10);
  });

  it("looks up win totals for Player of the Day by name", () => {
    const entries = [entry("James Harden", 9), entry("Giannis Antetokounmpo", 12)];
    expect(winsForName("James Harden", entries)).toBe(9);
    expect(winsForName("james  harden", entries)).toBe(9);
    expect(winsForName("Giannis Antetokounmpo", entries)).toBe(12);
    expect(winsForName("LeBron James", entries)).toBe(0);
    expect(parseWinsInput("(12)")).toBe(12);
    expect(formatWinsLabel(7)).toBe("(7)");
  });

  it("fills POTD TOTAL from a passed leaderboard count", () => {
    const luka = getPlayer("3945274");
    expect(luka).toBeTruthy();
    const cards = applyPlayerPick(createEmptyCards(), 0, luka!, null, "12");
    expect(cards[0]!.total).toBe("12");
    expect(cards[0]!.lastName).toBe("Doncic");
    expect(cards[1]!.total).toBe("0");
  });

  it("saves a leaderboard draft including the BA mark", () => {
    const memory: Record<string, string> = {};
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => memory[key] ?? null,
        setItem: (key: string, value: string) => {
          memory[key] = value;
        },
        removeItem: (key: string) => {
          delete memory[key];
        },
      },
    });
    const draft = defaultLeaderboardDraft();
    writeLeaderboardDraft({
      ...draft,
      entries: [entry("Luka Doncic", 12)],
      showBa: true,
      showPips: false,
    });
    const stored = readLeaderboardDraft();
    expect(stored.entries[0]!.name).toBe("Luka Doncic");
    expect(stored.entries[0]!.wins).toBe(12);
    expect(stored.showBa).toBe(true);
    expect(stored.showPips).toBe(false);
  });
});
