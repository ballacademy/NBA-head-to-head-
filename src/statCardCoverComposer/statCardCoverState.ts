import {
  DEFAULT_COMPOSER_WATERMARK,
  parseComposerWatermark,
  type ComposerWatermark,
} from "../instagramComposer/composerWatermark";
import { nbaTodayIso, shiftIsoDate, isoDateOnly } from "../playerOfTheDayComposer/lastGame";
import type { NightStandout } from "../playerOfTheDayComposer/nightStandouts";
import {
  clampPan,
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
  isPhotoPan,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { splitPlayerName } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import { getPlayer, type TierPlayer } from "../tierListComposer/nbaActivePlayers";
import { SCC_SLOT_COUNT } from "./statCardCoverLayout";

export { clampPan, type PhotoPan, SCC_SLOT_COUNT };

export const SCC_TITLE_MAX = 48;
export const SCC_DATE_MAX = 24;
export const DEFAULT_COVER_TITLE = "STARS AND STANDOUTS";
export const AUTO_COVER_TITLES = new Set([
  "TONIGHT",
  "LAST NIGHT",
  "STANDOUTS",
  DEFAULT_COVER_TITLE,
]);

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export interface CoverSlot {
  playerId: string | null;
  teamId: string | null;
  firstName: string;
  lastName: string;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
}

export interface StatCardCoverDraft {
  brand: string;
  title: string;
  dateLine: string;
  gameDate: string;
  slots: CoverSlot[];
  showBa?: boolean;
  watermark?: ComposerWatermark;
}

const isNullableString = (value: unknown) =>
  typeof value === "string" || value === null;

export const isCoverSlot = (value: unknown): value is CoverSlot =>
  Boolean(
    value &&
      typeof value === "object" &&
      isNullableString((value as CoverSlot).playerId) &&
      isNullableString((value as CoverSlot).teamId) &&
      typeof (value as CoverSlot).firstName === "string" &&
      typeof (value as CoverSlot).lastName === "string" &&
      isNullableString((value as CoverSlot).photoSrc) &&
      typeof (value as CoverSlot).customPhoto === "boolean" &&
      isPhotoPan((value as CoverSlot).pan),
  );

export const isStatCardCoverDraft = (
  value: unknown,
): value is StatCardCoverDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as StatCardCoverDraft).brand === "string" &&
      typeof (value as StatCardCoverDraft).title === "string" &&
      typeof (value as StatCardCoverDraft).dateLine === "string" &&
      typeof (value as StatCardCoverDraft).gameDate === "string" &&
      Array.isArray((value as StatCardCoverDraft).slots) &&
      (value as StatCardCoverDraft).slots.every(isCoverSlot),
  );

export const emptyCoverSlot = (): CoverSlot => ({
  playerId: null,
  teamId: null,
  firstName: "",
  lastName: "",
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_HEADSHOT_PAN },
});

export const emptyCoverSlots = (): CoverSlot[] =>
  Array.from({ length: SCC_SLOT_COUNT }, emptyCoverSlot);

export const coverTitleForNight = (
  _date?: string,
  _todayIso?: string,
  _yesterdayIso?: string,
) => DEFAULT_COVER_TITLE;

export const splitCoverTitle = (title: string) => {
  const text =
    title.replace(/\s+/g, " ").trim().toUpperCase() || DEFAULT_COVER_TITLE;
  if (text === DEFAULT_COVER_TITLE) {
    return ["STARS AND", "STANDOUTS"];
  }
  return splitBalancedTitle(text, DEFAULT_COVER_TITLE);
};

export const coverDateLine = (iso: string) => {
  const token = isoDateOnly(iso);
  const match = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "";
  }
  const month = MONTHS[Number(match[2]) - 1] ?? "";
  return `${month} ${Number(match[3])}`;
};

export const isAutoCoverTitle = (title: string) =>
  AUTO_COVER_TITLES.has(title.replace(/\s+/g, " ").trim().toUpperCase());

export const defaultStatCardCoverDraft = (
  now = new Date(),
): StatCardCoverDraft => {
  const today = nbaTodayIso(now);
  return {
    brand: DEFAULT_BRAND,
    title: DEFAULT_COVER_TITLE,
    dateLine: coverDateLine(today),
    gameDate: today,
    slots: emptyCoverSlots(),
    showBa: true,
    watermark: DEFAULT_COMPOSER_WATERMARK,
  };
};

export const normalizeStatCardCoverDraft = (
  draft: StatCardCoverDraft,
): StatCardCoverDraft => {
  const slots = [...draft.slots.slice(0, SCC_SLOT_COUNT)];
  while (slots.length < SCC_SLOT_COUNT) {
    slots.push(emptyCoverSlot());
  }
  return {
    ...draft,
    brand: draft.brand.trim() || DEFAULT_BRAND,
    title: (isAutoCoverTitle(draft.title)
      ? DEFAULT_COVER_TITLE
      : draft.title.replace(/\s+/g, " ").trim()
    ).slice(0, SCC_TITLE_MAX),
    dateLine: draft.dateLine.replace(/\s+/g, " ").trim().slice(0, SCC_DATE_MAX),
    gameDate: isoDateOnly(draft.gameDate) || nbaTodayIso(),
    slots,
    showBa: draft.showBa !== false,
    watermark: parseComposerWatermark(draft.watermark),
  };
};

export const hasCustomPhoto = (slot: CoverSlot) =>
  Boolean(slot.customPhoto && slot.photoSrc);

export const coverSlotName = (slot: CoverSlot) =>
  `${slot.firstName} ${slot.lastName}`.replace(/\s+/g, " ").trim();

export const fillCoverSlotFromPlayer = (
  player: TierPlayer,
  previous?: CoverSlot,
  keepCustomPhoto = false,
): CoverSlot => {
  const names = splitPlayerName(player.name);
  const keep = keepCustomPhoto && previous ? hasCustomPhoto(previous) : false;
  return {
    playerId: player.id,
    teamId: getTeam(player.team)?.id ?? player.team,
    firstName: names.firstName,
    lastName: names.lastName,
    photoSrc: keep ? previous!.photoSrc : player.headshotUrl,
    customPhoto: keep,
    pan: keep ? { ...previous!.pan } : { ...DEFAULT_HEADSHOT_PAN },
  };
};

export const setCoverSlotPhoto = (slot: CoverSlot, dataUrl: string): CoverSlot => ({
  ...slot,
  photoSrc: dataUrl,
  customPhoto: true,
  pan: { ...DEFAULT_CUSTOM_PAN },
});

export const patchCoverSlot = (
  slots: CoverSlot[],
  index: number,
  patch: Partial<CoverSlot>,
): CoverSlot[] => {
  if (index < 0 || index >= slots.length) {
    return slots;
  }
  return slots.map((slot, slotIndex) =>
    slotIndex === index
      ? {
          ...slot,
          ...patch,
          pan: patch.pan ? clampPan(patch.pan) : slot.pan,
        }
      : slot,
  );
};

export const setCoverSlotPhotoAt = (
  slots: CoverSlot[],
  index: number,
  dataUrl: string,
) => patchCoverSlot(slots, index, setCoverSlotPhoto(slots[index] ?? emptyCoverSlot(), dataUrl));

export const setCoverSlotPlayer = (
  slots: CoverSlot[],
  index: number,
  player: TierPlayer,
  keepCustomPhoto = false,
) =>
  slots.map((slot, slotIndex) =>
    slotIndex === index
      ? fillCoverSlotFromPlayer(player, slot, keepCustomPhoto)
      : slot,
  );

export const clearCoverSlot = (slots: CoverSlot[], index: number) => {
  if (index < 0 || index >= slots.length) {
    return slots;
  }
  return slots.map((slot, slotIndex) =>
    slotIndex === index ? emptyCoverSlot() : slot,
  );
};

export const usedCoverPlayerIds = (slots: CoverSlot[]) => {
  const used: Record<string, string> = {};
  slots.forEach((slot, index) => {
    if (slot.playerId) {
      used[slot.playerId] = `Cover ${index + 1}`;
    }
  });
  return used;
};

export const applyCoverNight = (
  draft: StatCardCoverDraft,
  iso: string,
  todayIso = nbaTodayIso(),
  yesterdayIso = shiftIsoDate(todayIso, -1),
): StatCardCoverDraft => {
  const nextDate = isoDateOnly(iso) || todayIso;
  const autoTitle = isAutoCoverTitle(draft.title);
  const autoDate =
    !draft.dateLine.trim() ||
    draft.dateLine.trim().toUpperCase() === coverDateLine(draft.gameDate);
  return {
    ...draft,
    gameDate: nextDate,
    title: autoTitle ? DEFAULT_COVER_TITLE : draft.title,
    dateLine: autoDate ? coverDateLine(nextDate) : draft.dateLine,
  };
};

/** Ranked standouts already sorted — take the first four faces. */
export const fillCoverFromStandouts = (
  draft: StatCardCoverDraft,
  rows: NightStandout[],
): StatCardCoverDraft => {
  const previousById = new Map<string, CoverSlot>();
  for (const slot of draft.slots) {
    if (slot.playerId) {
      previousById.set(slot.playerId, slot);
    }
  }
  const slots = Array.from({ length: SCC_SLOT_COUNT }, (_, index) => {
    const row = rows[index];
    if (!row) {
      return emptyCoverSlot();
    }
    const player = getPlayer(row.athleteId);
    if (!player) {
      return emptyCoverSlot();
    }
    const previous = previousById.get(player.id);
    const keep = Boolean(previous && hasCustomPhoto(previous));
    return fillCoverSlotFromPlayer(player, previous, keep);
  });
  return { ...draft, slots };
};

export const coverSlotNames = (draft: StatCardCoverDraft) =>
  draft.slots.map(coverSlotName).filter(Boolean);
