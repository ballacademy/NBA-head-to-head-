import {
  clampPan,
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
  isPhotoPan,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import type { LastGame } from "../playerOfTheDayComposer/lastGame";
import { getTeam } from "../standingsComposer/teams";
import {
  hasCustomPhoto as stripHasCustomPhoto,
  splitPlayerName,
  type TotwStrip,
} from "../teamOfTheWeekComposer/teamOfTheWeekState";
import type { TierPlayer } from "../tierListComposer/nbaActivePlayers";

export { clampPan, type PhotoPan };

export const DEFAULT_COMPARE_TITLE = "NOT A SIXTH MAN";
export const DEFAULT_COMPARE_SUBTITLE = "CAREER START VS CAREER BENCH APPEARANCES";
export const DEFAULT_STATS_LABEL = "CAREER STATS";
export const COMPARE_STAT_COUNT = 5;

export interface CompareStat {
  label: string;
  left: string;
  right: string;
}

export interface CompareSide {
  playerId: string | null;
  teamId: string | null;
  firstName: string;
  lastName: string;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
}

export interface CompareDraft {
  title: string;
  subtitle: string;
  statsLabel: string;
  sides: [CompareSide, CompareSide];
  stats: CompareStat[];
  showBa?: boolean;
}

const isNullableString = (value: unknown) =>
  typeof value === "string" || value === null;

export const emptyCompareSide = (): CompareSide => ({
  playerId: null,
  teamId: null,
  firstName: "",
  lastName: "",
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_CUSTOM_PAN },
});

export const defaultCompareStats = (): CompareStat[] => [
  { label: "PTS", left: "", right: "" },
  { label: "FG%", left: "", right: "" },
  { label: "3P%", left: "", right: "" },
  { label: "REB", left: "", right: "" },
  { label: "AST", left: "", right: "" },
];

export const isCompareSide = (value: unknown): value is CompareSide =>
  Boolean(
    value &&
      typeof value === "object" &&
      isNullableString((value as CompareSide).playerId) &&
      isNullableString((value as CompareSide).teamId) &&
      typeof (value as CompareSide).firstName === "string" &&
      typeof (value as CompareSide).lastName === "string" &&
      isNullableString((value as CompareSide).photoSrc) &&
      typeof (value as CompareSide).customPhoto === "boolean" &&
      isPhotoPan((value as CompareSide).pan),
  );

export const isCompareDraft = (value: unknown): value is CompareDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as CompareDraft).title === "string" &&
      typeof (value as CompareDraft).subtitle === "string" &&
      typeof (value as CompareDraft).statsLabel === "string" &&
      Array.isArray((value as CompareDraft).sides) &&
      (value as CompareDraft).sides.length === 2 &&
      (value as CompareDraft).sides.every(isCompareSide) &&
      Array.isArray((value as CompareDraft).stats),
  );

export const defaultCompareDraft = (): CompareDraft => ({
  title: DEFAULT_COMPARE_TITLE,
  subtitle: DEFAULT_COMPARE_SUBTITLE,
  statsLabel: DEFAULT_STATS_LABEL,
  sides: [emptyCompareSide(), emptyCompareSide()],
  stats: defaultCompareStats(),
  showBa: true,
});

export const hasCustomPhoto = (side: CompareSide) =>
  stripHasCustomPhoto(side as unknown as TotwStrip);

const pctFromMakes = (value: string) => {
  const match = value.trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) {
    return value;
  }
  const made = Number(match[1]);
  const att = Number(match[2]);
  if (!att) {
    return "0.0";
  }
  return ((made / att) * 100).toFixed(1);
};

export const statsFromLastGame = (game: LastGame | null): string[] => {
  if (!game) {
    return ["", "", "", "", ""];
  }
  return [
    game.stats.pts,
    pctFromMakes(game.stats.fg),
    pctFromMakes(game.stats.three),
    game.stats.reb,
    game.stats.ast,
  ];
};

export const fillCompareSide = (
  player: TierPlayer,
  previous: CompareSide,
  keepCustomPhoto = false,
): CompareSide => {
  const names = splitPlayerName(player.name);
  const keep = keepCustomPhoto && hasCustomPhoto(previous);
  return {
    playerId: player.id,
    teamId: getTeam(player.team)?.id ?? player.team,
    firstName: names.firstName,
    lastName: names.lastName,
    photoSrc: keep ? previous.photoSrc : player.headshotUrl,
    customPhoto: keep,
    pan: keep ? { ...previous.pan } : { ...DEFAULT_HEADSHOT_PAN },
  };
};

export const setComparePhoto = (
  side: CompareSide,
  dataUrl: string,
): CompareSide => ({
  ...side,
  photoSrc: dataUrl,
  customPhoto: true,
  pan: { ...DEFAULT_CUSTOM_PAN },
});

export const clearCompareSide = (): CompareSide => emptyCompareSide();

export const patchCompareStat = (
  stats: CompareStat[],
  index: number,
  patch: Partial<CompareStat>,
) =>
  stats.map((stat, statIndex) =>
    statIndex === index ? { ...stat, ...patch } : stat,
  );
