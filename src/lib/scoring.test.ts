import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import {
  calculateLineupScore,
  compareLineups,
  getPlayersById,
  LINEUP_RAW_CEILING,
  normalizeLineupTotal,
  projectedWinsFromOvr,
  projectRecord,
  SEASON_LENGTH,
} from "./scoring";

const lineup = (ids: string[]) => getPlayersById(ids, players);

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
    expect(projectRecord(80).formatted).toBe("Record: 53-29");
    expect(projectedWinsFromOvr(90)).toBe(68);
    expect(projectedWinsFromOvr(50)).toBe(40);
    expect(projectedWinsFromOvr(0)).toBe(18);
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
