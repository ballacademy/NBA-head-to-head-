import type { Player } from "./types";

export const CHEMISTRY_BONUS_PER_GROUP = 10;
export const SAME_TEAM_CHEMISTRY_MIN = 3;
export const SAME_TEAM_CHEMISTRY_BONUS = 8;
export const FULL_ROSTER_TEAM_BONUS = 12;

export type ChemistryGroupKind = "college" | "brothers";

export interface ChemistryGroup {
  id: string;
  title: string;
  description: string;
  kind: ChemistryGroupKind;
  bbrPlayerIds: string[];
  minCount: number;
  bonus: number;
}

export const CHEMISTRY_GROUPS: ChemistryGroup[] = [
  {
    id: "nova-knicks",
    title: "Nova Knicks",
    description: "Villanova teammates now running New York.",
    kind: "college",
    bbrPlayerIds: ["brunsja01", "hartjo01", "divindo01"],
    minCount: 3,
    bonus: CHEMISTRY_BONUS_PER_GROUP,
  },
  {
    id: "holiday-brothers",
    title: "Holiday Brothers",
    description: "Jrue and Aaron Holiday on the same roster.",
    kind: "brothers",
    bbrPlayerIds: ["holidjr01", "holidaa01"],
    minCount: 2,
    bonus: CHEMISTRY_BONUS_PER_GROUP,
  },
  {
    id: "wagner-brothers",
    title: "Wagner Brothers",
    description: "Franz and Moritz Wagner together.",
    kind: "brothers",
    bbrPlayerIds: ["wagnefr01", "wagnemo01"],
    minCount: 2,
    bonus: CHEMISTRY_BONUS_PER_GROUP,
  },
  {
    id: "curry-brothers",
    title: "Curry Brothers",
    description: "Stephen and Seth Curry together.",
    kind: "brothers",
    bbrPlayerIds: ["curryst01", "curryse01"],
    minCount: 2,
    bonus: CHEMISTRY_BONUS_PER_GROUP,
  },
  {
    id: "antetokounmpo-brothers",
    title: "Alphabet Bros",
    description: "Two or more Antetokounmpo brothers.",
    kind: "brothers",
    bbrPlayerIds: ["antetgi01", "antetth01", "antetko01"],
    minCount: 2,
    bonus: CHEMISTRY_BONUS_PER_GROUP,
  },
];

export interface ActiveChemistryBonus {
  id: string;
  title: string;
  description: string;
  bonus: number;
  matchedCount: number;
}

const countGroupMatches = (lineup: Player[], bbrPlayerIds: string[]) => {
  const ids = new Set(
    lineup.map((player) => player.bbrPlayerId).filter(Boolean) as string[],
  );

  return bbrPlayerIds.filter((id) => ids.has(id)).length;
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
        title: "Same Jersey Club",
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

  const groupBonuses = CHEMISTRY_GROUPS.flatMap((group) => {
    const matchedCount = countGroupMatches(lineup, group.bbrPlayerIds);

    if (matchedCount < group.minCount) {
      return [];
    }

    return [
      {
        id: group.id,
        title: group.title,
        description: group.description,
        bonus: group.bonus,
        matchedCount,
      },
    ];
  });

  return [...groupBonuses, ...getSameTeamBonuses(lineup)];
};

export const getChemistryAdjustment = (lineup: Player[]) =>
  getActiveChemistryBonuses(lineup).reduce(
    (total, bonus) => total + bonus.bonus,
    0,
  );
