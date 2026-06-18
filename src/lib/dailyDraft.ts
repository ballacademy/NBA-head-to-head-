import dailyChallenges from "../../data/daily-draft-challenges.json";
import { getDivisionForTeam } from "./divisions";
import {
  generateFeasibleDraftSlots,
  validateDraftSlotsFeasible,
} from "./draft";
import type { Division, DraftSlotConstraint, Player } from "./types";

export interface DailyDraftFilter {
  type:
    | "bbrPlayerIds"
    | "division"
    | "minAge"
    | "maxAge"
    | "minThreePoint"
    | "maxThreePoint";
  ids?: string[];
  division?: Division;
  value?: number;
}

export interface DailyDraftChallenge {
  id: string;
  title: string;
  description: string;
  filter: DailyDraftFilter;
}

const challenges = dailyChallenges.challenges as DailyDraftChallenge[];

const createSeededRandom = (seed: number) => {
  let state = seed % 2147483647;

  if (state <= 0) {
    state += 2147483646;
  }

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

export const getDailyDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getDailySeed = (dateKey = getDailyDateKey()) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return year * 10000 + month * 100 + day;
};

export const getDailyChallenge = (dateKey = getDailyDateKey()) => {
  const seed = getDailySeed(dateKey);
  const index = seed % challenges.length;
  return challenges[index]!;
};

export const playerMatchesDailyFilter = (
  player: Player,
  filter: DailyDraftFilter,
) => {
  switch (filter.type) {
    case "bbrPlayerIds":
      return Boolean(
        player.bbrPlayerId && filter.ids?.includes(player.bbrPlayerId),
      );
    case "division":
      return getDivisionForTeam(player.team) === filter.division;
    case "minAge":
      return (player.age ?? 0) >= (filter.value ?? 0);
    case "maxAge":
      return (player.age ?? 99) <= (filter.value ?? 99);
    case "minThreePoint":
      return player.threePoint >= (filter.value ?? 0);
    case "maxThreePoint":
      return player.threePoint <= (filter.value ?? 1);
    default:
      return true;
  }
};

export const filterPlayersForDailyChallenge = (
  players: Player[],
  challenge: DailyDraftChallenge,
) => players.filter((player) => playerMatchesDailyFilter(player, challenge.filter));

export const getDailyChallengeFixedDivision = (
  challenge: DailyDraftChallenge,
) => (challenge.filter.type === "division" ? challenge.filter.division : undefined);

export const generateDailyDraftSlots = (
  players: Player[],
  dateKey = getDailyDateKey(),
  challenge = getDailyChallenge(dateKey),
) => {
  const eligible = filterPlayersForDailyChallenge(players, challenge);
  const random = createSeededRandom(getDailySeed(dateKey) + 17);
  const fixedDivision = getDailyChallengeFixedDivision(challenge);

  return generateFeasibleDraftSlots(eligible, 5, {
    fixedDivision,
    random,
  });
};

export const getDailyDraftSetup = (
  players: Player[],
  dateKey = getDailyDateKey(),
) => {
  const challenge = getDailyChallenge(dateKey);
  const slots = generateDailyDraftSlots(players, dateKey, challenge);

  return {
    dateKey,
    challenge,
    slots,
  };
};

export const formatDailyChallengeLabel = (challenge: DailyDraftChallenge) =>
  challenge.title;

export const formatDailyChallengeDescription = (
  challenge: DailyDraftChallenge,
) => challenge.description;

export const isDailySlotConstraint = (
  slots: DraftSlotConstraint[],
  players: Player[],
  dateKey = getDailyDateKey(),
) => {
  const expected = generateDailyDraftSlots(players, dateKey);
  return JSON.stringify(slots) === JSON.stringify(expected);
};

export const assertDailyDraftFeasible = (
  players: Player[],
  dateKey = getDailyDateKey(),
) => {
  const setup = getDailyDraftSetup(players, dateKey);
  const eligible = filterPlayersForDailyChallenge(players, setup.challenge);

  return validateDraftSlotsFeasible(eligible, setup.slots);
};
