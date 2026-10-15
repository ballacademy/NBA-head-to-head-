import type { NightStandout } from "../playerOfTheDayComposer/nightStandouts";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
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
  showNames: true,
});

export const plusBoardEmpty = (slots: TotwStrip[]) =>
  slots.every((slot) => !slot.playerId);

export const fillPlusFromStandouts = (
  slots: TotwStrip[],
  rows: NightStandout[],
  starters: TotwStrip[] = [],
): TotwStrip[] => {
  const previousById = new Map<string, TotwStrip>();
  for (const slot of [...slots, ...starters]) {
    if (slot.playerId) {
      previousById.set(slot.playerId, slot);
    }
  }
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
  for (const strip of starters) {
    if (strip.playerId) {
      take(strip.playerId);
    }
  }
  for (const row of rows) {
    take(row.athleteId);
  }
  return next;
};
