import { storedOrLastShowNames } from "../instagramComposer/composerBoardDefaults";
import {
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

const PLUS_POSITION_RANK: Record<string, number> = {
  PG: 0,
  G: 1,
  SG: 2,
  SF: 3,
  F: 4,
  PF: 5,
  C: 6,
};

/** Wemby-style C/F listings still count as the center slot. */
export const plusLineupGroup = (
  player: TierPlayer | null | undefined,
): PlayerPositionGroup | null => {
  if (!player || player.role === "coach") {
    return null;
  }
  if (player.position === "C" || player.positionGroup === "C") {
    return "C";
  }
  if (
    player.position === "PG" ||
    player.position === "SG" ||
    player.position === "G" ||
    player.positionGroup === "G"
  ) {
    return "G";
  }
  return "F";
};

export const isPlusStar = (athleteId: string) => {
  const player = getPlayer(athleteId);
  if (!player) {
    return true;
  }
  const usual = usualLineFor(athleteId);
  return player.allStar || player.ppg >= 20 || usual.pts >= 20;
};

/** Rotation regulars — not camp / two-way surprise nights. */
export const TOTW_USAGE_FLOOR = 10;
export const TOTW_MIN_MINUTES = 16;
export const TOTW_MIN_PTS = 12;

export const isTotwRegular = (athleteId: string) => {
  if (isPlusStar(athleteId)) {
    return true;
  }
  const player = getPlayer(athleteId);
  if (!player || player.role === "coach") {
    return false;
  }
  const usual = usualLineFor(athleteId);
  return player.ppg >= TOTW_USAGE_FLOOR || usual.pts >= TOTW_USAGE_FLOOR;
};

const boxNumber = (value: string | undefined) => {
  const parsed = Number.parseFloat(String(value ?? "").split("-")[0] ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
};

/** 12+ boards or huge stocks — the only way a ~6 PPG camp night posts. */
export const isTotwFreakLine = (row: NightStandout) => {
  const extra = nightFlagsFor(row.game.stats);
  return extra.reb >= 12 || extra.blk >= 5 || extra.stl >= 5 || extra.stocks >= 6;
};

export const isTotwStarterLine = (row: NightStandout) => {
  if (!isTotwRegular(row.athleteId) && !isPlusStar(row.athleteId)) {
    return false;
  }
  const extra = nightFlagsFor(row.game.stats);
  const minutes = boxNumber(row.game.stats.min);
  if (minutes < TOTW_MIN_MINUTES && !isTotwFreakLine(row)) {
    return false;
  }
  return extra.pts >= TOTW_MIN_PTS || extra.pra >= 20 || isTotwFreakLine(row);
};

export const isTotwStandoutLine = (row: NightStandout) => {
  const minutes = boxNumber(row.game.stats.min);
  if (isTotwFreakLine(row) && minutes >= 12) {
    return true;
  }
  if (!isTotwRegular(row.athleteId)) {
    return false;
  }
  const extra = nightFlagsFor(row.game.stats);
  if (minutes < TOTW_MIN_MINUTES) {
    return false;
  }
  return extra.pts >= TOTW_MIN_PTS || extra.pra >= 20;
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

const PLUS_GROUP_RANK: Record<PlayerPositionGroup, number> = {
  G: 0,
  F: 1,
  C: 2,
};

export const orderPlusStarters = (rows: NightStandout[]) =>
  [...rows].sort((left, right) => {
    const a = getPlayer(left.athleteId);
    const b = getPlayer(right.athleteId);
    const groupRank =
      (PLUS_GROUP_RANK[plusLineupGroup(a) ?? "F"] ?? 9) -
      (PLUS_GROUP_RANK[plusLineupGroup(b) ?? "F"] ?? 9);
    if (groupRank) {
      return groupRank;
    }
    const rank =
      (PLUS_POSITION_RANK[a?.position ?? ""] ?? 9) -
      (PLUS_POSITION_RANK[b?.position ?? ""] ?? 9);
    if (rank) {
      return rank;
    }
    return rankTotwBest(left, right);
  });

/** Best week, ideally 2 guards / 2 forwards / 1 center. Soft-fill if the slate isn’t clean. */
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
  const eligible = rows.filter(isTotwStarterLine);
  // Stars first, then rotation regulars. Never end-of-bench ~6 PPG nights.
  fillFrom(
    eligible.filter((row) => isPlusStar(row.athleteId)),
    true,
  );
  fillFrom(
    eligible.filter((row) => isTotwRegular(row.athleteId)),
    true,
  );
  fillFrom(eligible, true);
  fillFrom(eligible, false);
  return orderPlusStarters(picked);
};

/** Surprise / over-expectation non-stars who are not already on the TOTW five. */
export const selectPlusStandouts = (
  rows: NightStandout[],
  starterIds: ReadonlySet<string>,
) =>
  [...rows]
    .filter(
      (row) =>
        !starterIds.has(row.athleteId) &&
        !isPlusStar(row.athleteId) &&
        isTotwStandoutLine(row),
    )
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

/** Week’s best five (~2G / 2F / 1C) into a five-strip TOTW board. Stars belong here. */
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
