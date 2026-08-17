import { DIVISIONS, getDivisionForTeam, isDraftableTeam } from "./divisions";
import type { Division } from "./types";
import { playerMatchesPosition } from "./positions";
import { hasLimitedSampleSize } from "./sampleSize";
import type { DraftSlotConstraint, Player, Position } from "./types";
import { estimatePlayerSalary, getMaxAffordableSalary } from "./salaryCap";

export interface DraftFilterOptions {
  maxAffordableSalary?: number;
  allowedPlayerIds?: Set<string>;
}

export type DraftSlotAxis = "division" | "age";

export interface AgeBand {
  minAge: number;
  maxAge: number;
}

/** Shared age bands for age+position event slots. */
export const DRAFT_AGE_BANDS: readonly AgeBand[] = [
  { minAge: 19, maxAge: 23 },
  { minAge: 24, maxAge: 27 },
  { minAge: 28, maxAge: 31 },
  { minAge: 32, maxAge: 45 },
] as const;

export const slotUsesAgeBand = (slot: DraftSlotConstraint) =>
  typeof slot.minAge === "number" && typeof slot.maxAge === "number";

export const formatAgeBandLabel = (minAge: number, maxAge: number) => {
  if (minAge <= 19 && maxAge <= 23) {
    return `${maxAge} & Under`;
  }
  if (maxAge >= 40) {
    return `${minAge}+`;
  }
  return `${minAge}–${maxAge}`;
};

export const normalizePlayerNameQuery = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

/** Exact full-name match among eligible candidates (blind draft). */
export const findBlindDraftMatch = (
  candidates: Player[],
  query: string,
): { player: Player } | { error: "empty" | "not-found" | "ambiguous" } => {
  const normalized = normalizePlayerNameQuery(query);
  if (!normalized) {
    return { error: "empty" };
  }

  const matches = candidates.filter(
    (player) => normalizePlayerNameQuery(player.name) === normalized,
  );

  if (matches.length === 1) {
    return { player: matches[0]! };
  }
  if (matches.length > 1) {
    return { error: "ambiguous" };
  }
  return { error: "not-found" };
};

const GUARD_POSITIONS: Position[] = ["PG", "SG"];
const FORWARD_POSITIONS: Position[] = ["SF", "PF"];
const ALL_POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];
const BALANCED_COMPOSITION_CHANCE = 0.88;
const MAX_SLOT_GENERATION_ATTEMPTS = 64;
const BALANCED_POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];

type PositionBucket = "guard" | "forward" | "center";
type RandomSource = () => number;

const defaultRandom: RandomSource = () => Math.random();

const shuffleWith = <T>(values: T[], random: RandomSource) => {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

const pickRandomWith = <T>(values: readonly T[], random: RandomSource) =>
  values[Math.floor(random() * values.length)]!;

const bucketToPositionWith = (
  bucket: PositionBucket,
  random: RandomSource,
): Position => {
  if (bucket === "guard") {
    return pickRandomWith(GUARD_POSITIONS, random);
  }

  if (bucket === "forward") {
    return pickRandomWith(FORWARD_POSITIONS, random);
  }

  return "C";
};

const createBalancedBuckets = (random: RandomSource): PositionBucket[] =>
  shuffleWith(["guard", "guard", "forward", "forward", "center"], random);

const createVariedBuckets = (random: RandomSource): PositionBucket[] =>
  shuffleWith(
    Array.from({ length: 5 }, () => {
      const roll = random();

      if (roll < 0.4) {
        return "guard";
      }

      if (roll < 0.75) {
        return "forward";
      }

      return "center";
    }),
    random,
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

const bucketsToPositions = (buckets: PositionBucket[], random: RandomSource) =>
  buckets.map((bucket) => bucketToPositionWith(bucket, random));

const createSlotConstraints = (
  positions: Position[],
  random: RandomSource,
  fixedDivision?: Division,
): DraftSlotConstraint[] =>
  positions.map((position) => ({
    position,
    division: fixedDivision ?? pickRandomWith(DIVISIONS, random),
  }));

export const validateDraftSlotsFeasible = (
  players: Player[],
  slots: DraftSlotConstraint[],
) => autoDraftLineup(players, slots).length === slots.length;

export const pickCheapestForSlot = (
  players: Player[],
  slot: DraftSlotConstraint,
  pickedIds: Set<string>,
) =>
  [...filterPlayersForSlot(players, slot, pickedIds)].sort(
    (left, right) =>
      estimatePlayerSalary(left) - estimatePlayerSalary(right) ||
      right.points - left.points ||
      left.name.localeCompare(right.name),
  )[0]?.id;

export const completeSalaryCapDraftFromPartial = (
  players: Player[],
  partialLineupIds: string[],
  remainingSlots: DraftSlotConstraint[],
  salaryCapLimit: number,
): string[] | null => {
  const poolById = new Map(players.map((player) => [player.id, player]));
  const memo = new Map<string, string[] | null>();

  const solve = (lineupIds: string[], slotIndex: number): string[] | null => {
    if (slotIndex >= remainingSlots.length) {
      return lineupIds;
    }

    const memoKey = `${lineupIds.join(">")}@${slotIndex}`;
    if (memo.has(memoKey)) {
      return memo.get(memoKey) ?? null;
    }

    const slot = remainingSlots[slotIndex]!;
    const pickedIds = new Set(lineupIds);
    const lineupPlayers = lineupIds
      .map((playerId) => poolById.get(playerId))
      .filter((player): player is Player => Boolean(player));
    const picksRemaining = remainingSlots.length - slotIndex;
    const maxAffordableSalary = getMaxAffordableSalary(
      lineupPlayers,
      picksRemaining,
      salaryCapLimit,
    );
    const candidates = sortDraftCandidates(
      filterPlayersForSlot(players, slot, pickedIds, {
        maxAffordableSalary,
      }),
    );

    let result: string[] | null = null;

    for (const candidate of candidates) {
      const next = solve([...lineupIds, candidate.id], slotIndex + 1);
      if (next) {
        result = next;
        break;
      }
    }

    memo.set(memoKey, result);
    return result;
  };

  return solve(partialLineupIds, 0);
};

export const canCompleteSalaryCapDraft = (
  players: Player[],
  partialLineup: Player[],
  remainingSlots: DraftSlotConstraint[],
  salaryCapLimit: number,
) =>
  completeSalaryCapDraftFromPartial(
    players,
    partialLineup.map((player) => player.id),
    remainingSlots,
    salaryCapLimit,
  ) != null;

export const autoDraftLineupUnderSalaryCap = (
  players: Player[],
  draftSlots: DraftSlotConstraint[],
  salaryCapLimit: number,
) =>
  completeSalaryCapDraftFromPartial(players, [], draftSlots, salaryCapLimit) ??
  [];

export const validateDraftSlotsFeasibleUnderSalaryCap = (
  players: Player[],
  slots: DraftSlotConstraint[],
  salaryCapLimit: number,
) =>
  autoDraftLineupUnderSalaryCap(players, slots, salaryCapLimit).length ===
  slots.length;

export const generateFeasibleDraftSlotsUnderSalaryCap = (
  players: Player[],
  salaryCapLimit: number,
  slotCount = 5,
  options: GenerateFeasibleDraftSlotsOptions = {},
): DraftSlotConstraint[] => {
  if (options.slotAxis === "age") {
    return generateFeasibleAgeBandSlotsUnderSalaryCap(
      players,
      salaryCapLimit,
      slotCount,
      options,
    );
  }

  for (let attempt = 0; attempt < MAX_SLOT_GENERATION_ATTEMPTS; attempt += 1) {
    const slots = generateFeasibleDraftSlots(players, slotCount, options);

    if (validateDraftSlotsFeasibleUnderSalaryCap(players, slots, salaryCapLimit)) {
      return slots;
    }
  }

  const random = options.random ?? defaultRandom;
  const balancedSlots = buildGreedyFeasibleSlots(
    players,
    BALANCED_POSITIONS,
    options.fixedDivision,
    random,
  );

  if (
    validateDraftSlotsFeasibleUnderSalaryCap(
      players,
      balancedSlots,
      salaryCapLimit,
    )
  ) {
    return balancedSlots;
  }

  return generateFeasibleDraftSlots(players, slotCount, options);
};

const pickRandomFeasibleAgeBand = (
  players: Player[],
  position: Position,
  pickedIds: Set<string>,
  random: RandomSource,
): AgeBand | null => {
  const feasible = shuffleWith([...DRAFT_AGE_BANDS], random).filter(
    (band) =>
      filterPlayersForSlot(
        players,
        {
          position,
          division: DIVISIONS[0]!,
          minAge: band.minAge,
          maxAge: band.maxAge,
        },
        pickedIds,
      ).length > 0,
  );

  if (feasible.length === 0) {
    return DRAFT_AGE_BANDS[0] ?? null;
  }

  return pickRandomWith(feasible, random);
};

export const buildGreedyFeasibleAgeBandSlots = (
  players: Player[],
  positions: Position[],
  random: RandomSource = defaultRandom,
): DraftSlotConstraint[] => {
  const pickedIds = new Set<string>();
  const slots: DraftSlotConstraint[] = [];

  for (const position of positions) {
    const band =
      pickRandomFeasibleAgeBand(players, position, pickedIds, random) ??
      DRAFT_AGE_BANDS[0]!;
    const slot: DraftSlotConstraint = {
      position,
      division: DIVISIONS[0]!,
      minAge: band.minAge,
      maxAge: band.maxAge,
    };
    slots.push(slot);
    const pick = pickBestForSlot(players, slot, pickedIds);
    if (pick) {
      pickedIds.add(pick);
    }
  }

  return slots;
};

export const generateFeasibleAgeBandSlotsUnderSalaryCap = (
  players: Player[],
  salaryCapLimit: number,
  slotCount = 5,
  options: GenerateFeasibleDraftSlotsOptions = {},
): DraftSlotConstraint[] => {
  const random = options.random ?? defaultRandom;

  for (let attempt = 0; attempt < MAX_SLOT_GENERATION_ATTEMPTS; attempt += 1) {
    const positions =
      slotCount === 5
        ? (generatePositionsForFiveSlots(random) ?? BALANCED_POSITIONS)
        : ALL_POSITIONS.slice(0, slotCount);
    const slots = buildGreedyFeasibleAgeBandSlots(players, positions, random);
    if (
      slots.length === slotCount &&
      validateDraftSlotsFeasibleUnderSalaryCap(players, slots, salaryCapLimit)
    ) {
      return slots;
    }
  }

  return buildGreedyFeasibleAgeBandSlots(players, BALANCED_POSITIONS, random);
};

const pickRandomFeasibleDivision = (
  players: Player[],
  position: Position,
  pickedIds: Set<string>,
  random: RandomSource,
  fixedDivision?: Division,
): Division | null => {
  const divisionOptions = fixedDivision
    ? [fixedDivision]
    : shuffleWith([...DIVISIONS], random);
  const feasibleDivisions = divisionOptions.filter(
    (division) =>
      filterPlayersForSlot(players, { position, division }, pickedIds).length > 0,
  );

  if (feasibleDivisions.length === 0) {
    return fixedDivision ?? divisionOptions[0] ?? null;
  }

  return pickRandomWith(feasibleDivisions, random);
};

export const buildGreedyFeasibleSlots = (
  players: Player[],
  positions: Position[],
  fixedDivision?: Division,
  random: RandomSource = defaultRandom,
): DraftSlotConstraint[] => {
  const pickedIds = new Set<string>();
  const slots: DraftSlotConstraint[] = [];

  for (const position of positions) {
    const division =
      pickRandomFeasibleDivision(
        players,
        position,
        pickedIds,
        random,
        fixedDivision,
      ) ?? (fixedDivision ?? DIVISIONS[0]!);
    const slot = { position, division };

    slots.push(slot);
    const pick = pickBestForSlot(players, slot, pickedIds);

    if (pick) {
      pickedIds.add(pick);
    }
  }

  return slots;
};

const buildFallbackFeasibleSlots = (
  players: Player[],
  slotCount: number,
  fixedDivision?: Division,
): DraftSlotConstraint[] => {
  const positions =
    slotCount === 5 ? BALANCED_POSITIONS : ALL_POSITIONS.slice(0, slotCount);
  const slots = buildGreedyFeasibleSlots(
    players,
    positions,
    fixedDivision,
    defaultRandom,
  );

  if (validateDraftSlotsFeasible(players, slots)) {
    return slots;
  }

  const pickedIds = new Set<string>();
  const fallbackSlots: DraftSlotConstraint[] = [];

  for (const position of positions) {
    const candidates = sortDraftCandidates(
      players.filter(
        (player) =>
          playerMatchesPosition(player, position) && !pickedIds.has(player.id),
      ),
    ).filter((player) => {
      const division = getDivisionForTeam(player.team);
      return (
        Boolean(division) &&
        (!fixedDivision || division === fixedDivision) &&
        isDraftableTeam(player.team)
      );
    });

    if (candidates.length === 0) {
      continue;
    }

    const selection = candidates[0]!;
    const division =
      pickRandomFeasibleDivision(
        players,
        position,
        pickedIds,
        defaultRandom,
        fixedDivision,
      ) ?? getDivisionForTeam(selection.team)!;

    fallbackSlots.push({ position, division });
    pickedIds.add(selection.id);
  }

  return fallbackSlots;
};

export interface GenerateFeasibleDraftSlotsOptions {
  fixedDivision?: Division;
  random?: RandomSource;
  /** When "age", slots use age bands instead of divisions. */
  slotAxis?: DraftSlotAxis;
}

const generatePositionsForFiveSlots = (
  random: RandomSource,
): Position[] | null => {
  const buckets =
    random() < BALANCED_COMPOSITION_CHANCE
      ? createBalancedBuckets(random)
      : createVariedBuckets(random);
  const positions = bucketsToPositions(buckets, random);

  if (isRejectedComposition(positions)) {
    return null;
  }

  return positions;
};

export const generateSeededSlotConstraints = (
  random: RandomSource,
  slotCount = 5,
  options: Pick<GenerateFeasibleDraftSlotsOptions, "fixedDivision"> = {},
): DraftSlotConstraint[] | null => {
  const { fixedDivision } = options;

  if (slotCount !== 5) {
    const positions = Array.from({ length: slotCount }, () =>
      pickRandomWith(ALL_POSITIONS, random),
    );

    return createSlotConstraints(positions, random, fixedDivision);
  }

  const positions = generatePositionsForFiveSlots(random);

  if (!positions) {
    return null;
  }

  return createSlotConstraints(positions, random, fixedDivision);
};

export const generateBalancedSeededSlotConstraints = (
  random: RandomSource,
  options: Pick<GenerateFeasibleDraftSlotsOptions, "fixedDivision"> = {},
) => createSlotConstraints(BALANCED_POSITIONS, random, options.fixedDivision);

export const generateFeasibleDraftSlots = (
  players: Player[],
  slotCount = 5,
  options: GenerateFeasibleDraftSlotsOptions = {},
): DraftSlotConstraint[] => {
  if (players.length === 0 || slotCount === 0) {
    return [];
  }

  const random = options.random ?? defaultRandom;
  const { fixedDivision } = options;

  if (slotCount !== 5) {
    const slots = Array.from({ length: slotCount }, () => ({
      position: pickRandomWith(ALL_POSITIONS, random),
      division: fixedDivision ?? pickRandomWith(DIVISIONS, random),
    }));

    if (validateDraftSlotsFeasible(players, slots)) {
      return slots;
    }

    return buildFallbackFeasibleSlots(players, slotCount, fixedDivision);
  }

  for (let attempt = 0; attempt < MAX_SLOT_GENERATION_ATTEMPTS; attempt += 1) {
    const buckets =
      random() < BALANCED_COMPOSITION_CHANCE
        ? createBalancedBuckets(random)
        : createVariedBuckets(random);
    const positions = bucketsToPositions(buckets, random);

    if (isRejectedComposition(positions)) {
      continue;
    }

    const slots = buildGreedyFeasibleSlots(
      players,
      positions,
      fixedDivision,
      random,
    );

    if (validateDraftSlotsFeasible(players, slots)) {
      return slots;
    }
  }

  const balancedSlots = buildGreedyFeasibleSlots(
    players,
    BALANCED_POSITIONS,
    fixedDivision,
    random,
  );

  if (validateDraftSlotsFeasible(players, balancedSlots)) {
    return balancedSlots;
  }

  return buildFallbackFeasibleSlots(players, slotCount, fixedDivision);
};

export const generateDraftSlots = (slotCount = 5): DraftSlotConstraint[] => {
  if (slotCount !== 5) {
    return Array.from({ length: slotCount }, () => ({
      position: pickRandomWith(ALL_POSITIONS, defaultRandom),
      division: pickRandomWith(DIVISIONS, defaultRandom),
    }));
  }

  for (let attempt = 0; attempt < MAX_SLOT_GENERATION_ATTEMPTS; attempt += 1) {
    const buckets =
      defaultRandom() < BALANCED_COMPOSITION_CHANCE
        ? createBalancedBuckets(defaultRandom)
        : createVariedBuckets(defaultRandom);
    const positions = bucketsToPositions(buckets, defaultRandom);

    if (!isRejectedComposition(positions)) {
      return createSlotConstraints(positions, defaultRandom);
    }
  }

  return createSlotConstraints(
    bucketsToPositions(createBalancedBuckets(defaultRandom), defaultRandom),
    defaultRandom,
  );
};

export const filterPlayersForSlot = (
  players: Player[],
  slot: DraftSlotConstraint,
  pickedIds: Set<string>,
  options: DraftFilterOptions = {},
) =>
  players.filter((player) => {
    if (!playerMatchesPosition(player, slot.position)) {
      return false;
    }

    if (!isDraftableTeam(player.team) || pickedIds.has(player.id)) {
      return false;
    }

    if (slotUsesAgeBand(slot)) {
      if (typeof player.age !== "number") {
        return false;
      }
      if (player.age < slot.minAge! || player.age > slot.maxAge!) {
        return false;
      }
    } else if (getDivisionForTeam(player.team) !== slot.division) {
      return false;
    }

    if (
      options.allowedPlayerIds !== undefined &&
      !options.allowedPlayerIds.has(player.id)
    ) {
      return false;
    }

    if (
      options.maxAffordableSalary !== undefined &&
      estimatePlayerSalary(player) > options.maxAffordableSalary
    ) {
      return false;
    }

    return true;
  });

export type DraftSortMode = "points" | "alphabetical" | "salary";

export const sortDraftCandidates = (
  players: Player[],
  sortMode: DraftSortMode = "points",
) =>
  [...players].sort((a, b) => {
    const aLimited = hasLimitedSampleSize(a);
    const bLimited = hasLimitedSampleSize(b);

    if (aLimited !== bLimited) {
      return aLimited ? 1 : -1;
    }

    if (sortMode === "alphabetical") {
      return a.name.localeCompare(b.name);
    }

    if (sortMode === "salary") {
      const salaryDiff = estimatePlayerSalary(b) - estimatePlayerSalary(a);
      if (salaryDiff !== 0) {
        return salaryDiff;
      }
      return a.name.localeCompare(b.name);
    }

    return b.points - a.points || a.name.localeCompare(b.name);
  });

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

export const formatSlotConstraint = (slot: DraftSlotConstraint) => {
  if (slotUsesAgeBand(slot)) {
    return `Draft a ${slot.position} age ${formatAgeBandLabel(slot.minAge!, slot.maxAge!)}`;
  }

  return `Draft a ${slot.position} from the ${slot.division} Division`;
};

export const formatPickSlotSummary = (slot: DraftSlotConstraint) => {
  if (slotUsesAgeBand(slot)) {
    return `${slot.position} • Age ${formatAgeBandLabel(slot.minAge!, slot.maxAge!)}`;
  }

  return `${slot.position} • ${slot.division} Division`;
};

export const pickBestForSlot = (
  players: Player[],
  slot: DraftSlotConstraint,
  pickedIds: Set<string>,
  options: DraftFilterOptions = {},
) =>
  sortDraftCandidates(
    filterPlayersForSlot(players, slot, pickedIds, options),
  )[0]?.id;

export const pickRandomTopCandidateForSlot = (
  players: Player[],
  slot: DraftSlotConstraint,
  pickedIds: Set<string>,
  options: DraftFilterOptions = {},
  topCount = 5,
  random: RandomSource = defaultRandom,
  sortMode: DraftSortMode = "points",
) => {
  const candidates = sortDraftCandidates(
    filterPlayersForSlot(players, slot, pickedIds, options),
    sortMode,
  );
  const poolSize = Math.min(topCount, candidates.length);

  if (poolSize === 0) {
    return undefined;
  }

  return candidates[Math.floor(random() * poolSize)]!.id;
};

export const autoDraftLineupWithVariance = (
  players: Player[],
  draftSlots: DraftSlotConstraint[],
  random: RandomSource = defaultRandom,
  varianceDepth = 3,
  sortMode: DraftSortMode = "points",
) => {
  const lineup: string[] = [];
  const pickedIds = new Set<string>();

  for (const slot of draftSlots) {
    const candidates = sortDraftCandidates(
      filterPlayersForSlot(players, slot, pickedIds),
      sortMode,
    );
    const poolSize = Math.min(varianceDepth, candidates.length);

    if (poolSize === 0) {
      break;
    }

    const selection = candidates[Math.floor(random() * poolSize)]!;

    lineup.push(selection.id);
    pickedIds.add(selection.id);
  }

  return lineup;
};
