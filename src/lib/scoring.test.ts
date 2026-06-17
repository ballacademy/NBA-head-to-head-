import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import {
  calculateLineupScore,
  compareLineups,
  getMatchupEffectiveTotal,
  getPlayersById,
  LINEUP_RAW_CEILING,
  normalizeLineupTotal,
  projectedWinsFromOvr,
  projectRecord,
  SEASON_LENGTH,
} from "./scoring";
import type { Player } from "./types";

const lineup = (ids: string[]) => getPlayersById(ids, players);

/** Two regular all-stars plus three strong non-all-star starters. */
const TWO_ALL_STARS_THREE_STARTERS = [
  "brownja02-bos",
  "maxeyty01-phi",
  "embiijo01-phi",
  "hardeja01-cle",
  "markkla01-uta",
];

describe("calculateLineupScore", () => {
  it("rewards a complete lineup with production, efficiency, shooting, and fit", () => {
    const score = calculateLineupScore(
      lineup([
        "gilgesh01-okc",
        "whitede01-bos",
        "tatumja01-bos",
        "gordoaa01-den",
        "jokicni01-den",
      ]),
    );

    expect(score.total).toBeGreaterThan(55);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.projectedRecord.formatted).toMatch(/^Record: \d+-\d+$/);
    expect(score.projectedRecord.wins + score.projectedRecord.losses).toBe(
      SEASON_LENGTH,
    );
    expect(score.categories.map((category) => category.label)).toEqual([
      "Box score production",
      "True shooting and defense",
      "Three-point bonus",
      "Team fit",
    ]);
    expect(score.strengths).toContain(
      "Creation and connective passing should travel well.",
    );
  });

  it("flags high-usage lineups with fragile defensive fit", () => {
    const score = calculateLineupScore(
      lineup([
        "doncilu01-lal",
        "curryst01-gsw",
        "gilgesh01-okc",
        "brunsja01-nyk",
        "bookede01-pho",
      ]),
    );

    expect(score.warnings).toContain(
      "Ball-dominant stars may fight for the same touches.",
    );
    expect(score.warnings).toContain(
      "Positional overlap makes matchups harder to cover.",
    );
  });

  it("projects two all-stars and three strong starters around 45-55 wins", () => {
    const score = calculateLineupScore(lineup(TWO_ALL_STARS_THREE_STARTERS));

    expect(score.projectedRecord.wins).toBeGreaterThanOrEqual(45);
    expect(score.projectedRecord.wins).toBeLessThanOrEqual(55);
  });

  it("weighs limited-sample players less in lineup scoring", () => {
    const makeStarter = (gamesPlayed: number): Player => ({
      id: `starter-${gamesPlayed}`,
      name: `Starter ${gamesPlayed}`,
      team: "LAL",
      position: "SG",
      positions: ["SG", "SF"],
      jerseyNumber: 1,
      points: 24,
      rebounds: 6,
      assists: 4,
      steals: 1.2,
      blocks: 0.6,
      trueShooting: 0.6,
      threePoint: 0.38,
      usage: 26,
      defense: 7.5,
      gamesPlayed,
      styles: ["shooter", "connector"],
    });

    const fullSample = calculateLineupScore(
      Array.from({ length: 5 }, () => makeStarter(70)),
    );
    const limitedSample = calculateLineupScore(
      Array.from({ length: 5 }, () => makeStarter(5)),
    );

    expect(limitedSample.total).toBeLessThan(fullSample.total);
  });

  it("applies hidden star-tier bonuses only to matchup resolution", () => {
    const makeTieredPlayer = (
      id: string,
      bbrPlayerId?: string,
    ): Player => ({
      id,
      bbrPlayerId,
      name: id,
      team: "LAL",
      position: "SG",
      positions: ["SG", "SF"],
      jerseyNumber: 1,
      points: 24,
      rebounds: 6,
      assists: 4,
      steals: 1.2,
      blocks: 0.6,
      trueShooting: 0.6,
      threePoint: 0.38,
      usage: 26,
      defense: 7.5,
      gamesPlayed: 70,
      styles: ["shooter", "connector"],
    });

    const superstarLineup = [makeTieredPlayer("superstar", "jokicni01")];
    const regularLineup = [makeTieredPlayer("regular")];
    const superstarScore = calculateLineupScore(superstarLineup);
    const regularScore = calculateLineupScore(regularLineup);

    expect(superstarScore.total).toBe(regularScore.total);
    expect(getMatchupEffectiveTotal(superstarLineup, superstarScore.total)).toBe(
      superstarScore.total + 2,
    );
    expect(
      getMatchupEffectiveTotal(superstarLineup, superstarScore.total),
    ).toBeGreaterThan(getMatchupEffectiveTotal(regularLineup, regularScore.total));
  });
});

describe("normalizeLineupTotal", () => {
  it("caps the displayed overall at 100 for elite lineups", () => {
    expect(normalizeLineupTotal(LINEUP_RAW_CEILING)).toBe(100);
    expect(normalizeLineupTotal(LINEUP_RAW_CEILING + 25)).toBe(100);
  });
});

describe("projectRecord", () => {
  it("anchors projected records to the requested OVR milestones", () => {
    expect(projectRecord(100).formatted).toBe("Record: 82-0");
    expect(projectRecord(80).formatted).toBe("Record: 52-30");
    expect(projectRecord(0).formatted).toBe("Record: 0-82");
    expect(projectRecord(85).formatted).toBe("Record: 57-25");
    expect(projectRecord(95).formatted).toBe("Record: 71-11");
    expect(projectedWinsFromOvr(90)).toBe(63);
    expect(projectedWinsFromOvr(50)).toBe(28);
    expect(projectRecord(100).wins + projectRecord(100).losses).toBe(
      SEASON_LENGTH,
    );
  });
});

describe("compareLineups", () => {
  it("selects the higher scoring lineup as the matchup winner", () => {
    const result = compareLineups(
      lineup([
        "gilgesh01-okc",
        "whitede01-bos",
        "tatumja01-bos",
        "gordoaa01-den",
        "jokicni01-den",
      ]),
      lineup([
        "doncilu01",
        "curryst01",
        "bookede01",
        "brunsja01",
        "garlada01",
      ]),
    );

    expect(result.winner).toBe("A");
    expect(result.margin).toBeGreaterThan(0);
  });
});
