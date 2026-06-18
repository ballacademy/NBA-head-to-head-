import { describe, expect, it, vi } from "vitest";
import { players } from "./playerPool";
import { ACHIEVEMENT_CHECKS } from "./achievementChecks";
import {
  ACHIEVEMENTS,
  checkLineupAchievements,
  getAchievementProgress,
  unlockAchievements,
} from "./achievements";

describe("achievements", () => {
  it("defines 52 unique badges", () => {
    expect(ACHIEVEMENTS).toHaveLength(52);
    expect(ACHIEVEMENT_CHECKS).toHaveLength(52);
    expect(new Set(ACHIEVEMENTS.map((achievement) => achievement.id)).size).toBe(
      52,
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

  it("detects five true centers and five forwards lineups", () => {
    const centers = players.filter((player) => player.position === "C").slice(0, 5);
    const forwards = players
      .filter((player) => player.position === "SF" || player.position === "PF")
      .slice(0, 5);

    expect(centers.length).toBe(5);
    expect(forwards.length).toBe(5);
    expect(checkLineupAchievements(centers)).toContain("five-true-centers");
    expect(checkLineupAchievements(forwards)).toContain("oops-all-forwards");
  });

  it("detects curry kitchen when both Currys are drafted", () => {
    const steph = players.find((player) => player.bbrPlayerId === "curryst01");
    const seth = players.find((player) => player.bbrPlayerId === "curryse01");
    const fillers = players
      .filter(
        (player) =>
          player.bbrPlayerId !== "curryst01" && player.bbrPlayerId !== "curryse01",
      )
      .slice(0, 3);

    const lineup = [steph!, seth!, ...fillers];
    expect(checkLineupAchievements(lineup)).toContain("curry-kitchen");
  });

  it("only returns known badge ids", () => {
    const lineup = players.slice(0, 5);
    const earned = checkLineupAchievements(lineup);

    expect(earned.every((id) => ACHIEVEMENTS.some((badge) => badge.id === id))).toBe(
      true,
    );
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
    expect(progress.total).toBe(52);
    expect(
      progress.achievements.find((achievement) => achievement.id === "nepotism")
        ?.isUnlocked,
    ).toBe(true);
  });
});
