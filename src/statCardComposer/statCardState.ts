import type { LastGame, LastGameStats } from "../playerOfTheDayComposer/lastGame";
import {
  clampPan,
  DEFAULT_CUSTOM_PAN,
  isPhotoPan,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { getTeam } from "../standingsComposer/teams";
import {
  hasCustomPhoto as stripHasCustomPhoto,
  splitPlayerName,
  type TotwStrip,
} from "../teamOfTheWeekComposer/teamOfTheWeekState";
import type { TierPlayer } from "../tierListComposer/nbaActivePlayers";

export { clampPan, type PhotoPan };

export const STC_VALUE_MAX = 8;
export const STC_LABEL_MAX = 6;
export const STC_NAME_MAX = 32;
export const STC_STAT_COUNT = 4;

export interface StatCardLine {
  key: "pts" | "reb" | "ast" | "three" | "stl" | "blk" | "fg";
  label: string;
  value: string;
}

export interface StatCardDraft {
  firstName: string;
  lastName: string;
  playerId: string | null;
  teamId: string | null;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
  stats: StatCardLine[];
  showBa?: boolean;
}

export const DEFAULT_STAT_LINES: StatCardLine[] = [
  { key: "pts", label: "PTS", value: "" },
  { key: "reb", label: "REB", value: "" },
  { key: "ast", label: "AST", value: "" },
  { key: "three", label: "3PM", value: "" },
];

const isLine = (value: unknown): value is StatCardLine =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as StatCardLine).label === "string" &&
      typeof (value as StatCardLine).value === "string" &&
      typeof (value as StatCardLine).key === "string",
  );

const isNullableString = (value: unknown) =>
  typeof value === "string" || value === null;

export const isStatCardDraft = (value: unknown): value is StatCardDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as StatCardDraft).firstName === "string" &&
      typeof (value as StatCardDraft).lastName === "string" &&
      isNullableString((value as StatCardDraft).playerId) &&
      isNullableString((value as StatCardDraft).teamId) &&
      isNullableString((value as StatCardDraft).photoSrc) &&
      typeof (value as StatCardDraft).customPhoto === "boolean" &&
      isPhotoPan((value as StatCardDraft).pan) &&
      Array.isArray((value as StatCardDraft).stats) &&
      (value as StatCardDraft).stats.every(isLine),
  );

export const defaultStatCardDraft = (): StatCardDraft => ({
  firstName: "",
  lastName: "",
  playerId: null,
  teamId: null,
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_CUSTOM_PAN },
  stats: DEFAULT_STAT_LINES.map((line) => ({ ...line })),
  showBa: true,
});

export const hasCustomPhoto = (draft: StatCardDraft) =>
  stripHasCustomPhoto(draft as unknown as TotwStrip);

export const playerName = (draft: Pick<StatCardDraft, "firstName" | "lastName">) =>
  `${draft.firstName} ${draft.lastName}`.replace(/\s+/g, " ").trim();

export const applyPlayerName = (draft: StatCardDraft, value: string): StatCardDraft => {
  const names = splitPlayerName(value.slice(0, STC_NAME_MAX));
  return { ...draft, firstName: names.firstName, lastName: names.lastName };
};

export const clipStatValue = (value: string) =>
  value.replace(/\s+/g, " ").trim().slice(0, STC_VALUE_MAX);

export const clipStatLabel = (value: string) =>
  value.replace(/\s+/g, " ").trim().toUpperCase().slice(0, STC_LABEL_MAX);

export const setStatCardPhoto = (draft: StatCardDraft, photoSrc: string) => ({
  ...draft,
  photoSrc,
  customPhoto: true,
  pan: { ...DEFAULT_CUSTOM_PAN },
});

export const fillStatCardFromPlayer = (
  player: TierPlayer,
  previous: StatCardDraft,
  keepCustomPhoto = false,
): StatCardDraft => {
  const names = splitPlayerName(player.name);
  const keep = keepCustomPhoto && hasCustomPhoto(previous);
  return {
    ...previous,
    playerId: player.id,
    teamId: getTeam(player.team)?.id ?? player.team,
    firstName: names.firstName,
    lastName: names.lastName,
    photoSrc: keep ? previous.photoSrc : null,
    customPhoto: keep,
    pan: keep ? { ...previous.pan } : { ...DEFAULT_CUSTOM_PAN },
  };
};

export const clearStatCardSubject = (draft: StatCardDraft): StatCardDraft => ({
  ...draft,
  playerId: null,
  firstName: "",
  lastName: "",
  teamId: null,
  photoSrc: hasCustomPhoto(draft) ? draft.photoSrc : null,
  customPhoto: hasCustomPhoto(draft),
});

const valueFromGame = (line: StatCardLine, stats: LastGameStats) => {
  if (line.key === "three") {
    return stats.three;
  }
  if (line.key === "fg") {
    return stats.fg;
  }
  return stats[line.key] ?? line.value;
};

export const fillStatCardFromGame = (
  draft: StatCardDraft,
  game: LastGame | null,
): StatCardDraft => {
  if (!game) {
    return draft;
  }
  return {
    ...draft,
    stats: draft.stats.map((line) => ({
      ...line,
      value: clipStatValue(valueFromGame(line, game.stats)),
    })),
  };
};
