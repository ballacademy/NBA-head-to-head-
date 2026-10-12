import { describe, expect, it } from "vitest";
import {
  BANNER_FILL_BASE,
  BANNER_STUD_FILL,
} from "../standingsComposer/headerTexture";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import {
  PLB_INK,
  PLB_TITLE_H,
  PLB_TITLE_PAD,
  PLB_TITLE_SIZE,
} from "./potdLeaderboardLayout";
import { applyPlayerPick, createEmptyCards } from "../playerOfTheDayComposer/playerOfTheDayState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  createLeaderboardEntry,
  defaultLeaderboardDraft,
  formatWinsLabel,
  parseWinsInput,
  rankLeaderboard,
  readLeaderboardDraft,
  truncateLeaderboardName,
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
  });

  it("truncates long names with a period like the example", () => {
    expect(truncateLeaderboardName("Giannis Antetokounmpo")).toBe(
      "GIANNIS ANTETOKO.",
    );
    expect(truncateLeaderboardName("Shai Gilgeous-Alexander")).toBe(
      "SHAI GILGEOUS-AL.",
    );
    expect(truncateLeaderboardName("Luka Doncic")).toBe("LUKA DONCIC");
    expect(truncateLeaderboardName("Nikola Jokic")).toBe("NIKOLA JOKIC");
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
    });
    const stored = readLeaderboardDraft();
    expect(stored.entries[0]!.name).toBe("Luka Doncic");
    expect(stored.entries[0]!.wins).toBe(12);
    expect(stored.showBa).toBe(true);
  });
});
