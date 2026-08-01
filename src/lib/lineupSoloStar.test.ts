import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import {
  getPlaymakerElevationStrength,
  getSoloStarElevationPenalty,
  isPlaymakerElevator,
  SOLO_NON_PLAYMAKER_STAR_PENALTY,
} from "./lineupSoloStar";
import type { Player } from "./types";

const byBbr = (id: string) => {
  const player = players.find((candidate) => candidate.bbrPlayerId === id);
  if (!player) {
    throw new Error(`Missing player ${id}`);
  }
  return player;
};

const rolePlayer = (index: number): Player => ({
  id: `role-${index}`,
  name: `Role ${index}`,
  team: "CHA",
  position: "SF",
  positions: ["SF"],
  jerseyNumber: index,
  points: 8,
  rebounds: 3,
  assists: 1.5,
  steals: 0.6,
  blocks: 0.3,
  turnovers: 1,
  trueShooting: 0.54,
  threePoint: 0.33,
  threePointersAttempted: 3,
  fieldGoalsAttempted: 8,
  freeThrowsAttempted: 2,
  freeThrowPct: 0.75,
  personalFouls: 2,
  minutes: 22,
  heightInches: 79,
  usage: 16,
  defense: 7,
  defenseGrade: "C+",
  gamesPlayed: 70,
  styles: ["connector"],
});

describe("lineupSoloStar", () => {
  it("treats high-assist engines as full elevators", () => {
    const jokic = byBbr("jokicni01");
    expect(isPlaymakerElevator(jokic)).toBe(true);
    expect(getPlaymakerElevationStrength(jokic)).toBe(1);
  });

  it("keeps iso / non-creating stars low on elevation", () => {
    const paulGeorge = byBbr("georgpa01");
    expect(getPlaymakerElevationStrength(paulGeorge)).toBeLessThan(0.35);
    expect(isPlaymakerElevator(paulGeorge)).toBe(false);
  });

  it("taxes a lone non-playmaker star and waives it for Jokic-led thins", () => {
    const paulGeorge = byBbr("georgpa01");
    const jokic = byBbr("jokicni01");
    const support = [0, 1, 2, 3].map(rolePlayer);

    const isoSolo = getSoloStarElevationPenalty([paulGeorge, ...support]);
    expect(isoSolo).toBeLessThan(-3);
    expect(isoSolo).toBeGreaterThanOrEqual(SOLO_NON_PLAYMAKER_STAR_PENALTY);

    const playmakerSolo = getSoloStarElevationPenalty([jokic, ...support]);
    expect(playmakerSolo).toBeCloseTo(0, 5);
  });
});
