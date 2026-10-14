import type { ComposerStatsSample } from "../instagramComposer/composerStatsSample";
import type { LastGame, LastGameStats } from "../playerOfTheDayComposer/lastGame";
import {
  everyTeamCurrentSeason,
  isPercentStatMetric,
  playerRowForSeason,
  rosterStatValue,
  type EveryTeamStatMetric,
} from "../everyTeamComposer/historicalRosters";
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
export const STC_STAT_COUNT = 3;
export const STC_STAT_MAX = 8;

export type StatCardKey =
  | "pts"
  | "reb"
  | "ast"
  | "min"
  | "blk"
  | "stl"
  | "tov"
  | "three"
  | "fg";
export type StatCardSource = "last-game" | "season";

export interface StatCardLine {
  key: StatCardKey;
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
  source?: StatCardSource;
  season?: string;
  showBa?: boolean;
}

export const STAT_CARD_LINE_OPTIONS: StatCardLine[] = [
  { key: "pts", label: "PTS", value: "" },
  { key: "reb", label: "REB", value: "" },
  { key: "ast", label: "AST", value: "" },
  { key: "min", label: "MIN", value: "" },
  { key: "blk", label: "BLK", value: "" },
  { key: "stl", label: "STL", value: "" },
  { key: "tov", label: "TOV", value: "" },
  { key: "three", label: "3PM", value: "" },
  { key: "fg", label: "FG", value: "" },
];

export const DEFAULT_STAT_LINES: StatCardLine[] = STAT_CARD_LINE_OPTIONS.slice(
  0,
  STC_STAT_COUNT,
).map((line) => ({ ...line }));

const STC_METRIC: Record<StatCardKey, EveryTeamStatMetric> = {
  pts: "points",
  reb: "rebounds",
  ast: "assists",
  min: "minutes",
  blk: "blocks",
  stl: "steals",
  tov: "turnovers",
  fg: "fgPct",
  three: "fg3Pct",
};

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

export const parseStatCardSource = (value: unknown): StatCardSource =>
  value === "season" ? "season" : "last-game";

export const parseStatCardKey = (value: unknown): StatCardKey =>
  STAT_CARD_LINE_OPTIONS.some((line) => line.key === value)
    ? (value as StatCardKey)
    : "pts";

export const defaultStatCardDraft = (): StatCardDraft => ({
  firstName: "",
  lastName: "",
  playerId: null,
  teamId: null,
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_CUSTOM_PAN },
  stats: DEFAULT_STAT_LINES.map((line) => ({ ...line })),
  source: "last-game",
  season: everyTeamCurrentSeason(),
  showBa: true,
});

export const normalizeStatCardDraft = (draft: StatCardDraft): StatCardDraft => ({
  ...draft,
  source: parseStatCardSource(draft.source),
  season:
    typeof draft.season === "string" && draft.season.trim()
      ? draft.season
      : everyTeamCurrentSeason(),
  stats: (draft.stats.length ? draft.stats : DEFAULT_STAT_LINES)
    .slice(0, STC_STAT_MAX)
    .map((line) => ({ ...line })),
  showBa: draft.showBa !== false,
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
  if (line.key === "min") {
    return stats.min || line.value;
  }
  if (line.key === "tov") {
    return stats.tov;
  }
  return stats[line.key] ?? line.value;
};

const seasonLabelFor = (line: StatCardLine): string => {
  if (line.key === "three") {
    return "3P%";
  }
  if (line.key === "fg") {
    return "FG%";
  }
  return line.label;
};

const gameLabelFor = (line: StatCardLine): string => {
  const option = STAT_CARD_LINE_OPTIONS.find((item) => item.key === line.key);
  return option?.label ?? line.label;
};

export const formatStatCardSeasonValue = (
  key: StatCardKey,
  value: number | null,
) => {
  if (value == null) {
    return "";
  }
  const metric = STC_METRIC[key];
  if (isPercentStatMetric(metric)) {
    return (value * 100).toFixed(1);
  }
  return (Math.round(value * 10) / 10).toFixed(1);
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
    source: "last-game",
    stats: draft.stats.map((line) => ({
      ...line,
      label: gameLabelFor(line),
      value: clipStatValue(valueFromGame(line, game.stats)),
    })),
  };
};

export const fillStatCardFromSeason = (
  draft: StatCardDraft,
  season = draft.season || everyTeamCurrentSeason(),
  sample: ComposerStatsSample = "regular",
): StatCardDraft => {
  if (!draft.playerId) {
    return { ...draft, source: "season", season };
  }
  const row = playerRowForSeason(draft.playerId, season, draft.teamId, sample);
  return {
    ...draft,
    source: "season",
    season,
    stats: draft.stats.map((line) => ({
      ...line,
      label: seasonLabelFor(line),
      value: clipStatValue(
        formatStatCardSeasonValue(
          line.key,
          rosterStatValue(row, STC_METRIC[line.key]),
        ),
      ),
    })),
  };
};

export const setStatCardLineKey = (
  stats: StatCardLine[],
  index: number,
  key: StatCardKey,
  source: StatCardSource,
): StatCardLine[] => {
  const option = STAT_CARD_LINE_OPTIONS.find((item) => item.key === key);
  if (!option) {
    return stats;
  }
  const next = { ...option };
  return stats.map((line, lineIndex) =>
    lineIndex === index
      ? {
          ...next,
          label: source === "season" ? seasonLabelFor(next) : next.label,
          value: line.value,
        }
      : line,
  );
};

export const nextStatCardLine = (stats: StatCardLine[]): StatCardLine | null => {
  if (stats.length >= STC_STAT_MAX) {
    return null;
  }
  const used = new Set(stats.map((line) => line.key));
  const next = STAT_CARD_LINE_OPTIONS.find((line) => !used.has(line.key));
  return next ? { ...next } : null;
};

export const addStatCardLine = (stats: StatCardLine[]): StatCardLine[] => {
  const next = nextStatCardLine(stats);
  return next ? [...stats, next] : stats;
};

export const removeStatCardLine = (stats: StatCardLine[], index: number) =>
  stats.length <= 3 ? stats : stats.filter((_, lineIndex) => lineIndex !== index);
