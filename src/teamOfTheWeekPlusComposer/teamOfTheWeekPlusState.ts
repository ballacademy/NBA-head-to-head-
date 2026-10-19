import { storedOrLastShowNames } from "../instagramComposer/composerBoardDefaults";
import type { LastGameStats } from "../playerOfTheDayComposer/lastGame";
import {
  isSurpriseNight,
  nightFlagsFor,
  parseMadeAttempted,
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

/** TOTW can keep a 4th F (or G) when they outrank the next group. */
export const TOTW_GROUP_SOFT_MAX = 4;

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

/** Appearances with minutes in the selected range. */
export const totwGames = (row: NightStandout) =>
  Math.max(1, Math.round(row.games ?? 1));

export const TOTW_MIN_GAMES = 2;
export const TOTW_TS_REF = 0.55;
export const TOTW_EFG_REF = 0.52;
export const TOTW_TS_SHARE = 0.75;
export const TOTW_EFG_SHARE = 0.25;
/** Modest mix — ±40% heaters were dropping 21-point star weeks like Tatum. */
export const TOTW_EFF_MIN = 0.88;
export const TOTW_EFF_MAX = 1.12;
/** Full efficiency swing at this FGA; quieter samples shrink toward 1.0. */
export const TOTW_EFF_FGA_REF = 12;
export const TOTW_MIN_FGA = 5;
export const TOTW_STOCKS_WEIGHT = 4;
export const TOTW_TENS_WEIGHT = 10;
export const TOTW_PRA_WEIGHT = 0.35;
export const TOTW_TOV_WEIGHT = 2.5;
/**
 * Close-call only: 2 GP is 1.0; each extra game (capped at +2) adds this
 * fraction. +10%/game was enough for a 5-game camp week (Lendeborg) to sit
 * PG over real production.
 */
export const TOTW_GP_REF = TOTW_MIN_GAMES;
export const TOTW_GP_BONUS = 0.02;
export const TOTW_GP_EXTRA_CAP = 2;
export const TOTW_PICKER_LIMIT = 8;

export const qualifyTotwRows = (rows: NightStandout[]) =>
  rows.filter((row) => totwGames(row) >= TOTW_MIN_GAMES);

export const totwShooting = (stats: LastGameStats) => {
  const fg = parseMadeAttempted(stats.fg);
  const three = parseMadeAttempted(stats.three);
  const ft = parseMadeAttempted(stats.ft);
  const pts = Number.parseFloat(stats.pts);
  const efg =
    fg.attempted > 0 ? (fg.made + 0.5 * three.made) / fg.attempted : null;
  const tsDenom = 2 * (fg.attempted + 0.44 * ft.attempted);
  const ts =
    tsDenom > 0 && Number.isFinite(pts) ? pts / tsDenom : null;
  return { fg, three, ft, efg, ts, fga: fg.attempted };
};

/**
 * Counting line for the window (per-game averages). Quieter tens/stocks than
 * Cover’s single-night score. Turnovers dock empty-calorie scoring volume
 * that doesn’t bring AST/REB with it.
 */
export const totwCountingScore = (stats: LastGameStats) => {
  const extra = nightFlagsFor(stats);
  const tov = Number.parseFloat(stats.tov);
  const turnovers = Number.isFinite(tov) ? tov : 0;
  return (
    extra.pts +
    extra.pra * TOTW_PRA_WEIGHT +
    extra.stocks * TOTW_STOCKS_WEIGHT +
    extra.tens * TOTW_TENS_WEIGHT -
    turnovers * TOTW_TOV_WEIGHT
  );
};

/**
 * Blend TS% vs 55% and eFG% vs 52%. Tiny shooting samples stay neutral.
 * Clamped ±12% so counting still carries: a 7-shot 85% TS heater cannot
 * outrank a 21-point star week. Below 12 FGA the bump/haircut shrinks
 * toward 1.0 — efficient volume ranks, empty volume still pays.
 */
export const totwEfficiencyIndex = (stats: LastGameStats) => {
  const { efg, ts, fga } = totwShooting(stats);
  if (fga < TOTW_MIN_FGA || ts == null || efg == null) {
    return 1;
  }
  const raw =
    TOTW_TS_SHARE * (ts / TOTW_TS_REF) + TOTW_EFG_SHARE * (efg / TOTW_EFG_REF);
  const clamped = Math.min(TOTW_EFF_MAX, Math.max(TOTW_EFF_MIN, raw));
  const volume = Math.min(1, fga / TOTW_EFF_FGA_REF);
  return 1 + (clamped - 1) * volume;
};

/** Extra games in the window count; 2 GP is 1.0, 3 GP +2%, 4+ GP +4%. */
export const totwAvailabilityIndex = (row: NightStandout) => {
  const extra = Math.min(
    TOTW_GP_EXTRA_CAP,
    Math.max(0, totwGames(row) - TOTW_GP_REF),
  );
  return 1 + TOTW_GP_BONUS * extra;
};

/** Counting × TS%/eFG% × availability — extra GP only flips a close call. */
export const totwWeekScore = (row: NightStandout) =>
  totwCountingScore(row.game.stats) *
  totwEfficiencyIndex(row.game.stats) *
  totwAvailabilityIndex(row);

/** @deprecated alias — same as totwWeekScore so existing calls rank on efficiency. */
export const totwProductionScore = totwWeekScore;

const rankTotwBest = (left: NightStandout, right: NightStandout) => {
  const week = totwWeekScore(right) - totwWeekScore(left);
  if (week) {
    return week;
  }
  const counting =
    totwCountingScore(right.game.stats) - totwCountingScore(left.game.stats);
  if (counting) {
    return counting;
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

type RowCompare = (left: NightStandout, right: NightStandout) => number;

const rankStandoutBest: RowCompare = (left, right) =>
  plusOverExpectation(right) - plusOverExpectation(left) ||
  right.score - left.score;

/** Guards, then forwards, then center — PG before SG, SF before PF. Never a big in slot 1 when a guard remains. */
export const orderPlusLineup = (
  rows: NightStandout[],
  compare: RowCompare = rankTotwBest,
  count = PLUS_STARTER_COUNT,
) => {
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
    return compare(left, right);
  };
  byGroup.G.sort(byListedSlot);
  byGroup.F.sort(byListedSlot);
  byGroup.C.sort(compare);
  return [...byGroup.G, ...byGroup.F, ...byGroup.C].slice(0, count);
};

const pickQuotaThenOrder = (
  rows: NightStandout[],
  compare: RowCompare,
  count = PLUS_STARTER_COUNT,
) => {
  const counts: Record<PlayerPositionGroup, number> = { G: 0, F: 0, C: 0 };
  const picked: NightStandout[] = [];
  const used = new Set<string>();
  const take = (row: NightStandout, honorQuota: boolean) => {
    if (picked.length >= count || used.has(row.athleteId)) {
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
  const fillFrom = (honorQuota: boolean) => {
    for (const row of [...rows].sort(compare)) {
      take(row, honorQuota);
    }
  };
  fillFrom(true);
  fillFrom(false);
  return orderPlusLineup(picked, compare, count);
};

/**
 * Best week score, rough mix — not a 2G/2F/1C quota. Never swap a worse
 * guard over a better forward just to have a G (Luka/White cannot take
 * Tatum or Brown’s seat). Then pack G → F → C among whoever made the five.
 */
const pickRoughMixThenOrder = (
  rows: NightStandout[],
  compare: RowCompare,
  count = PLUS_STARTER_COUNT,
) => {
  const ranked = [...rows].sort(compare);
  const counts: Record<PlayerPositionGroup, number> = { G: 0, F: 0, C: 0 };
  const picked: NightStandout[] = [];
  const used = new Set<string>();
  const groupOf = (row: NightStandout) =>
    plusLineupGroup(getPlayer(row.athleteId));
  const take = (row: NightStandout) => {
    if (picked.length >= count || used.has(row.athleteId)) {
      return;
    }
    const group = groupOf(row);
    if (!group) {
      return;
    }
    picked.push(row);
    used.add(row.athleteId);
    counts[group] += 1;
  };
  for (const row of ranked) {
    const group = groupOf(row);
    if (!group || counts[group] >= TOTW_GROUP_SOFT_MAX) {
      continue;
    }
    take(row);
    if (picked.length >= count) {
      break;
    }
  }
  for (const row of ranked) {
    if (picked.length >= count) {
      break;
    }
    take(row);
  }
  if (counts.C === 0) {
    const candidate = ranked.find(
      (row) => !used.has(row.athleteId) && groupOf(row) === "C",
    );
    let victimIndex = -1;
    if (candidate) {
      for (let index = 0; index < picked.length; index += 1) {
        const group = groupOf(picked[index]!);
        if (!group || counts[group] < 2) {
          continue;
        }
        if (
          victimIndex < 0 ||
          compare(picked[index]!, picked[victimIndex]!) > 0
        ) {
          victimIndex = index;
        }
      }
    }
    if (candidate && victimIndex >= 0) {
      const victim = picked[victimIndex]!;
      const victimGroup = groupOf(victim);
      if (victimGroup) {
        picked[victimIndex] = candidate;
        used.delete(victim.athleteId);
        used.add(candidate.athleteId);
        counts[victimGroup] -= 1;
        counts.C += 1;
      }
    }
  }
  return orderPlusLineup(picked, compare, count);
};

/** Guards, then forwards, then center — PG before SG, SF before PF. Never a forward left of a guard. */
export const orderPlusStarters = (rows: NightStandout[]) =>
  orderPlusLineup(rows, rankTotwBest);

/** Best week by score, rough mix (not a 2G/2F/1C quota), then pack PG → C. */
export const selectPlusStarters = (rows: NightStandout[]) =>
  pickRoughMixThenOrder(qualifyTotwRows(rows), rankTotwBest);

/** Surprise / over-expectation non-stars, then packed PG → C — a C cannot sit in slot 1. */
export const selectPlusStandouts = (
  rows: NightStandout[],
  starterIds: ReadonlySet<string>,
) =>
  pickQuotaThenOrder(
    qualifyTotwRows(rows).filter((row) => {
      if (starterIds.has(row.athleteId) || isPlusStar(row.athleteId)) {
        return false;
      }
      const extra = nightFlagsFor(row.game.stats);
      return isSurpriseNight(extra, usualLineFor(row.athleteId));
    }),
    rankStandoutBest,
    PLUS_STANDOUT_COUNT,
  );

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

const totwPickerMeta = (row: NightStandout) => {
  const { ts, efg, fga } = totwShooting(row.game.stats);
  const bits = [row.line];
  if (fga >= TOTW_MIN_FGA && ts != null) {
    bits.push(`${Math.round(ts * 100)}% TS`);
  } else if (fga >= TOTW_MIN_FGA && efg != null) {
    bits.push(`${Math.round(efg * 100)}% eFG`);
  }
  bits.push(`${totwGames(row)} GP`);
  return bits.join(" · ");
};

export const totwPickerSlotLabel = (slotIndex: number) =>
  PLUS_LINEUP_SLOTS[slotIndex % PLUS_STARTER_COUNT] ?? "PG";

const isStandoutPickerSlot = (slotIndex: number) =>
  slotIndex >= PLUS_STARTER_COUNT;

/** Remaining players ranked the same way as Fill, positional on PG–C slots. */
export const totwPickerSuggestions = (
  rows: NightStandout[],
  slotIndex: number,
  usedIds: ReadonlySet<string>,
) => {
  const slot = totwPickerSlotLabel(slotIndex);
  const standoutSlot = isStandoutPickerSlot(slotIndex);
  const starterIds = new Set(
    selectPlusStarters(rows).map((row) => row.athleteId),
  );
  const eligible = qualifyTotwRows(rows).filter((row) => {
    if (usedIds.has(row.athleteId)) {
      return false;
    }
    if (!standoutSlot) {
      return true;
    }
    if (starterIds.has(row.athleteId) || isPlusStar(row.athleteId)) {
      return false;
    }
    return isSurpriseNight(
      nightFlagsFor(row.game.stats),
      usualLineFor(row.athleteId),
    );
  });
  const compare = standoutSlot ? rankStandoutBest : rankTotwBest;
  const take = (loose: boolean) =>
    eligible
      .filter((row) =>
        plusLineupSlotMatches(getPlayer(row.athleteId), slot, loose),
      )
      .sort(compare);
  const picked: NightStandout[] = [];
  const seen = new Set<string>();
  for (const row of [...take(false), ...take(true)]) {
    if (seen.has(row.athleteId)) {
      continue;
    }
    seen.add(row.athleteId);
    picked.push(row);
    if (picked.length >= TOTW_PICKER_LIMIT) {
      break;
    }
  }
  return picked.map((row, index) => ({
    id: row.athleteId,
    badge: index === 0 ? `Best ${slot}` : slot,
    meta: totwPickerMeta(row),
  }));
};

export const totwPickerHeading = (slotIndex: number) => {
  const label = totwPickerSlotLabel(slotIndex);
  if (isStandoutPickerSlot(slotIndex)) {
    return `Best remaining standout ${label}`;
  }
  return `Best remaining for ${label}`;
};

export const totwPickerEmpty = (slotIndex: number) => {
  const label = totwPickerSlotLabel(slotIndex);
  if (isStandoutPickerSlot(slotIndex)) {
    return `No other surprise ${label}s with 2+ games in this range.`;
  }
  return `No other ${label}s with 2+ games in this range.`;
};
