import { normalizeComposerTitle } from "../instagramComposer/titleLayout";
import {
  applyPlayerPick,
  clearStrip,
  createEmptyStrip,
  hasCustomPhoto,
  isTotwStrip,
  patchStrip,
  setStripPhoto,
  usedPlayerIds,
  type TotwStrip,
} from "../teamOfTheWeekComposer/teamOfTheWeekState";
import type { TierPlayer } from "../tierListComposer/nbaActivePlayers";
import { PYRAMID_SLOT_COUNT } from "./pyramidLayout";

export {
  hasCustomPhoto,
  patchStrip,
  setStripPhoto,
  type TotwStrip as PyramidSlot,
};

export const DEFAULT_PYRAMID_TITLE = "NBA COY PYRAMID";
export const PYRAMID_TITLE_TRACK = 0.04;

export interface PyramidDraft {
  title: string;
  slots: TotwStrip[];
  showBa?: boolean;
}

export const createEmptyPyramidSlots = (): TotwStrip[] =>
  Array.from({ length: PYRAMID_SLOT_COUNT }, createEmptyStrip);

export const isPyramidDraft = (value: unknown): value is PyramidDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as PyramidDraft).title === "string" &&
      Array.isArray((value as PyramidDraft).slots) &&
      (value as PyramidDraft).slots.length === PYRAMID_SLOT_COUNT &&
      (value as PyramidDraft).slots.every(isTotwStrip),
  );

export const defaultPyramidDraft = (): PyramidDraft => ({
  title: DEFAULT_PYRAMID_TITLE,
  slots: createEmptyPyramidSlots(),
  showBa: true,
});

export const applyPyramidPick = (
  slots: TotwStrip[],
  index: number,
  player: TierPlayer,
  keepCustomPhoto = false,
): TotwStrip[] => {
  const padded =
    slots.length === PYRAMID_SLOT_COUNT
      ? slots
      : [...slots, ...createEmptyPyramidSlots()].slice(0, PYRAMID_SLOT_COUNT);
  return applyPlayerPick(padded, index, player, keepCustomPhoto);
};

export const clearPyramidSlot = (slots: TotwStrip[], index: number) =>
  clearStrip(slots, index);

export const usedPyramidPlayerIds = (slots: TotwStrip[]) => {
  const used = usedPlayerIds(slots);
  const labeled: Record<string, string> = {};
  Object.entries(used).forEach(([id, label]) => {
    labeled[id] = label.replace(/^Strip /, "Slot ");
  });
  return labeled;
};

export const pyramidTitle = (title: string) =>
  normalizeComposerTitle(title, DEFAULT_PYRAMID_TITLE);
