import { normalizeComposerTitle } from "../instagramComposer/titleLayout";
import {
  DEFAULT_HEADSHOT_PAN,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
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
import {
  clampPyramidRows,
  pyramidSlotCount,
  PYR_DEFAULT_ROWS,
  PYR_MAX_ROWS,
  PYR_MIN_ROWS,
} from "./pyramidLayout";

export {
  hasCustomPhoto,
  patchStrip,
  setStripPhoto,
  type TotwStrip as PyramidSlot,
};

export const DEFAULT_PYRAMID_TITLE = "NBA COY PYRAMID";
export const PYRAMID_TITLE_TRACK = 0.04;
export const PYRAMID_HEADSHOT_PAN: PhotoPan = {
  x: 0.5,
  y: 0.28,
  zoom: 1.08,
  rotate: 0,
};

export interface PyramidDraft {
  title: string;
  slots: TotwStrip[];
  rows?: number;
  showBa?: boolean;
}

export const parsePyramidRows = (
  value: unknown,
  slotCount?: number,
): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampPyramidRows(value);
  }
  if (slotCount === pyramidSlotCount(5)) {
    return 5;
  }
  if (slotCount === pyramidSlotCount(6)) {
    return 6;
  }
  return PYR_DEFAULT_ROWS;
};

export const createEmptyPyramidSlots = (
  rowCount = PYR_DEFAULT_ROWS,
): TotwStrip[] =>
  Array.from({ length: pyramidSlotCount(rowCount) }, createEmptyStrip);

export const resizePyramidSlots = (
  slots: TotwStrip[],
  rowCount: number,
): TotwStrip[] => {
  const next = pyramidSlotCount(rowCount);
  if (slots.length === next) {
    return slots;
  }
  if (slots.length > next) {
    return slots.slice(0, next);
  }
  return [
    ...slots,
    ...Array.from({ length: next - slots.length }, createEmptyStrip),
  ];
};

export const isPyramidDraft = (value: unknown): value is PyramidDraft => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const draft = value as PyramidDraft;
  if (typeof draft.title !== "string" || !Array.isArray(draft.slots)) {
    return false;
  }
  const rows = parsePyramidRows(draft.rows, draft.slots.length);
  return (
    draft.slots.length === pyramidSlotCount(rows) &&
    draft.slots.every(isTotwStrip)
  );
};

export const defaultPyramidDraft = (): PyramidDraft => ({
  title: DEFAULT_PYRAMID_TITLE,
  slots: createEmptyPyramidSlots(PYR_DEFAULT_ROWS),
  rows: PYR_DEFAULT_ROWS,
  showBa: true,
});

export const applyPyramidPick = (
  slots: TotwStrip[],
  index: number,
  player: TierPlayer,
  keepCustomPhoto = false,
): TotwStrip[] => {
  const next = applyPlayerPick(slots, index, player, keepCustomPhoto);
  if (keepCustomPhoto) {
    return next;
  }
  return patchStrip(next, index, { pan: { ...PYRAMID_HEADSHOT_PAN } });
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

export { PYR_MIN_ROWS, PYR_MAX_ROWS, PYR_DEFAULT_ROWS, DEFAULT_HEADSHOT_PAN };
