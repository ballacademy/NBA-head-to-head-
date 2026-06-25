import type { Player } from "./types";
import collegeTeammatesData from "../../data/college-teammates.json";
import chemistryFamiliesData from "../../data/chemistry-families.json";

export const BROTHER_CHEMISTRY_BONUS = 5;
export const COUSIN_CHEMISTRY_BONUS = 4;
export const COLLEGE_TEAMMATE_BONUS_TWO = 4;
export const COLLEGE_TEAMMATE_BONUS_THREE_PLUS = 6;
export const SAME_TEAM_CHEMISTRY_MIN = 3;
export const SAME_TEAM_CHEMISTRY_BONUS = 5;
export const FULL_ROSTER_TEAM_BONUS = 8;

interface FamilyGroup {
  id: string;
  title: string;
  description: string;
  bbrPlayerIds: string[];
}

interface CollegeCohort {
  id: string;
  college: string;
  bbrPlayerIds: string[];
}

const FAMILY_GROUPS = chemistryFamiliesData as {
  brothers: FamilyGroup[];
  cousins: FamilyGroup[];
};

const COLLEGE_COHORTS = collegeTeammatesData.cohorts as CollegeCohort[];

export interface ActiveChemistryBonus {
  id: string;
  title: string;
  description: string;
  bonus: number;
  matchedCount: number;
}

const getLineupBbrIds = (lineup: Player[]) =>
  new Set(
    lineup.map((player) => player.bbrPlayerId).filter(Boolean) as string[],
  );

const countGroupMatches = (lineupBbrIds: Set<string>, bbrPlayerIds: string[]) =>
  bbrPlayerIds.filter((id) => lineupBbrIds.has(id)).length;

const getFamilyBonuses = (
  lineup: Player[],
  groups: FamilyGroup[],
  bonus: number,
  kind: "brothers" | "cousins",
): ActiveChemistryBonus[] =>
  groups.flatMap((group) => {
    const matchedCount = countGroupMatches(
      getLineupBbrIds(lineup),
      group.bbrPlayerIds,
    );

    if (matchedCount < 2) {
      return [];
    }

    return [
      {
        id: `${kind}-${group.id}`,
        title: group.title,
        description: group.description,
        bonus,
        matchedCount,
      },
    ];
  });

const getCollegeTeammateBonuses = (lineup: Player[]): ActiveChemistryBonus[] => {
  const lineupBbrIds = getLineupBbrIds(lineup);

  return COLLEGE_COHORTS.flatMap((cohort) => {
    const matchedCount = countGroupMatches(lineupBbrIds, cohort.bbrPlayerIds);

    if (matchedCount < 2) {
      return [];
    }

    const bonus =
      matchedCount >= 3
        ? COLLEGE_TEAMMATE_BONUS_THREE_PLUS
        : COLLEGE_TEAMMATE_BONUS_TWO;

    return [
      {
        id: `college-${cohort.id}`,
        title: "College Teammates",
        description: `${matchedCount} former ${cohort.college} teammates on the roster.`,
        bonus,
        matchedCount,
      },
    ];
  });
};

const getSameTeamBonuses = (lineup: Player[]): ActiveChemistryBonus[] => {
  const teamCounts = new Map<string, number>();

  for (const player of lineup) {
    teamCounts.set(player.team, (teamCounts.get(player.team) ?? 0) + 1);
  }

  const bonuses: ActiveChemistryBonus[] = [];

  for (const [team, count] of teamCounts) {
    if (count === lineup.length) {
      bonuses.push({
        id: `same-team-${team}`,
        title: `All ${team}`,
        description: `All five players from ${team}.`,
        bonus: FULL_ROSTER_TEAM_BONUS,
        matchedCount: count,
      });
      continue;
    }

    if (count >= SAME_TEAM_CHEMISTRY_MIN) {
      bonuses.push({
        id: `same-team-${team}`,
        title: `${team} Core`,
        description: `${count} current ${team} teammates.`,
        bonus: SAME_TEAM_CHEMISTRY_BONUS,
        matchedCount: count,
      });
    }
  }

  return bonuses;
};

export const getActiveChemistryBonuses = (
  lineup: Player[],
): ActiveChemistryBonus[] => {
  if (lineup.length === 0) {
    return [];
  }

  return [
    ...getFamilyBonuses(
      lineup,
      FAMILY_GROUPS.brothers,
      BROTHER_CHEMISTRY_BONUS,
      "brothers",
    ),
    ...getFamilyBonuses(
      lineup,
      FAMILY_GROUPS.cousins,
      COUSIN_CHEMISTRY_BONUS,
      "cousins",
    ),
    ...getCollegeTeammateBonuses(lineup),
    ...getSameTeamBonuses(lineup),
  ];
};

export const getChemistryAdjustment = (lineup: Player[]) =>
  getActiveChemistryBonuses(lineup).reduce(
    (total, bonus) => total + bonus.bonus,
    0,
  );

export const hasFamilyChemistryBonus = (lineup: Player[]) =>
  getActiveChemistryBonuses(lineup).some(
    (bonus) =>
      bonus.id.startsWith("brothers-") || bonus.id.startsWith("cousins-"),
  );

export const hasCollegeChemistryBonus = (lineup: Player[]) =>
  getActiveChemistryBonuses(lineup).some((bonus) =>
    bonus.id.startsWith("college-"),
  );

export const hasTeamCoreChemistryBonus = (lineup: Player[]) =>
  getActiveChemistryBonuses(lineup).some(
    (bonus) =>
      bonus.id.startsWith("same-team-") &&
      bonus.matchedCount >= SAME_TEAM_CHEMISTRY_MIN,
  );
