import { normalizeComposerTitle } from "../instagramComposer/titleLayout";

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

export const LAST_WEEK_STORAGE_KEY = "ddgm:standings-composer:last-week";

/**
 * Positive = moved up vs last week. Zero = same rank.
 * Null when there is no snapshot or the team was not in last week (missing ≠ unchanged).
 */
export const lastWeekDelta = (
  slots: RankingSlots,
  previous: RankingSlots | null | undefined,
  index: number,
): number | null => {
  const teamId = slots[index];
  if (!teamId || !previous) {
    return null;
  }
  const prior = previous.indexOf(teamId);
  if (prior < 0) {
    return null;
  }
  return prior - index;
};

export const lastWeekMark = (delta: number | null) => {
  if (delta == null) {
    return null;
  }
  if (delta === 0) {
    return {
      kind: "same" as const,
      text: "=",
      label: "Same rank as last week",
    };
  }
  if (delta > 0) {
    return {
      kind: "up" as const,
      text: `▲${delta}`,
      label: `Up ${delta} from last week`,
    };
  }
  return {
    kind: "down" as const,
    text: `▼${Math.abs(delta)}`,
    label: `Down ${Math.abs(delta)} from last week`,
  };
};

export interface StandingRecord {
  wins: number;
  losses: number;
}

export const formatStandingRecord = (
  record: StandingRecord | null | undefined,
) => {
  if (!record) {
    return null;
  }
  return `${record.wins}–${record.losses}`;
};

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

/** Bake CSS `text-transform: uppercase` into PNG pixels. */
export const standingsBrandLabel = (brand: string) =>
  normalizeComposerTitle(brand, DEFAULT_BRAND);
export const standingsSubtitleLabel = (subtitle: string) =>
  normalizeComposerTitle(subtitle, DEFAULT_SUBTITLE);
/** Single-line banner title in 1200-wide board units (pre-wrap size). */
export const STANDINGS_TITLE_SIZE = 50;
export const STANDINGS_TITLE_TRACK = 0.02;

export const splitStandingsTitle = (title: string): string[] => [
  normalizeComposerTitle(title, DEFAULT_TITLE),
];

export const EMPTY_SLOT_COLOR = "#8d8d8d";
/** Shared near-black field for other composers. */
export const GRAPHIC_BG = "#0B0B0B";
/** Standings board / header — modest lift from GRAPHIC_BG. */
export const STANDINGS_BOARD_BG = "#161616";

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
