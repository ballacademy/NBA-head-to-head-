import { splitBalancedTitle } from "../instagramComposer/titleLayout";

export const SLOT_COUNT = 15;

export type RankingSlots = Array<string | null>;

export const createEmptySlots = (): RankingSlots =>
  Array.from({ length: SLOT_COUNT }, () => null);

export const isRankingSlots = (value: unknown): value is RankingSlots =>
  Array.isArray(value) &&
  value.length === SLOT_COUNT &&
  value.every((slot) => slot === null || typeof slot === "string");

export const usedTeamIds = (slots: RankingSlots): Set<string> => {
  const used = new Set<string>();
  for (const id of slots) {
    if (id) {
      used.add(id);
    }
  }
  return used;
};

export const slotIndexForTeam = (
  slots: RankingSlots,
  teamId: string,
): number => slots.indexOf(teamId);

/** Place a team in a slot. If it already occupies another slot, it moves. */
export const assignTeam = (
  slots: RankingSlots,
  index: number,
  teamId: string,
): RankingSlots => {
  if (index < 0 || index >= SLOT_COUNT) {
    return slots;
  }
  const next = slots.slice();
  const previous = next.indexOf(teamId);
  if (previous >= 0 && previous !== index) {
    next[previous] = null;
  }
  next[index] = teamId;
  return next;
};

export const clearSlot = (slots: RankingSlots, index: number): RankingSlots => {
  if (index < 0 || index >= SLOT_COUNT) {
    return slots;
  }
  const next = slots.slice();
  next[index] = null;
  return next;
};

export const GRAPHIC_WIDTH = 1200;
export const GRAPHIC_HEIGHT = 1500;
export const GRAPHIC_ASPECT = GRAPHIC_WIDTH / GRAPHIC_HEIGHT;

export const EXPORT_PIXEL_RATIO = 2;
export const EXPORT_WIDTH = GRAPHIC_WIDTH * EXPORT_PIXEL_RATIO;
export const EXPORT_HEIGHT = GRAPHIC_HEIGHT * EXPORT_PIXEL_RATIO;

export const DEFAULT_BRAND = "BALLACADEMY";
export const DEFAULT_TITLE = "PROJECTED NBA STANDINGS";
export const DEFAULT_SUBTITLE = "EASTERN CONFERENCE";
/** Two-line banner title in 1200-wide board units. */
export const STANDINGS_TITLE_SIZE = 34;
export const STANDINGS_TITLE_TRACK = 0.02;

export const splitStandingsTitle = (title: string): string[] =>
  splitBalancedTitle(title, DEFAULT_TITLE, STANDINGS_TITLE_TRACK);

export const EMPTY_SLOT_COLOR = "#8d8d8d";
/** Graphic canvas / header field — near-black, no grain. */
export const GRAPHIC_BG = "#0B0B0B";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export const exportFilename = (subtitle: string, title: string) => {
  const fromSub = slugify(subtitle);
  const fromTitle = slugify(title);
  const stem = fromSub || fromTitle || "nba-standings";
  return `${stem}.png`;
};
