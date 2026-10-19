import { storedOrLastShowNames } from "../instagramComposer/composerBoardDefaults";
import {
  isSurpriseNight,
  nightFlagsFor,
  surpriseBonus,
  usualLineFor,
  type NightStandout,
} from "../playerOfTheDayComposer/nightStandouts";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import {
  getPlayer,
  type PlayerPositionGroup,
  type TierPlayer,
} from "../tierListComposer/nbaActivePlayers";
import {
  applyPlayerPick,
  clearStrip,
  createEmptyStrip,
  defaultWeekLabel,
  hasCustomPhoto,
  isTotwStrip,
  patchStrip,
  setStripPhoto,
  splitPlayerName,
  stripPlayerName,
  type TotwStrip,
} from "../teamOfTheWeekComposer/teamOfTheWeekState";

export {
  applyPlayerPick,
  clearStrip,
  DEFAULT_BRAND,
  defaultWeekLabel,
  hasCustomPhoto,
  patchStrip,
  setStripPhoto,
  splitPlayerName,
  stripPlayerName,
  type TotwStrip,
};

export const PLUS_STARTER_COUNT = 5;
export const PLUS_STANDOUT_COUNT = 5;
export const PLUS_SLOT_COUNT = PLUS_STARTER_COUNT + PLUS_STANDOUT_COUNT;
export const DEFAULT_PLUS_STARTER_CAPTION = "TEAM OF THE WEEK";
export const DEFAULT_PLUS_STANDOUT_CAPTION = "STANDOUTS OF THE WEEK";

export interface TotwPlusDraft {
  brand: string;
  week: string;
  starterCaption: string;
  standoutCaption: string;
  slots: TotwStrip[];
  showBa?: boolean;
  showNames?: boolean;
  titlesBelow?: boolean;
}

export const createEmptyPlusSlots = (): TotwStrip[] =>
  Array.from({ length: PLUS_SLOT_COUNT }, createEmptyStrip);

export const isTotwPlusDraft = (value: unknown): value is TotwPlusDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as TotwPlusDraft).brand === "string" &&
      typeof (value as TotwPlusDraft).week === "string" &&
      typeof (value as TotwPlusDraft).starterCaption === "string" &&
      typeof (value as TotwPlusDraft).standoutCaption === "string" &&
      Array.isArray((value as TotwPlusDraft).slots) &&
      (value as TotwPlusDraft).slots.length === PLUS_SLOT_COUNT &&
      (value as TotwPlusDraft).slots.every(isTotwStrip),
  );

export const starterSlots = (slots: TotwStrip[]) =>
  slots.slice(0, PLUS_STARTER_COUNT);

export const standoutSlots = (slots: TotwStrip[]) =>
  slots.slice(PLUS_STARTER_COUNT, PLUS_SLOT_COUNT);

export const usedPlusPlayerIds = (slots: TotwStrip[]) => {
  const used: Record<string, string> = {};
  slots.forEach((slot, index) => {
    if (!slot.playerId) {
      return;
    }
    used[slot.playerId] =
      index < PLUS_STARTER_COUNT
        ? `Starter ${index + 1}`
        : `Standout ${index - PLUS_STARTER_COUNT + 1}`;
  });
  return used;
};

export const slotLabel = (index: number) =>
  index < PLUS_STARTER_COUNT
    ? `Starter ${index + 1}`
    : `Standout ${index - PLUS_STARTER_COUNT + 1}`;

export const defaultTotwPlusDraft = (): TotwPlusDraft => ({
  brand: DEFAULT_BRAND,
  week: defaultWeekLabel(),
  starterCaption: DEFAULT_PLUS_STARTER_CAPTION,
  standoutCaption: DEFAULT_PLUS_STANDOUT_CAPTION,
  slots: createEmptyPlusSlots(),
  showNames: storedOrLastShowNames(undefined, true),
});

export const plusBoardEmpty = (slots: TotwStrip[]) =>
  slots.every((slot) => !slot.playerId);

const PLUS_STARTER_QUOTA: Record<PlayerPositionGroup, number> = {
  G: 2,
  F: 2,
  C: 1,
};

export const PLUS_LINEUP_SLOTS = ["PG", "SG", "SF", "PF", "C"] as const;
export type PlusLineupSlot = (typeof PLUS_LINEUP_SLOTS)[number];

const PLUS_SLOT_GROUP: Record<PlusLineupSlot, PlayerPositionGroup> = {
  PG: "G",
  SG: "G",
  SF: "F",
  PF: "F",
  C: "C",
};

/** Listed PG/SG/SF/PF/C wins over a mismatched positionGroup (Brown SF ≠ G). */
export const plusLineupGroup = (
  player: TierPlayer | null | undefined,
): PlayerPositionGroup | null => {
  if (!player || player.role === "coach") {
    return null;
  }
  if (player.position === "C") {
    return "C";
  }
  if (
    player.position === "PG" ||
    player.position === "SG" ||
    player.position === "G"
  ) {
    return "G";
  }
  if (
    player.position === "SF" ||
    player.position === "PF" ||
    player.position === "F"
  ) {
    return "F";
  }
  if (player.positionGroup === "C") {
    return "C";
  }
  if (player.positionGroup === "G") {
    return "G";
  }
  return "F";
};

/** Listed PG–C first; generic G/F only when ESPN has no split. */
export const plusLineupSlot = (
  player: TierPlayer | null | undefined,
): PlusLineupSlot | null => {
  if (!player || player.role === "coach") {
    return null;
  }
  if ((PLUS_LINEUP_SLOTS as readonly string[]).includes(player.position)) {
    return player.position as PlusLineupSlot;
  }
  const group = plusLineupGroup(player);
  if (group === "C") {
    return "C";
  }
  if (group === "G") {
    return "SG";
  }
  if (group === "F") {
    return "SF";
  }
  return null;
};

export const plusLineupSlotMatches = (
  player: TierPlayer | null | undefined,
  slot: PlusLineupSlot,
  loose = false,
) => {
  if (!player || player.role === "coach") {
    return false;
  }
  if (player.position === slot) {
    return true;
  }
  if (!loose) {
    return false;
  }
  return plusLineupGroup(player) === PLUS_SLOT_GROUP[slot];
};

export const isPlusStar = (athleteId: string) => {
  const player = getPlayer(athleteId);
  if (!player) {
    return true;
  }
  const usual = usualLineFor(athleteId);
  return player.allStar || player.ppg >= 20 || usual.pts >= 20;
};

export const plusOverExpectation = (row: NightStandout) => {
  const extra = nightFlagsFor(row.game.stats);
  const usual = usualLineFor(row.athleteId);
  return surpriseBonus(extra, usual) + extra.score * 0.15;
};

/** Raw box-score production — no surprise / over-expectation bump. */
export const totwProductionScore = (row: NightStandout) =>
  nightFlagsFor(row.game.stats).score;

const rankTotwBest = (left: NightStandout, right: NightStandout) => {
  const production = totwProductionScore(right) - totwProductionScore(left);
  if (production) {
    return production;
  }
  const star =
    Number(isPlusStar(right.athleteId)) - Number(isPlusStar(left.athleteId));
  if (star) {
    return star;
  }
  return right.score - left.score;
};

const slotOrder = (row: NightStandout) => {
  const slot = plusLineupSlot(getPlayer(row.athleteId));
  return slot ? PLUS_LINEUP_SLOTS.indexOf(slot) : 9;
};

/** Guards, then forwards, then center — PG before SG, SF before PF. Never a forward left of a guard. */
export const orderPlusStarters = (rows: NightStandout[]) => {
  const byGroup: Record<PlayerPositionGroup, NightStandout[]> = {
    G: [],
    F: [],
    C: [],
  };
  for (const row of rows) {
    const group = plusLineupGroup(getPlayer(row.athleteId));
    if (!group) {
      continue;
    }
    byGroup[group].push(row);
  }
  const byListedSlot = (left: NightStandout, right: NightStandout) => {
    const rank = slotOrder(left) - slotOrder(right);
    if (rank) {
      return rank;
    }
    return rankTotwBest(left, right);
  };
  byGroup.G.sort(byListedSlot);
  byGroup.F.sort(byListedSlot);
  byGroup.C.sort(rankTotwBest);
  return [...byGroup.G, ...byGroup.F, ...byGroup.C].slice(
    0,
    PLUS_STARTER_COUNT,
  );
};

/** Best week (~2G / 2F / 1C), then lined up PG → C — not best-to-worst left to right. */
export const selectPlusStarters = (rows: NightStandout[]) => {
  const counts: Record<PlayerPositionGroup, number> = { G: 0, F: 0, C: 0 };
  const picked: NightStandout[] = [];
  const used = new Set<string>();
  const take = (row: NightStandout, honorQuota: boolean) => {
    if (picked.length >= PLUS_STARTER_COUNT || used.has(row.athleteId)) {
      return;
    }
    const group = plusLineupGroup(getPlayer(row.athleteId));
    if (!group) {
      return;
    }
    if (honorQuota && counts[group] >= PLUS_STARTER_QUOTA[group]) {
      return;
    }
    picked.push(row);
    used.add(row.athleteId);
    counts[group] += 1;
  };
  const fillFrom = (pool: NightStandout[], honorQuota: boolean) => {
    const ranked = [...pool].sort(rankTotwBest);
    for (const row of ranked) {
      take(row, honorQuota);
    }
  };
  fillFrom(rows, true);
  fillFrom(rows, false);
  return orderPlusStarters(picked);
};

/** Surprise / over-expectation non-stars who are not already on the TOTW five. */
export const selectPlusStandouts = (
  rows: NightStandout[],
  starterIds: ReadonlySet<string>,
) =>
  [...rows]
    .filter((row) => {
      if (starterIds.has(row.athleteId) || isPlusStar(row.athleteId)) {
        return false;
      }
      const extra = nightFlagsFor(row.game.stats);
      return isSurpriseNight(extra, usualLineFor(row.athleteId));
    })
    .sort(
      (left, right) =>
        plusOverExpectation(right) - plusOverExpectation(left) ||
        right.score - left.score,
    )
    .slice(0, PLUS_STANDOUT_COUNT);

export const fillPlusFromStandouts = (
  slots: TotwStrip[],
  rows: NightStandout[],
): TotwStrip[] => {
  const previousById = new Map<string, TotwStrip>();
  for (const slot of slots) {
    if (slot.playerId) {
      previousById.set(slot.playerId, slot);
    }
  }
  const starters = selectPlusStarters(rows);
  const starterIds = new Set(starters.map((row) => row.athleteId));
  const standouts = selectPlusStandouts(rows, starterIds);
  let next = createEmptyPlusSlots();
  let index = 0;
  const used = new Set<string>();
  const take = (playerId: string) => {
    if (index >= PLUS_SLOT_COUNT || used.has(playerId)) {
      return;
    }
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    const previous = previousById.get(player.id);
    next = applyPlayerPick(
      next,
      index,
      player,
      Boolean(previous && hasCustomPhoto(previous)),
    );
    used.add(player.id);
    index += 1;
  };
  for (const row of starters) {
    take(row.athleteId);
  }
  for (const row of standouts) {
    take(row.athleteId);
  }
  return next;
};

/** Week’s best five (PG → C) into a five-strip TOTW board. Stars belong here. */
export const fillStartersFromStandouts = (
  strips: TotwStrip[],
  rows: NightStandout[],
): TotwStrip[] => {
  const previousById = new Map<string, TotwStrip>();
  for (const slot of strips) {
    if (slot.playerId) {
      previousById.set(slot.playerId, slot);
    }
  }
  const starters = selectPlusStarters(rows);
  let next = strips.map(() => createEmptyStrip());
  while (next.length < PLUS_STARTER_COUNT) {
    next.push(createEmptyStrip());
  }
  next = next.slice(0, Math.max(strips.length, PLUS_STARTER_COUNT));
  starters.forEach((row, index) => {
    if (index >= strips.length) {
      return;
    }
    const player = getPlayer(row.athleteId);
    if (!player) {
      return;
    }
    const previous = previousById.get(player.id);
    next = applyPlayerPick(
      next,
      index,
      player,
      Boolean(previous && hasCustomPhoto(previous)),
    );
  });
  return next.slice(0, strips.length);
};
