import { describe, expect, it } from "vitest";
import type { Player } from "./types";
import {
  buildLineupShootingProfile,
  hasReliableLineupSpacing,
  isEliteThreePointShooter,
  isNonThreePointShooter,
  isPassableThreePointShooter,
  scoreLineupThreePointBonus,
} from "./lineupShooting";

const makePlayer = (
  name: string,
  threePoint: number,
  threePointersAttempted: number,
): Player => ({
  id: name,
  name,
  team: "LAL",
  position: "SF",
  positions: ["SF"],
  jerseyNumber: 1,
  points: 14,
  rebounds: 4,
  assists: 2,
  steals: 0.8,
  blocks: 0.4,
  turnovers: 1.5,
  trueShooting: 0.58,
  threePoint,
  threePointersAttempted,
  fieldGoalsAttempted: 12,
  freeThrowsAttempted: 3,
  freeThrowPct: 0.75,
  personalFouls: 2,
  minutes: 30,
  heightInches: 79,
  usage: 20,
  defense: 6,
  gamesPlayed: 70,
  styles: ["shooter"],
});

const uniformWeights = (lineup: Player[]) => lineup.map(() => 1);

describe("lineupShooting", () => {
  it("rewards balanced passable shooting over two elite shooters and three non-shooters", () => {
    const balanced = Array.from({ length: 5 }, (_, index) =>
      makePlayer(`Balanced ${index}`, 0.365, 6),
    );
    const spiky = [
      makePlayer("Elite A", 0.41, 9),
      makePlayer("Elite B", 0.4, 8),
      makePlayer("Non A", 0.29, 2),
      makePlayer("Non B", 0.3, 1.5),
      makePlayer("Non C", 0.28, 1),
    ];

    const balancedProfile = buildLineupShootingProfile(
      balanced,
      uniformWeights(balanced),
      balanced.length,
    );
    const spikyProfile = buildLineupShootingProfile(
      spiky,
      uniformWeights(spiky),
      spiky.length,
    );

    expect(scoreLineupThreePointBonus(balancedProfile)).toBeGreaterThan(
      scoreLineupThreePointBonus(spikyProfile),
    );
    expect(hasReliableLineupSpacing(balancedProfile)).toBe(true);
    expect(hasReliableLineupSpacing(spikyProfile)).toBe(false);
  });

  it("requires three-point volume before counting passable or elite shooters", () => {
    const emptyDiet = makePlayer("Empty Diet", 0.45, 0.4);
    const realShooter = makePlayer("Real Shooter", 0.37, 5);
    const eliteVolume = makePlayer("Elite Volume", 0.4, 7);

    expect(isPassableThreePointShooter(emptyDiet)).toBe(false);
    expect(isEliteThreePointShooter(emptyDiet)).toBe(false);
    expect(isNonThreePointShooter(emptyDiet)).toBe(true);

    expect(isPassableThreePointShooter(realShooter)).toBe(true);
    expect(isEliteThreePointShooter(eliteVolume)).toBe(true);

    const lowVolumeLineup = [
      emptyDiet,
      makePlayer("A", 0.4, 0.5),
      makePlayer("B", 0.41, 0.6),
      makePlayer("C", 0.39, 0.7),
      makePlayer("D", 0.42, 0.8),
    ];
    const realVolumeLineup = [
      realShooter,
      makePlayer("A", 0.36, 4),
      makePlayer("B", 0.37, 5),
      makePlayer("C", 0.36, 3),
      makePlayer("D", 0.38, 6),
    ];

    const lowProfile = buildLineupShootingProfile(
      lowVolumeLineup,
      uniformWeights(lowVolumeLineup),
      lowVolumeLineup.length,
    );
    const realProfile = buildLineupShootingProfile(
      realVolumeLineup,
      uniformWeights(realVolumeLineup),
      realVolumeLineup.length,
    );

    expect(lowProfile.passableShooters).toBe(0);
    expect(scoreLineupThreePointBonus(realProfile)).toBeGreaterThan(
      scoreLineupThreePointBonus(lowProfile),
    );
  });
});
