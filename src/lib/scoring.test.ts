import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import {
  calculateLineupScore,
  compareLineups,
  getLowScoringLineupPenalty,
  getPlayersById,
  getPrimaryScorerLineupPenalty,
  hasPrimaryScorer,
  isLowScoringNonEliteDefender,
  isPlusDefenderByGrade,
  LINEUP_RAW_CEILING,
  normalizeLineupTotal,
  PRIMARY_SCORER_PPG_THRESHOLD,
  projectedWinsFromOvr,
  projectRecord,
  resolveHeadToHeadResult,
  SEASON_LENGTH,
} from "./scoring";
import { playersById } from "./playerPool";
import { getScrubPlayerIds, getSuperScrubPlayerIds } from "./playerTiers";
import type { Player } from "./types";

const lineup = (ids: string[]) => getPlayersById(ids, players);

/** Two regular all-stars plus three strong non-all-star starters. */
const TWO_ALL_STARS_THREE_STARTERS = [
  "brownja02-bos",
  "maxeyty01-phi",
  "embiijo01-phi",
  "bookede01-pho",
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
      turnovers: 2,
      trueShooting: 0.6,
      threePoint: 0.38,
      threePointersAttempted: 7,
      fieldGoalsAttempted: 15,
      minutes: 34,
      heightInches: 77,
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

  it("boosts OVR and projected wins for star tiers without a visible category", () => {
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
      turnovers: 2,
      trueShooting: 0.6,
      threePoint: 0.38,
      threePointersAttempted: 7,
      fieldGoalsAttempted: 15,
      minutes: 34,
      heightInches: 77,
      usage: 26,
      defense: 7.5,
      gamesPlayed: 70,
      styles: ["shooter", "connector"],
    });

    const superstarLineup = Array.from({ length: 5 }, (_, index) =>
      makeTieredPlayer(`superstar-${index}`, "jokicni01"),
    );
    const regularLineup = Array.from({ length: 5 }, (_, index) =>
      makeTieredPlayer(`regular-${index}`),
    );
    const superstarScore = calculateLineupScore(superstarLineup);
    const regularScore = calculateLineupScore(regularLineup);
    const categoryTotal = superstarScore.categories.reduce(
      (sum, category) => sum + category.value,
      0,
    );

    expect(superstarScore.total).toBeGreaterThan(regularScore.total);
    expect(superstarScore.projectedRecord.wins).toBeGreaterThan(
      regularScore.projectedRecord.wins,
    );
    expect(normalizeLineupTotal(categoryTotal)).toBeLessThan(superstarScore.total);
  });

  it("dampens record impact for sub-6 scorers without elite defense", () => {
    const eliteDefender: Player = {
      id: "elite-defender",
      name: "Elite Defender",
      team: "LAL",
      position: "SG",
      positions: ["SG"],
      jerseyNumber: 1,
      points: 5,
      rebounds: 4,
      assists: 2,
      steals: 1.5,
      blocks: 0.4,
      turnovers: 1,
      trueShooting: 0.58,
      threePoint: 0.36,
      threePointersAttempted: 4,
      fieldGoalsAttempted: 8,
      minutes: 24,
      heightInches: 78,
      usage: 14,
      defense: 8.5,
      defenseGrade: "A-",
      gamesPlayed: 70,
      styles: ["stopper"],
    };
    const lowScorer: Player = {
      ...eliteDefender,
      id: "low-scorer",
      name: "Low Scorer",
      defense: 5.5,
      defenseGrade: "D",
    };

    const eliteScore = calculateLineupScore([eliteDefender]);
    const lowScore = calculateLineupScore([lowScorer]);

    expect(isLowScoringNonEliteDefender(lowScorer)).toBe(true);
    expect(isLowScoringNonEliteDefender(eliteDefender)).toBe(false);
    expect(getLowScoringLineupPenalty([lowScorer])).toBe(-7);
    expect(lowScore.preciseTotal).toBeLessThan(eliteScore.preciseTotal);
  });

  it("reduces OVR and projected wins for scrub tiers without a visible category", () => {
    const makeTieredPlayer = (id: string): Player => ({
      id,
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
      turnovers: 2,
      trueShooting: 0.6,
      threePoint: 0.38,
      threePointersAttempted: 7,
      fieldGoalsAttempted: 15,
      minutes: 34,
      heightInches: 77,
      usage: 26,
      defense: 7.5,
      gamesPlayed: 70,
      styles: ["shooter", "connector"],
    });

    const superScrubIds = new Set(getSuperScrubPlayerIds());
    const scrubOnlyId = getScrubPlayerIds().find((id) => !superScrubIds.has(id));
    const scrub = scrubOnlyId ? playersById.get(scrubOnlyId) : undefined;
    const superScrub = playersById.get(getSuperScrubPlayerIds()[0]!);

    expect(scrub).toBeDefined();
    expect(superScrub).toBeDefined();

    const regularLineup = Array.from({ length: 5 }, (_, index) =>
      makeTieredPlayer(`regular-${index}`),
    );
    const scrubLineup = Array.from({ length: 4 }, (_, index) =>
      makeTieredPlayer(`regular-${index}`),
    ).concat(scrub!);
    const superScrubLineup = Array.from({ length: 4 }, (_, index) =>
      makeTieredPlayer(`regular-${index}`),
    ).concat(superScrub!);

    const regularScore = calculateLineupScore(regularLineup);
    const scrubScore = calculateLineupScore(scrubLineup);
    const superScrubScore = calculateLineupScore(superScrubLineup);

    expect(scrubScore.preciseTotal).toBeLessThan(regularScore.preciseTotal);
    expect(superScrubScore.preciseTotal).toBeLessThan(regularScore.preciseTotal);
    expect(scrubScore.projectedRecord.wins).toBeLessThan(
      regularScore.projectedRecord.wins,
    );
    expect(superScrubScore.projectedRecord.wins).toBeLessThan(
      regularScore.projectedRecord.wins,
    );
  });

  it("counts plus defenders by letter grade instead of inflated numeric defense", () => {
    const inflatedNumericDefender: Player = {
      id: "inflated-defender",
      name: "Inflated Defender",
      team: "LAL",
      position: "PG",
      positions: ["PG"],
      jerseyNumber: 1,
      points: 17,
      rebounds: 4,
      assists: 5,
      steals: 1,
      blocks: 0.5,
      turnovers: 2,
      trueShooting: 0.56,
      threePoint: 0.36,
      threePointersAttempted: 5,
      fieldGoalsAttempted: 12,
      minutes: 32,
      heightInches: 74,
      usage: 24,
      defense: 8.4,
      defenseGrade: "D+",
      gamesPlayed: 70,
      styles: ["connector"],
    };
    const trueStopper: Player = {
      ...inflatedNumericDefender,
      id: "true-stopper",
      name: "True Stopper",
      defense: 9.4,
      defenseGrade: "A",
    };

    expect(isPlusDefenderByGrade(inflatedNumericDefender)).toBe(false);
    expect(isPlusDefenderByGrade(trueStopper)).toBe(true);

    const score = calculateLineupScore([
      inflatedNumericDefender,
      inflatedNumericDefender,
      trueStopper,
      inflatedNumericDefender,
      inflatedNumericDefender,
    ]);

    expect(score.categories[3]?.note).toContain("1 B-or-better defenders");
  });

  it("penalizes lineups without a 20 PPG primary scorer", () => {
    const secondaryScoringLineup: Player[] = [
      {
        id: "giddey",
        name: "Secondary Scorer",
        team: "CHI",
        position: "PG",
        positions: ["PG", "SG"],
        jerseyNumber: 0,
        points: 19.9,
        rebounds: 8,
        assists: 9,
        steals: 1,
        blocks: 0.5,
        turnovers: 3,
        trueShooting: 0.56,
        threePoint: 0.36,
        threePointersAttempted: 5,
        fieldGoalsAttempted: 13,
        minutes: 32,
        heightInches: 74,
        usage: 29,
        defense: 8.4,
        defenseGrade: "D+",
        gamesPlayed: 70,
        styles: ["engine", "connector"],
      },
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `support-${index}`,
        name: `Support ${index}`,
        team: "LAL",
        position: "SG" as const,
        positions: ["SG" as const, "SF" as const],
        jerseyNumber: 1,
        points: 14,
        rebounds: 4,
        assists: 3,
        steals: 1,
        blocks: 0.5,
        turnovers: 2,
        trueShooting: 0.58,
        threePoint: 0.37,
        threePointersAttempted: 5,
        fieldGoalsAttempted: 12,
        minutes: 30,
        heightInches: 78,
        usage: 22,
        defense: 7.5,
        defenseGrade: "C+" as const,
        gamesPlayed: 70,
        styles: ["shooter" as const],
      })),
    ];

    const withPrimary = secondaryScoringLineup.map((player, index) =>
      index === 0 ? { ...player, points: 24 } : player,
    );

    expect(hasPrimaryScorer(secondaryScoringLineup)).toBe(false);
    expect(hasPrimaryScorer(withPrimary)).toBe(true);
    expect(getPrimaryScorerLineupPenalty(secondaryScoringLineup)).toBe(-8);
    expect(getPrimaryScorerLineupPenalty(withPrimary)).toBe(0);

    const withoutPrimaryScore = calculateLineupScore(secondaryScoringLineup);
    const withPrimaryScore = calculateLineupScore(withPrimary);

    expect(withoutPrimaryScore.warnings).toContain(
      `No clear first option; the offense lacks a ${PRIMARY_SCORER_PPG_THRESHOLD} PPG scorer.`,
    );
    expect(withPrimaryScore.preciseTotal).toBeGreaterThan(
      withoutPrimaryScore.preciseTotal,
    );
  });
});

describe("normalizeLineupTotal", () => {
  it("caps the displayed overall at 100 for elite lineups", () => {
    expect(normalizeLineupTotal(LINEUP_RAW_CEILING)).toBe(100);
    expect(normalizeLineupTotal(LINEUP_RAW_CEILING + 25)).toBe(100);
  });

  it("rounds display OVR to the nearest whole number", () => {
    expect(normalizeLineupTotal(LINEUP_RAW_CEILING * 0.846)).toBe(85);
    expect(normalizeLineupTotal(LINEUP_RAW_CEILING * 0.844)).toBe(84);
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

  it("projects wins from precise OVR rather than rounded display OVR", () => {
    const score = calculateLineupScore(
      lineup([
        "gilgesh01-okc",
        "whitede01-bos",
        "tatumja01-bos",
        "gordoaa01-den",
        "jokicni01-den",
      ]),
    );

    expect(Number.isInteger(score.total)).toBe(true);
    expect(score.projectedRecord).toEqual(projectRecord(score.preciseTotal));
  });

  it("blends same-team lineups toward prior-season team records", () => {
    const okc = lineup([
      "gilgesh01-okc",
      "holmgch01-okc",
      "willija06-okc",
      "harteis01-okc",
      "dortlu01-okc",
    ]);
    const score = calculateLineupScore(okc);
    const ovrOnly = projectRecord(score.preciseTotal);

    expect(score.projectedRecord.wins).toBeGreaterThan(ovrOnly.wins);
    expect(score.projectedRecord.wins).toBeGreaterThanOrEqual(58);
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

  it("reports a tie when precise totals match", () => {
    const lineupA = lineup([
      "gilgesh01-okc",
      "whitede01-bos",
      "tatumja01-bos",
      "gordoaa01-den",
      "jokicni01-den",
    ]);
    const score = calculateLineupScore(lineupA);

    expect(resolveHeadToHeadResult(score.preciseTotal, score.preciseTotal)).toBe(
      "tie",
    );
    expect(
      compareLineups(lineupA, lineupA).result,
    ).toBe("tie");
  });
});
