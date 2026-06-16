import { DIVISIONS, getDivisionForTeam, isDraftableTeam } from "./divisions";
import { playerMatchesPosition } from "./positions";
import type { DraftSlotConstraint, Player, Position } from "./types";

const GUARD_POSITIONS: Position[] = ["PG", "SG"];
const FORWARD_POSITIONS: Position[] = ["SF", "PF"];
const BALANCED_COMPOSITION_CHANCE = 0.88;
const MAX_SLOT_GENERATION_ATTEMPTS = 64;

type PositionBucket = "guard" | "forward" | "center";

const shuffle = <T>(values: T[]) => {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

const pickRandom = <T>(values: readonly T[]) =>
  values[Math.floor(Math.random() * values.length)];

const bucketToPosition = (bucket: PositionBucket): Position => {
  if (bucket === "guard") {
    return pickRandom(GUARD_POSITIONS);
  }

  if (bucket === "forward") {
    return pickRandom(FORWARD_POSITIONS);
  }

  return "C";
};

const createBalancedBuckets = (): PositionBucket[] =>
  shuffle(["guard", "guard", "forward", "forward", "center"]);

const createVariedBuckets = (): PositionBucket[] =>
  shuffle(
    Array.from({ length: 5 }, () => {
      const roll = Math.random();

      if (roll < 0.4) {
        return "guard";
      }

      if (roll < 0.75) {
        return "forward";
      }

      return "center";
    }),
  );

export const isAllGuards = (positions: readonly Position[]) =>
  positions.every((position) => position === "PG" || position === "SG");

export const isAllCenters = (positions: readonly Position[]) =>
  positions.every((position) => position === "C");

export const isAllBigs = (positions: readonly Position[]) =>
  positions.every((position) => position === "PF" || position === "C");

export const isBalancedComposition = (positions: readonly Position[]) => {
  const guards = positions.filter(
    (position) => position === "PG" || position === "SG",
  ).length;
  const forwards = positions.filter(
    (position) => position === "SF" || position === "PF",
  ).length;
  const centers = positions.filter((position) => position === "C").length;

  return guards === 2 && forwards === 2 && centers === 1;
};

const isRejectedComposition = (positions: readonly Position[]) =>
  isAllGuards(positions) || isAllCenters(positions) || isAllBigs(positions);

const bucketsToPositions = (buckets: PositionBucket[]) =>
  buckets.map(bucketToPosition);

const createSlotConstraints = (positions: Position[]): DraftSlotConstraint[] =>
  positions.map((position) => ({
    position,
    division: pickRandom(DIVISIONS),
  }));

export const generateDraftSlots = (slotCount = 5): DraftSlotConstraint[] => {
  if (slotCount !== 5) {
    return Array.from({ length: slotCount }, () => ({
      position: pickRandom([...GUARD_POSITIONS, ...FORWARD_POSITIONS, "C"]),
      division: pickRandom(DIVISIONS),
    }));
  }

  for (let attempt = 0; attempt < MAX_SLOT_GENERATION_ATTEMPTS; attempt += 1) {
    const buckets =
      Math.random() < BALANCED_COMPOSITION_CHANCE
        ? createBalancedBuckets()
        : createVariedBuckets();
    const positions = bucketsToPositions(buckets);

    if (!isRejectedComposition(positions)) {
      return createSlotConstraints(positions);
    }
  }

  return createSlotConstraints(bucketsToPositions(createBalancedBuckets()));
};

export const filterPlayersForSlot = (
  players: Player[],
  slot: DraftSlotConstraint,
  pickedIds: Set<string>,
) =>
  players.filter(
    (player) =>
      playerMatchesPosition(player, slot.position) &&
      getDivisionForTeam(player.team) === slot.division &&
      isDraftableTeam(player.team) &&
      !pickedIds.has(player.id),
  );

export const sortDraftCandidates = (players: Player[]) =>
  [...players].sort(
    (a, b) => b.points - a.points || a.name.localeCompare(b.name),
  );

export const autoDraftLineup = (
  players: Player[],
  draftSlots: DraftSlotConstraint[],
) => {
  const lineup: string[] = [];
  const pickedIds = new Set<string>();

  for (const slot of draftSlots) {
    const candidates = sortDraftCandidates(
      filterPlayersForSlot(players, slot, pickedIds),
    );
    const selection = candidates[0];

    if (!selection) {
      break;
    }

    lineup.push(selection.id);
    pickedIds.add(selection.id);
  }

  return lineup;
};

export const formatSlotConstraint = (slot: DraftSlotConstraint) =>
  `Draft a ${slot.position} from the ${slot.division} division`;

export const formatPickSlotSummary = (slot: DraftSlotConstraint) =>
  `${slot.position} • ${slot.division} division`;

export const pickBestForSlot = (
  players: Player[],
  slot: DraftSlotConstraint,
  pickedIds: Set<string>,
) => sortDraftCandidates(filterPlayersForSlot(players, slot, pickedIds))[0]?.id;
