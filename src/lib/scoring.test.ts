import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import {
  calculateLineupScore,
  capLineupRoleFitForOffense,
  capLineupRoleFitWithoutFirstOption,
  compareLineups,
  getLineupOffenseFloorPenalty,
  getLowScoringLineupPenalty,
  getLowScoringSeverity,
  getNoTrueStarLineupPenalty,
  getPlayersById,
  getPrimaryScorerLineupPenalty,
  getEliteOffenseLineupBonus,
  getRimProtectorFactor,
  getStopperGradeFactor,
  getSuperstarStackingLineupBonus,
  hasLineupFirstOption,
  hasPrimaryScorer,
  hasStarScorer,
  hasStarTierPlayer,
  isLowScoringNonEliteDefender,
  isPlusDefenderByGrade,
  buildLineupScoreContext,
  LINEUP_FIRST_OPTION_PPG_THRESHOLD,
  LINEUP_RAW_CEILING,
  normalizeLineupTotal,
  NO_TRUE_STAR_LINEUP_PENALTY,
  OFFENSE_FLOOR_BASE_PENALTY,
  OFFENSE_FLOOR_LOW_MAX_PPG_PENALTY,
  OFFENSE_FLOOR_LOW_TOTAL_PPG_PENALTY,
  PRIMARY_SCORER_LINEUP_PENALTY,
  PRIMARY_SCORER_PPG_THRESHOLD,
  projectedWinsFromOvr,
  projectRecord,
  resolveHeadToHeadResult,
  SEASON_LENGTH,
  STAR_SCORER_PPG_THRESHOLD,
  TEAM_FIT_CAP_WITHOUT_FIRST_OPTION,
  TEAM_FIT_CAP_WITHOUT_STAR_SCORER,
} from "./scoring";
import { playersById } from "./playerPool";
import {
  ELITE_CREATION_ASSISTS_THRESHOLD,
  ELITE_CREATION_MIN_ENGINES,
  scoreLineupRoleFit,
} from "./lineupRoleFit";
import { getScrubPlayerIds, getSuperScrubPlayerIds } from "./playerTiers";
import type { Player } from "./types";

const lineup = (ids: string[]) => getPlayersById(ids, players);

/** Two regular all-stars plus three strong non-all-star starters. */
const TWO_ALL_STARS_THREE_STARTERS = [
  "brownja02-phi",
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

  it("projects two all-stars and three strong starters around mid-50s to low-60s wins", () => {
    const score = calculateLineupScore(lineup(TWO_ALL_STARS_THREE_STARTERS));

    expect(score.projectedRecord.wins).toBeGreaterThanOrEqual(50);
    expect(score.projectedRecord.wins).toBeLessThanOrEqual(74);
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
      freeThrowsAttempted: 3,
      freeThrowPct: 0.75,
      personalFouls: 2,
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
      freeThrowsAttempted: 3,
      freeThrowPct: 0.75,
      personalFouls: 2,
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
      freeThrowsAttempted: 3,
      freeThrowPct: 0.75,
      personalFouls: 2,
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
    expect(getLowScoringLineupPenalty([lowScorer])).toBeLessThan(-5);
    expect(getLowScoringLineupPenalty([lowScorer])).toBeGreaterThanOrEqual(-7);
    expect(getLowScoringLineupPenalty([eliteDefender])).toBeGreaterThan(
      getLowScoringLineupPenalty([lowScorer]),
    );
    expect(lowScore.preciseTotal).toBeLessThan(eliteScore.preciseTotal);
  });

  it("uses gradual low-scoring and defense scales instead of hard B+ / 6 PPG cliffs", () => {
    const base = {
      id: "gradual",
      name: "Gradual",
      team: "LAL",
      position: "SG" as const,
      positions: ["SG" as const],
      jerseyNumber: 1,
      points: 5.5,
      rebounds: 3,
      assists: 2,
      steals: 1,
      blocks: 0.3,
      turnovers: 1,
      trueShooting: 0.55,
      threePoint: 0.34,
      threePointersAttempted: 3,
      fieldGoalsAttempted: 8,
      freeThrowsAttempted: 2,
      freeThrowPct: 0.75,
      personalFouls: 2,
      minutes: 22,
      heightInches: 76,
      usage: 15,
      defense: 7,
      defenseGrade: "C+" as const,
      gamesPlayed: 70,
      styles: ["connector" as const],
    };

    const weakD = { ...base, id: "weak-d", defenseGrade: "D" as const, defense: 5 };
    const solidD = { ...base, id: "solid-d", defenseGrade: "B" as const, defense: 8 };
    const midScorer = { ...base, id: "mid", points: 8, defenseGrade: "C+" as const };

    expect(getLowScoringSeverity(weakD)).toBeGreaterThan(getLowScoringSeverity(solidD));
    expect(getLowScoringSeverity(solidD)).toBeGreaterThan(getLowScoringSeverity(midScorer));
    expect(getStopperGradeFactor(solidD)).toBeGreaterThan(getStopperGradeFactor(weakD));
    expect(getStopperGradeFactor(solidD)).toBeGreaterThan(0.7);
    expect(getStopperGradeFactor(weakD)).toBeLessThan(0.3);
  });

  it("treats elite frontcourt defenders as rim protectors beyond block rate alone", () => {
    const giannisLike: Player = {
      id: "giannis-like",
      name: "Paint Presence",
      team: "MIL",
      position: "PF",
      positions: ["PF", "SF"],
      jerseyNumber: 34,
      points: 27,
      rebounds: 11,
      assists: 6,
      steals: 1,
      blocks: 0.7,
      turnovers: 3,
      trueShooting: 0.63,
      threePoint: 0.28,
      threePointersAttempted: 1,
      fieldGoalsAttempted: 18,
      freeThrowsAttempted: 8,
      freeThrowPct: 0.65,
      personalFouls: 3,
      minutes: 35,
      heightInches: 83,
      usage: 31,
      defense: 9,
      defenseGrade: "A",
      gamesPlayed: 70,
      styles: ["scorer", "roll-man"],
    };
    const lowBlockGuard: Player = {
      ...giannisLike,
      id: "guard",
      position: "PG",
      positions: ["PG"],
      blocks: 0.7,
      defenseGrade: "A",
      styles: ["engine"],
    };

    expect(getRimProtectorFactor(giannisLike)).toBeGreaterThan(0.65);
    expect(getRimProtectorFactor(lowBlockGuard)).toBeLessThan(
      getRimProtectorFactor(giannisLike),
    );

    const withPresence = scoreLineupRoleFit(
      {
        guardCount: 2,
        forwardCount: 2,
        centerCount: 0,
        creators: 2,
        engines: 1,
        connectors: 1,
        highUsagePlayers: 2,
        lowUsagePlayers: 1,
        stoppers: 2,
        rimProtectors: getRimProtectorFactor(giannisLike),
      },
      { assists: 20 },
    );
    const withoutPresence = scoreLineupRoleFit(
      {
        guardCount: 2,
        forwardCount: 2,
        centerCount: 0,
        creators: 2,
        engines: 1,
        connectors: 1,
        highUsagePlayers: 2,
        lowUsagePlayers: 1,
        stoppers: 2,
        rimProtectors: 0,
      },
      { assists: 20 },
    );

    // Missing rim protection should not hammer fit; having it still helps.
    expect(withPresence).toBeGreaterThan(withoutPresence);
    expect(withoutPresence).toBeGreaterThan(20);
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
      freeThrowsAttempted: 3,
      freeThrowPct: 0.75,
      personalFouls: 2,
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
      freeThrowsAttempted: 3,
      freeThrowPct: 0.75,
      personalFouls: 2,
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
        freeThrowsAttempted: 3,
        freeThrowPct: 0.75,
        personalFouls: 2,
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
        freeThrowsAttempted: 3,
        freeThrowPct: 0.75,
        personalFouls: 2,
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
    expect(getPrimaryScorerLineupPenalty(secondaryScoringLineup)).toBeLessThan(
      -3,
    );
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

  it("caps team fit and applies an offense floor without an 18+ PPG scorer", () => {
    const defensiveRolePlayers: Player[] = [
      {
        id: "dunn",
        name: "Defensive Guard",
        team: "LAC",
        position: "PG",
        positions: ["PG"],
        jerseyNumber: 1,
        points: 7.3,
        rebounds: 2,
        assists: 3,
        steals: 1.2,
        blocks: 0.3,
        turnovers: 1,
        trueShooting: 0.59,
        threePoint: 0.36,
        threePointersAttempted: 3,
        fieldGoalsAttempted: 8,
        freeThrowsAttempted: 3,
        freeThrowPct: 0.75,
        personalFouls: 2,
        minutes: 24,
        heightInches: 75,
        usage: 19,
        defense: 8.2,
        defenseGrade: "B+",
        gamesPlayed: 70,
        styles: ["stopper"],
      },
      {
        id: "melton",
        name: "Two-Way Guard",
        team: "GSW",
        position: "SG",
        positions: ["SG", "PG"],
        jerseyNumber: 8,
        points: 12.3,
        rebounds: 3,
        assists: 3,
        steals: 1.1,
        blocks: 0.4,
        turnovers: 1.5,
        trueShooting: 0.6,
        threePoint: 0.37,
        threePointersAttempted: 5,
        fieldGoalsAttempted: 10,
        freeThrowsAttempted: 3,
        freeThrowPct: 0.75,
        personalFouls: 2,
        minutes: 26,
        heightInches: 76,
        usage: 22,
        defense: 8.1,
        defenseGrade: "B+",
        gamesPlayed: 70,
        styles: ["stopper"],
      },
      ...Array.from({ length: 3 }, (_, index) => ({
        id: `wing-${index}`,
        name: `Wing ${index}`,
        team: "MIN",
        position: "SF" as const,
        positions: ["SF" as const, "PF" as const],
        jerseyNumber: 10 + index,
        points: 11,
        rebounds: 4,
        assists: 2,
        steals: 1,
        blocks: 0.8,
        turnovers: 1,
        trueShooting: 0.58,
        threePoint: 0.36,
        threePointersAttempted: 4,
        fieldGoalsAttempted: 9,
        freeThrowsAttempted: 3,
        freeThrowPct: 0.75,
        personalFouls: 2,
        minutes: 28,
        heightInches: 79,
        usage: 20,
        defense: 8,
        defenseGrade: "B+" as const,
        gamesPlayed: 70,
        styles: ["stopper" as const],
      })),
    ];

    expect(hasLineupFirstOption(defensiveRolePlayers)).toBe(false);
    expect(getPrimaryScorerLineupPenalty(defensiveRolePlayers)).toBe(0);
    expect(getLineupOffenseFloorPenalty(defensiveRolePlayers)).toBeLessThan(-6);
    expect(getLineupOffenseFloorPenalty(defensiveRolePlayers)).toBeGreaterThan(
      OFFENSE_FLOOR_BASE_PENALTY +
        OFFENSE_FLOOR_LOW_MAX_PPG_PENALTY +
        OFFENSE_FLOOR_LOW_TOTAL_PPG_PENALTY -
        0.01,
    );
    expect(
      capLineupRoleFitForOffense(defensiveRolePlayers, 48),
    ).toBeCloseTo(TEAM_FIT_CAP_WITHOUT_FIRST_OPTION, 5);

    const score = calculateLineupScore(defensiveRolePlayers);

    expect(score.categories[3]?.value).toBeLessThanOrEqual(
      TEAM_FIT_CAP_WITHOUT_FIRST_OPTION,
    );
    expect(score.warnings).toContain(
      `No go-to scorer; nobody in the lineup reaches ${LINEUP_FIRST_OPTION_PPG_THRESHOLD} PPG.`,
    );
    expect(score.projectedRecord.wins).toBeGreaterThanOrEqual(20);
    expect(score.projectedRecord.wins).toBeLessThanOrEqual(30);
  });

  it("projects a defensive role-player lineup near the play-in instead of the mid-30s", () => {
    const defensiveLineup = lineup([
      "dunnkr01-lac",
      "meltode01-gsw",
      "mcdanja02-min",
      "murraybo01-tor",
      "wareke01-mil",
    ]);

    const score = calculateLineupScore(defensiveLineup);

    expect(score.projectedRecord.wins).toBeGreaterThanOrEqual(20);
    expect(score.projectedRecord.wins).toBeLessThanOrEqual(30);
  });

  it("uses a softer team fit cap when a lineup has an 18+ PPG option but no 22+ star scorer", () => {
    const withFirstOption: Player[] = [
      {
        id: "lead",
        name: "Lead Scorer",
        team: "MIA",
        position: "SG",
        positions: ["SG"],
        jerseyNumber: 1,
        points: 18.5,
        rebounds: 4,
        assists: 4,
        steals: 1,
        blocks: 0.3,
        turnovers: 2,
        trueShooting: 0.58,
        threePoint: 0.36,
        threePointersAttempted: 6,
        fieldGoalsAttempted: 14,
        freeThrowsAttempted: 3,
        freeThrowPct: 0.75,
        personalFouls: 2,
        minutes: 32,
        heightInches: 77,
        usage: 26,
        defense: 7.5,
        defenseGrade: "C+",
        gamesPlayed: 70,
        styles: ["scorer"],
      },
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `support-${index}`,
        name: `Support ${index}`,
        team: "LAL",
        position: "SF" as const,
        positions: ["SF" as const],
        jerseyNumber: 2 + index,
        points: 10,
        rebounds: 4,
        assists: 2,
        steals: 1,
        blocks: 0.5,
        turnovers: 1,
        trueShooting: 0.57,
        threePoint: 0.35,
        threePointersAttempted: 4,
        fieldGoalsAttempted: 9,
        freeThrowsAttempted: 3,
        freeThrowPct: 0.75,
        personalFouls: 2,
        minutes: 28,
        heightInches: 79,
        usage: 18,
        defense: 7.8,
        defenseGrade: "B-" as const,
        gamesPlayed: 70,
        styles: ["connector" as const],
      })),
    ];

    expect(hasLineupFirstOption(withFirstOption)).toBe(true);
    expect(hasStarScorer(withFirstOption)).toBe(false);
    expect(getLineupOffenseFloorPenalty(withFirstOption)).toBe(0);
    expect(getNoTrueStarLineupPenalty(withFirstOption)).toBeCloseTo(
      NO_TRUE_STAR_LINEUP_PENALTY,
      5,
    );
    expect(capLineupRoleFitForOffense(withFirstOption, 48)).toBeCloseTo(
      TEAM_FIT_CAP_WITHOUT_STAR_SCORER,
      5,
    );
  });

  it("does not cap team fit when a lineup has a 22+ PPG scorer", () => {
    const withStarScorer: Player[] = [
      {
        id: "star",
        name: "Star Scorer",
        team: "MIA",
        position: "SG",
        positions: ["SG"],
        jerseyNumber: 1,
        points: 23.5,
        rebounds: 4,
        assists: 4,
        steals: 1,
        blocks: 0.3,
        turnovers: 2,
        trueShooting: 0.58,
        threePoint: 0.36,
        threePointersAttempted: 6,
        fieldGoalsAttempted: 14,
        freeThrowsAttempted: 3,
        freeThrowPct: 0.75,
        personalFouls: 2,
        minutes: 32,
        heightInches: 77,
        usage: 26,
        defense: 7.5,
        defenseGrade: "C+",
        gamesPlayed: 70,
        styles: ["scorer"],
      },
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `support-${index}`,
        name: `Support ${index}`,
        team: "LAL",
        position: "SF" as const,
        positions: ["SF" as const],
        jerseyNumber: 2 + index,
        points: 10,
        rebounds: 4,
        assists: 2,
        steals: 1,
        blocks: 0.5,
        turnovers: 1,
        trueShooting: 0.57,
        threePoint: 0.35,
        threePointersAttempted: 4,
        fieldGoalsAttempted: 9,
        freeThrowsAttempted: 3,
        freeThrowPct: 0.75,
        personalFouls: 2,
        minutes: 28,
        heightInches: 79,
        usage: 18,
        defense: 7.8,
        defenseGrade: "B-" as const,
        gamesPlayed: 70,
        styles: ["connector" as const],
      })),
    ];

    expect(hasStarScorer(withStarScorer)).toBe(true);
    expect(getNoTrueStarLineupPenalty(withStarScorer)).toBeCloseTo(0, 5);
    expect(capLineupRoleFitForOffense(withStarScorer, 48)).toBe(48);
  });

  it("caps team fit at 40 and penalizes lineups without a 22+ PPG or star-tier player", () => {
    const secondaryStarLineup: Player[] = [
      {
        id: "naw",
        name: "Borderline Lead",
        team: "ATL",
        position: "SG",
        positions: ["SG"],
        jerseyNumber: 1,
        points: 20.8,
        rebounds: 4,
        assists: 4,
        steals: 1,
        blocks: 0.4,
        turnovers: 2,
        trueShooting: 0.6,
        threePoint: 0.38,
        threePointersAttempted: 6,
        fieldGoalsAttempted: 14,
        freeThrowsAttempted: 3,
        freeThrowPct: 0.75,
        personalFouls: 2,
        minutes: 32,
        heightInches: 77,
        usage: 26,
        defense: 8.5,
        defenseGrade: "A-",
        gamesPlayed: 70,
        styles: ["scorer"],
      },
      {
        id: "bane",
        name: "Secondary Lead",
        team: "ORL",
        position: "SG",
        positions: ["SG"],
        jerseyNumber: 2,
        points: 20.1,
        rebounds: 4,
        assists: 4,
        steals: 1,
        blocks: 0.3,
        turnovers: 2,
        trueShooting: 0.59,
        threePoint: 0.37,
        threePointersAttempted: 6,
        fieldGoalsAttempted: 14,
        freeThrowsAttempted: 3,
        freeThrowPct: 0.75,
        personalFouls: 2,
        minutes: 32,
        heightInches: 77,
        usage: 26,
        defense: 7.8,
        defenseGrade: "B",
        gamesPlayed: 70,
        styles: ["scorer"],
      },
      ...Array.from({ length: 3 }, (_, index) => ({
        id: `role-${index}`,
        name: `Role ${index}`,
        team: "BOS",
        position: "SF" as const,
        positions: ["SF" as const],
        jerseyNumber: 3 + index,
        points: 14,
        rebounds: 5,
        assists: 3,
        steals: 1,
        blocks: 1,
        turnovers: 1,
        trueShooting: 0.58,
        threePoint: 0.36,
        threePointersAttempted: 5,
        fieldGoalsAttempted: 10,
        freeThrowsAttempted: 3,
        freeThrowPct: 0.75,
        personalFouls: 2,
        minutes: 28,
        heightInches: 79,
        usage: 22,
        defense: 7.5,
        defenseGrade: "B" as const,
        gamesPlayed: 70,
        styles: ["connector" as const],
      })),
    ];

    expect(hasLineupFirstOption(secondaryStarLineup)).toBe(true);
    expect(hasPrimaryScorer(secondaryStarLineup)).toBe(true);
    expect(hasStarScorer(secondaryStarLineup)).toBe(false);
    expect(hasStarTierPlayer(secondaryStarLineup)).toBe(false);
    expect(getNoTrueStarLineupPenalty(secondaryStarLineup)).toBeLessThan(-2);
    expect(getNoTrueStarLineupPenalty(secondaryStarLineup)).toBeGreaterThan(
      NO_TRUE_STAR_LINEUP_PENALTY,
    );
    expect(capLineupRoleFitForOffense(secondaryStarLineup, 48)).toBeGreaterThan(
      TEAM_FIT_CAP_WITHOUT_STAR_SCORER,
    );
    expect(capLineupRoleFitForOffense(secondaryStarLineup, 48)).toBeLessThan(48);

    const score = calculateLineupScore(secondaryStarLineup);

    expect(score.categories[3]?.value).toBeLessThan(48);
    expect(score.warnings).toContain(
      `No true star; nobody reaches ${STAR_SCORER_PPG_THRESHOLD} PPG and the lineup lacks an All-Star or superstar.`,
    );
    expect(score.projectedRecord.wins).toBeGreaterThanOrEqual(28);
    expect(score.projectedRecord.wins).toBeLessThanOrEqual(44);
  });

  it("projects the Pritchard secondary-star lineup under 40 wins without a true star", () => {
    const secondaryStarLineup = lineup([
      "pritcpa01-bos",
      "alexani01-atl",
      "banede01-orl",
      "sensabr01-uta",
      "clingdo01-por",
    ]);

    const score = calculateLineupScore(secondaryStarLineup);

    expect(score.projectedRecord.wins).toBeGreaterThanOrEqual(28);
    expect(score.projectedRecord.wins).toBeLessThanOrEqual(46);
  });

  it("punishes Kyrie-plus-unranked role lineups below the old soft mid-30s floor", () => {
    const thinStarLineup = lineup([
      "sandeko01-lac",
      "irvinky01-dal",
      "minotjo01-brk",
      "grantje01-mem",
      "garzalu01-bos",
    ]);

    const score = calculateLineupScore(thinStarLineup);

    expect(score.projectedRecord.wins).toBeLessThanOrEqual(30);
    expect(score.warnings).toContain(
      "Impact depth is thin; the lineup leans too hard on one ranked piece.",
    );
  });

  it("boosts impact-ranked stars like Butler without double-counting tagged all-stars", () => {
    const impactStarLineup = lineup([
      "thompam01-hou",
      "pritcpa01-bos",
      "castlst01-sas",
      "butleji01-gsw",
      "townska01-nyk",
    ]);

    const score = calculateLineupScore(impactStarLineup);

    expect(hasStarTierPlayer(impactStarLineup)).toBe(true);
    expect(score.projectedRecord.wins).toBeGreaterThanOrEqual(46);
    expect(score.projectedRecord.wins).toBeLessThanOrEqual(52);
  });

  it("rewards elite offensive lineups with superstar stacking and production bonuses", () => {
    const eliteOffenseLineup = lineup([
      "doncilu01-lal",
      "mccolcj01-atl",
      "portemi01-brk",
      "markkla01-uta",
      "jokicni01-den",
    ]);

    const score = calculateLineupScore(eliteOffenseLineup);

    expect(score.projectedRecord.wins).toBeGreaterThanOrEqual(55);
    expect(score.projectedRecord.wins).toBeLessThanOrEqual(78);
    expect(score.strengths).toContain(
      "Elite playmaking supports multiple high-usage creators.",
    );
    expect(score.warnings).not.toContain(
      "Ball-dominant stars may fight for the same touches.",
    );
  });

  it("applies superstar stacking and elite offense raw bonuses", () => {
    const eliteOffenseLineup = lineup([
      "doncilu01-lal",
      "mccolcj01-atl",
      "portemi01-brk",
      "markkla01-uta",
      "jokicni01-den",
    ]);
    const productionScore = eliteOffenseLineup.reduce(
      (sum, player) =>
        sum +
        player.points * 0.45 +
        player.rebounds * 0.38 +
        player.assists * 0.52,
      0,
    );
    const totalPoints = eliteOffenseLineup.reduce(
      (sum, player) => sum + player.points,
      0,
    );

    expect(getSuperstarStackingLineupBonus(eliteOffenseLineup)).toBe(8);
    expect(getEliteOffenseLineupBonus(productionScore, totalPoints)).toBeCloseTo(
      10,
      5,
    );
  });

  it("softens high-usage team fit penalties when creation is elite", () => {
    const highUsageProfile = {
      guardCount: 2,
      forwardCount: 2,
      centerCount: 1,
      creators: 3,
      engines: ELITE_CREATION_MIN_ENGINES,
      connectors: 1,
      highUsagePlayers: 3,
      lowUsagePlayers: 1,
      stoppers: 1,
      rimProtectors: 1,
    };
    const eliteTotals = { assists: ELITE_CREATION_ASSISTS_THRESHOLD };
    const thinCreationProfile = {
      ...highUsageProfile,
      engines: ELITE_CREATION_MIN_ENGINES - 1,
    };

    expect(
      scoreLineupRoleFit(highUsageProfile, eliteTotals),
    ).toBeGreaterThan(
      scoreLineupRoleFit(thinCreationProfile, eliteTotals),
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
      "mitchaj01-okc",
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

  it("builds two sentences of score context from strengths and warnings", () => {
    const score = calculateLineupScore(
      lineup([
        "gilgesh01-okc",
        "whitede01-bos",
        "tatumja01-bos",
        "gordoaa01-den",
        "jokicni01-den",
      ]),
    );
    const context = buildLineupScoreContext(score);
    const sentences = context
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    expect(sentences.length).toBe(2);
    expect(context.length).toBeGreaterThan(40);
  });

  it("prefers top-100 impact depth over a thin mid-tier core", () => {
    const deepTalent = lineup([
      "giddejo01-chi",
      "holidjr01-por",
      "thompau01-det",
      "adebaba01-mia",
      "reidna01-cho",
    ]);
    const thinMidTierCore = lineup([
      "hardyja02-lal",
      "banede01-orl",
      "portibo01-mia",
      "reidna01-cho",
      "sensabr01-uta",
    ]);

    const result = compareLineups(deepTalent, thinMidTierCore);

    expect(deepTalent).toHaveLength(5);
    expect(thinMidTierCore).toHaveLength(5);
    expect(result.winner).toBe("A");
    expect(result.margin).toBeGreaterThan(0);
  });
});
