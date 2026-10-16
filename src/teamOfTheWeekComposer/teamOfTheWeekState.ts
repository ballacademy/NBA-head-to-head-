import { storedOrLastShowNames } from "../instagramComposer/composerBoardDefaults";
import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { getPlayer, type TierPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  clampPan,
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
  isPhotoPan,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";

export {
  clampPan,
  DEFAULT_BRAND,
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
  type PhotoPan,
};

export const DEFAULT_TOTW_TITLE = "TEAM OF THE WEEK";
export const TOTW_TITLE_TRACK = 0.02;
export const TOTW_STRIP_COUNT = 5;

export interface TotwStrip {
  playerId: string | null;
  teamId: string | null;
  firstName: string;
  lastName: string;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
}

export interface TotwDraft {
  brand: string;
  title: string;
  week: string;
  strips: TotwStrip[];
  showBa?: boolean;
  showNames?: boolean;
  showTeamHairline?: boolean;
}

export const splitPlayerName = (name: string) => {
  const parts = name.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: "" };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1)!,
  };
};

const padDate = (value: number) => String(value);

const WEEK_MONTHS = [
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

export const weekRangeFor = (now = new Date()) => {
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + mondayOffset,
  );
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 6,
  );
  const stamp = (date: Date) =>
    `${padDate(date.getMonth() + 1)}/${padDate(date.getDate())}`;
  return `${stamp(start)} - ${stamp(end)}`;
};

export const defaultWeekLabel = (now = new Date()) =>
  `WEEK OF ${WEEK_MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

export const createEmptyStrip = (): TotwStrip => ({
  playerId: null,
  teamId: null,
  firstName: "",
  lastName: "",
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_HEADSHOT_PAN },
});

export const createEmptyStrips = (): TotwStrip[] =>
  Array.from({ length: TOTW_STRIP_COUNT }, createEmptyStrip);

export const isTotwStrip = (value: unknown): value is TotwStrip =>
  Boolean(
    value &&
      typeof value === "object" &&
      (typeof (value as TotwStrip).playerId === "string" ||
        (value as TotwStrip).playerId === null) &&
      (typeof (value as TotwStrip).teamId === "string" ||
        (value as TotwStrip).teamId === null) &&
      typeof (value as TotwStrip).firstName === "string" &&
      typeof (value as TotwStrip).lastName === "string" &&
      (typeof (value as TotwStrip).photoSrc === "string" ||
        (value as TotwStrip).photoSrc === null) &&
      typeof (value as TotwStrip).customPhoto === "boolean" &&
      isPhotoPan((value as TotwStrip).pan),
  );

export const isTotwDraft = (value: unknown): value is TotwDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as TotwDraft).brand === "string" &&
      typeof (value as TotwDraft).title === "string" &&
      typeof (value as TotwDraft).week === "string" &&
      Array.isArray((value as TotwDraft).strips) &&
      (value as TotwDraft).strips.length === TOTW_STRIP_COUNT &&
      (value as TotwDraft).strips.every(isTotwStrip),
  );

export const splitTotwTitle = (title: string): string[] =>
  splitBalancedTitle(title, DEFAULT_TOTW_TITLE, TOTW_TITLE_TRACK);

export const hasCustomPhoto = (strip: TotwStrip) =>
  Boolean(strip.customPhoto && strip.photoSrc);

export type StripPlayerPick = Pick<
  TierPlayer,
  "id" | "name" | "team" | "headshotUrl"
>;

export const fillStripFromPlayer = (
  player: StripPlayerPick,
  previous?: TotwStrip,
  keepCustomPhoto = false,
): TotwStrip => {
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

export const applyPlayerPick = (
  strips: TotwStrip[],
  index: number,
  player: StripPlayerPick,
  keepCustomPhoto = false,
): TotwStrip[] => {
  if (index < 0 || index >= strips.length) {
    return strips;
  }
  const next = strips.map((strip, stripIndex) =>
    stripIndex === index
      ? fillStripFromPlayer(player, strip, keepCustomPhoto)
      : { ...strip },
  );
  const pickedId = player.id;
  return next.map((strip, stripIndex) => {
    if (stripIndex !== index && strip.playerId === pickedId) {
      return createEmptyStrip();
    }
    return strip;
  });
};

export const clearStrip = (strips: TotwStrip[], index: number): TotwStrip[] => {
  if (index < 0 || index >= strips.length) {
    return strips;
  }
  const next = strips.slice();
  next[index] = createEmptyStrip();
  return next;
};

export const patchStrip = (
  strips: TotwStrip[],
  index: number,
  patch: Partial<TotwStrip>,
): TotwStrip[] => {
  if (index < 0 || index >= strips.length) {
    return strips;
  }
  const next = strips.slice();
  const current = next[index]!;
  next[index] = {
    ...current,
    ...patch,
    pan: patch.pan ? clampPan(patch.pan) : current.pan,
  };
  return next;
};

export const setStripPhoto = (
  strips: TotwStrip[],
  index: number,
  dataUrl: string,
): TotwStrip[] =>
  patchStrip(strips, index, {
    photoSrc: dataUrl,
    customPhoto: true,
    pan: { ...DEFAULT_CUSTOM_PAN },
  });

export const usedPlayerIds = (strips: TotwStrip[]) => {
  const used: Record<string, string> = {};
  strips.forEach((strip, index) => {
    if (strip.playerId) {
      used[strip.playerId] = `Strip ${index + 1}`;
    }
  });
  return used;
};

export const stripPlayerName = (strip: TotwStrip) =>
  `${strip.firstName} ${strip.lastName}`.replace(/\s+/g, " ").trim();

export const defaultTotwDraft = (): TotwDraft => ({
  brand: DEFAULT_BRAND,
  title: DEFAULT_TOTW_TITLE,
  week: defaultWeekLabel(),
  strips: createEmptyStrips(),
  showNames: storedOrLastShowNames(undefined, false),
  showTeamHairline: true,
});
