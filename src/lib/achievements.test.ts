import { describe, expect, it, vi } from "vitest";
import { players } from "./playerPool";
import {
  ACHIEVEMENTS,
  checkLineupAchievements,
  unlockAchievements,
} from "./achievements";

describe("achievements", () => {
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
    expect(ACHIEVEMENTS.some((achievement) => achievement.id === "nepotism")).toBe(
      true,
    );

    vi.unstubAllGlobals();
  });
});
