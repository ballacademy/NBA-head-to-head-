import { describe, expect, it, vi } from "vitest";
import { players } from "./playerPool";
import { ACHIEVEMENT_CHECKS } from "./achievementChecks";
import {
  ACHIEVEMENTS,
  checkLineupAchievements,
  getAchievementProgress,
  loadAchievementState,
  unlockAchievements,
} from "./achievements";
import { isSuperstarTierPlayer } from "./starPedigree";
import { getSuperScrubPlayerIds } from "./playerTiers";
import { getLineupSalaryTotal, BUDGET_BADGE_SALARY_MAX } from "./salaryCap";
import { playersById } from "./playerPool";

describe("achievements", () => {
  it("defines 46 unique badges", () => {
    expect(ACHIEVEMENTS).toHaveLength(46);
    expect(ACHIEVEMENT_CHECKS).toHaveLength(46);
    expect(new Set(ACHIEVEMENTS.map((achievement) => achievement.id)).size).toBe(
      46,
    );
  });

  it("detects nepotism when Bronny and Thanasis are drafted together", () => {
    const bronny = players.find((player) => player.bbrPlayerId === "jamesbr02");
    const thanasis = players.find((player) => player.bbrPlayerId === "antetth01");
    const fillers = players
      .filter(
        (player) =>
          player.bbrPlayerId !== "jamesbr02" && player.bbrPlayerId !== "antetth01",
      )
      .slice(0, 3);

    expect(bronny).toBeDefined();
    expect(thanasis).toBeDefined();

    const lineup = [bronny!, thanasis!, ...fillers];
    expect(checkLineupAchievements(lineup)).toContain("nepotism");
  });

  it("detects brick city for low three-point shooting", () => {
    const lowShooting = [...players]
      .sort((left, right) => left.threePoint - right.threePoint)
      .slice(0, 5);

    expect(checkLineupAchievements(lowShooting)).toContain("brick-city");
  });

  it("detects brick city for all sub-32% shooters", () => {
    const midrangeMuseum = players
      .filter((player) => player.threePoint < 0.32)
      .slice(0, 5);

    expect(midrangeMuseum).toHaveLength(5);
    expect(checkLineupAchievements(midrangeMuseum)).toContain("brick-city");
  });

  it("detects oops all forwards lineups", () => {
    const forwards = players
      .filter((player) => player.position === "SF" || player.position === "PF")
      .slice(0, 5);

    expect(forwards.length).toBe(5);
    expect(checkLineupAchievements(forwards)).toContain("oops-all-forwards");
  });

  it("masks locked badge details", () => {
    const progress = getAchievementProgress({ unlocked: [] });
    const locked = progress.achievements[0];

    expect(locked?.title).toBe("????");
    expect(locked?.description).toBe("????");
    expect(locked?.emoji).toBe("❓");
  });

  it("detects family ties when brother chemistry is active", () => {
    const steph = players.find((player) => player.bbrPlayerId === "curryst01");
    const seth = players.find((player) => player.bbrPlayerId === "curryse01");
    const fillers = players
      .filter(
        (player) =>
          player.bbrPlayerId !== "curryst01" && player.bbrPlayerId !== "curryse01",
      )
      .slice(0, 3);

    const lineup = [steph!, seth!, ...fillers];
    expect(checkLineupAchievements(lineup)).toContain("family-ties");
    expect(checkLineupAchievements(lineup)).not.toContain("curry-kitchen");
  });

  it("detects college roommates when college chemistry is active", () => {
    const brunson = players.find((player) => player.bbrPlayerId === "brunsja01");
    const hart = players.find((player) => player.bbrPlayerId === "hartjo01");
    const fillers = players
      .filter(
        (player) =>
          !["brunsja01", "hartjo01"].includes(player.bbrPlayerId ?? ""),
      )
      .slice(0, 3);

    const lineup = [brunson!, hart!, ...fillers];
    expect(checkLineupAchievements(lineup)).toContain("college-roommates");
  });

  it("detects superstar core with three superstars", () => {
    const superstars = players.filter((player) => isSuperstarTierPlayer(player)).slice(0, 3);
    const fillers = players
      .filter((player) => !isSuperstarTierPlayer(player))
      .slice(0, 2);

    if (superstars.length < 3) {
      return;
    }

    const lineup = [...superstars, ...fillers];
    expect(checkLineupAchievements(lineup)).toContain("five-superstars");
  });

  it("only returns known badge ids", () => {
    const lineup = players.slice(0, 5);
    const earned = checkLineupAchievements(lineup);

    expect(earned.every((id) => ACHIEVEMENTS.some((badge) => badge.id === id))).toBe(
      true,
    );
  });

  it("detects ballin on a budget for salary-cap rosters under $50M", () => {
    const lineup = getSuperScrubPlayerIds()
      .slice(0, 5)
      .map((id) => playersById.get(id))
      .filter((player): player is NonNullable<typeof player> => Boolean(player));

    expect(lineup).toHaveLength(5);
    expect(getLineupSalaryTotal(lineup)).toBeLessThan(BUDGET_BADGE_SALARY_MAX);
    expect(checkLineupAchievements(lineup, { hasSalaryCap: true })).toContain(
      "ballin-on-budget",
    );
    expect(checkLineupAchievements(lineup)).not.toContain("ballin-on-budget");
  });

  it("persists newly unlocked achievements", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      clear: () => storage.clear(),
    });

    const { newlyUnlocked, state } = unlockAchievements(["nepotism"], {
      unlocked: [],
    });

    expect(newlyUnlocked).toEqual(["nepotism"]);
    expect(state.unlocked).toContain("nepotism");

    vi.unstubAllGlobals();
  });

  it("reports achievement progress", () => {
    const progress = getAchievementProgress({ unlocked: ["nepotism"] });

    expect(progress.unlocked).toBe(1);
    expect(progress.total).toBe(46);
    expect(
      progress.achievements.find((achievement) => achievement.id === "nepotism")
        ?.isUnlocked,
    ).toBe(true);
  });

  it("migrates removed achievement ids when loading saved progress", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      clear: () => storage.clear(),
    });

    storage.set(
      "nba-head-to-head-achievements",
      JSON.stringify({ unlocked: ["curry-kitchen", "midrange-museum", "zero-big"] }),
    );

    const state = loadAchievementState();

    expect(state.unlocked).toContain("family-ties");
    expect(state.unlocked).toContain("brick-city");
    expect(state.unlocked).not.toContain("curry-kitchen");
    expect(state.unlocked).not.toContain("zero-big");

    vi.unstubAllGlobals();
  });
});
