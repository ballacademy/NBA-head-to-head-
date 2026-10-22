import {
  formatComposerName,
  type ComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import {
  DEFAULT_COMPOSER_WATERMARK,
  parseComposerWatermark,
  type ComposerWatermark,
} from "../instagramComposer/composerWatermark";
import type { ComposerStatsSample } from "../instagramComposer/composerStatsSample";
import { readJson, writeJson } from "../lib/browserStorage";
import {
  isoDateOnly,
  nbaTodayIso,
  playerGameResult,
  type LastGame,
  type LastGameStats,
} from "../playerOfTheDayComposer/lastGame";
import { parseStatsLeft } from "./statCardLayout";
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
  DEFAULT_HEADSHOT_PAN,
  isPhotoPan,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { getTeam } from "../standingsComposer/teams";
import {
  hasCustomPhoto as stripHasCustomPhoto,
  splitPlayerName,
  type TotwStrip,
} from "../teamOfTheWeekComposer/teamOfTheWeekState";
import {
  getPlayer,
  type PlayerPositionGroup,
  type TierPlayer,
} from "../tierListComposer/nbaActivePlayers";

export { clampPan, parseStatsLeft, type PhotoPan };

export const STAT_CARD_STORAGE_KEY = "ddgm:stat-card-composer";
export const STAT_CARD_FLIP_NIGHT_KEY = "ddgm:stat-card-flip-by-night";

export const STC_VALUE_MAX = 8;
export const STC_LABEL_MAX = 6;
export const STC_NAME_MAX = 32;
export const STC_MATCHUP_MAX = 28;
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

export type StatHighKind = "season" | "career";

export interface StatCardLine {
  key: StatCardKey;
  label: string;
  value: string;
  high?: StatHighKind | null;
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
  gameDate?: string | null;
  showBa?: boolean;
  showMatchup?: boolean;
  matchup?: string;
  watermark?: ComposerWatermark;
  /** Stats column on the left, photo on the right. Default is stats on the right. */
  statsLeft?: boolean;
  /** Career/season-high pip on a qualifying stat. Off by default. */
  showHighPip?: boolean;
}

export const STAT_CARD_LINE_OPTIONS: StatCardLine[] = [
  { key: "pts", label: "PTS", value: "" },
  { key: "reb", label: "REB", value: "" },
  { key: "ast", label: "AST", value: "" },
  { key: "min", label: "MIN", value: "" },
  { key: "blk", label: "BLK", value: "" },
  { key: "stl", label: "STL", value: "" },
  { key: "tov", label: "TOV", value: "" },
  { key: "fg", label: "FG", value: "" },
  { key: "three", label: "3PM", value: "" },
];

/** Slot 1 is always PTS on auto-fill. User reorder still wins after. */
export const ensurePtsFirst = (stats: StatCardLine[]): StatCardLine[] => {
  const pts = stats.findIndex((line) => line.key === "pts");
  if (pts <= 0) {
    return stats;
  }
  const next = stats.slice();
  const [row] = next.splice(pts, 1);
  if (!row) {
    return stats;
  }
  next.unshift(row);
  return next;
};

/** When both FGM and 3PM are on the card, FGM stays first. User reorder still wins after. */
export const ensureFgBeforeThree = (stats: StatCardLine[]): StatCardLine[] => {
  const fg = stats.findIndex((line) => line.key === "fg");
  const three = stats.findIndex((line) => line.key === "three");
  if (fg < 0 || three < 0 || fg < three) {
    return stats;
  }
  const next = stats.slice();
  const [fgLine] = next.splice(fg, 1);
  if (!fgLine) {
    return stats;
  }
  next.splice(three, 0, fgLine);
  return next;
};

const withAutoFillStatOrder = (stats: StatCardLine[]) =>
  ensureFgBeforeThree(ensurePtsFirst(stats));

export const visibleStatCardLines = (
  stats: StatCardLine[],
  exporting = false,
): StatCardLine[] =>
  exporting ? stats.filter((line) => line.value.trim()) : stats;

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

const GAME_FIELD: Record<StatCardKey, keyof LastGameStats> = {
  pts: "pts",
  reb: "reb",
  ast: "ast",
  min: "min",
  blk: "blk",
  stl: "stl",
  tov: "tov",
  three: "three",
  fg: "fg",
};

const isMakesAttempts = (value: string) => /^\d+\s*-\s*\d+$/.test(value.trim());

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
  gameDate: nbaTodayIso(),
  showBa: true,
  showMatchup: false,
  matchup: "",
  watermark: DEFAULT_COMPOSER_WATERMARK,
  statsLeft: false,
  showHighPip: false,
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
  gameDate: isoDateOnly(draft.gameDate) || nbaTodayIso(),
  showBa: draft.showBa !== false,
  showMatchup: draft.showMatchup === true,
  matchup: clipStatMatchup(draft.matchup ?? ""),
  watermark: parseComposerWatermark(draft.watermark),
  statsLeft: parseStatsLeft(draft.statsLeft),
  showHighPip: draft.showHighPip === true,
});

let memoryFlipByNight: Record<string, boolean> = {};

const readFlipByNight = (): Record<string, boolean> => {
  const raw = readJson<unknown>(STAT_CARD_FLIP_NIGHT_KEY);
  if (!raw || typeof raw !== "object") {
    return { ...memoryFlipByNight };
  }
  const next: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "boolean") {
      next[key] = value;
    }
  }
  return next;
};

export const peekStatCardStatsLeft = (date?: string | null) => {
  const night = isoDateOnly(date) || nbaTodayIso();
  const byNight = readFlipByNight();
  if (Object.prototype.hasOwnProperty.call(byNight, night)) {
    return byNight[night]!;
  }
  const stored = readJson<Partial<StatCardDraft>>(STAT_CARD_STORAGE_KEY);
  return parseStatsLeft(stored?.statsLeft);
};

export const persistStatCardStatsLeft = (
  statsLeft: boolean,
  date?: string | null,
) => {
  const night = isoDateOnly(date) || nbaTodayIso();
  memoryFlipByNight = {
    ...readFlipByNight(),
    [night]: statsLeft,
  };
  writeJson(STAT_CARD_FLIP_NIGHT_KEY, memoryFlipByNight);
  const stored = readJson<Partial<StatCardDraft>>(STAT_CARD_STORAGE_KEY);
  if (stored && typeof stored === "object") {
    writeJson(STAT_CARD_STORAGE_KEY, { ...stored, statsLeft });
    return;
  }
  writeJson(STAT_CARD_STORAGE_KEY, { ...defaultStatCardDraft(), statsLeft });
};

export const hasCustomPhoto = (draft: StatCardDraft) =>
  stripHasCustomPhoto(draft as unknown as TotwStrip);

export const playerName = (
  draft: Pick<StatCardDraft, "firstName" | "lastName">,
  style?: ComposerNameStyle,
) => formatComposerName(draft.firstName, draft.lastName, style);

export const applyPlayerName = (draft: StatCardDraft, value: string): StatCardDraft => {
  const names = splitPlayerName(value.slice(0, STC_NAME_MAX));
  return { ...draft, firstName: names.firstName, lastName: names.lastName };
};

export const clipStatValue = (value: string) =>
  value.replace(/\s+/g, " ").trim().slice(0, STC_VALUE_MAX);

export const clipStatLabel = (value: string) =>
  value.replace(/\s+/g, " ").trim().toUpperCase().slice(0, STC_LABEL_MAX);

export const clipStatMatchup = (value: string) =>
  value.replace(/\s+/g, " ").trim().slice(0, STC_MATCHUP_MAX);

const scoreToken = (value: string) => {
  const match = String(value ?? "").match(/(\d+)/);
  return match?.[1] ?? "";
};

/** Home: `W vs OKC 111–109`. Away: `L 103–129 @ IND`. Player-team W/L and score. */
export const formatStatCardMatchup = (
  game: Pick<
    LastGame,
    "result" | "playerScore" | "opponentScore" | "opponentAbbrev" | "home"
  > | null,
) => {
  if (!game) {
    return "";
  }
  const ours = scoreToken(game.playerScore);
  const theirs = scoreToken(game.opponentScore);
  const result = playerGameResult(game.playerScore, game.opponentScore, game.result);
  const opp = String(game.opponentAbbrev ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 3);
  if (!result || !ours || !theirs || !opp) {
    return "";
  }
  const score = `${ours}–${theirs}`;
  return clipStatMatchup(
    game.home === false
      ? `${result} ${score} @ ${opp}`
      : `${result} vs ${opp} ${score}`,
  );
};

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
    photoSrc: keep ? previous.photoSrc : player.headshotUrl || null,
    customPhoto: keep,
    pan: keep ? { ...previous.pan } : { ...DEFAULT_HEADSHOT_PAN },
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

export const statCount = (value: string) => {
  const parsed = Number.parseFloat(String(value).split("-")[0] ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
};

export const statAttempts = (value: string) => {
  const match = String(value).match(/-(\d+)/);
  return match ? Number(match[1]) : 0;
};

/** Boxscore field for a slot — MIN is minutes, never FGM-FGA. */
export const lastGameValueForKey = (
  key: StatCardKey,
  stats: LastGameStats,
): string => {
  const raw = String(stats[GAME_FIELD[key]] ?? "").trim();
  if (key === "fg" || key === "three") {
    return raw;
  }
  if (key === "min") {
    const minutes = raw.match(/^(\d+)(?::\d{1,2})?(?:\.\d+)?$/);
    return minutes ? minutes[1] : "";
  }
  if (isMakesAttempts(raw)) {
    return "";
  }
  return raw;
};

const valueFromGame = (line: StatCardLine, stats: LastGameStats) =>
  lastGameValueForKey(line.key, stats);

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

const lineFromGame = (
  key: StatCardKey,
  stats: LastGameStats,
  override?: { label?: string; value?: string },
): StatCardLine => {
  const option = STAT_CARD_LINE_OPTIONS.find((item) => item.key === key)!;
  return {
    ...option,
    label: (override?.label ?? gameLabelFor(option)).slice(0, STC_LABEL_MAX),
    value: clipStatValue(override?.value ?? valueFromGame(option, stats)),
  };
};

type NotablePick = {
  key: StatCardKey;
  label?: string;
  value?: string;
};

export type NotableStatPosition =
  | Pick<TierPlayer, "positionGroup" | "position">
  | PlayerPositionGroup
  | string
  | null
  | undefined;

/** Guard >45%, Forward >50%, Center >57%. Unknown defaults to Forward. */
export const FG_PCT_FLOOR: Record<PlayerPositionGroup, number> = {
  G: 0.45,
  F: 0.5,
  C: 0.57,
};

/** Skip 1-1 / 2-3 junk; 8-15 still qualifies. */
export const FG_MIN_ATTEMPTS = 8;
/** Volume 3s are make-driven — a 4-x night belongs on the card. */
export const THREE_MIN_MAKES = 4;

export const fgPositionGroup = (
  playerOrGroup?: NotableStatPosition,
): PlayerPositionGroup => {
  if (!playerOrGroup) {
    return "F";
  }
  const raw =
    typeof playerOrGroup === "string"
      ? playerOrGroup
      : playerOrGroup.positionGroup || playerOrGroup.position || "";
  const token = String(raw).toUpperCase();
  if (token === "G" || token === "PG" || token === "SG") {
    return "G";
  }
  if (token === "C") {
    return "C";
  }
  return "F";
};

/** Last-game lines worth putting on the card — no padded REB/AST junk. */
export const notableStatCardLines = (
  stats: LastGameStats,
  playerOrGroup?: NotableStatPosition,
): StatCardLine[] => {
  const pts = statCount(stats.pts);
  const reb = statCount(stats.reb);
  const ast = statCount(stats.ast);
  const stl = statCount(stats.stl);
  const blk = statCount(stats.blk);
  const min = statCount(stats.min);
  const tov = statCount(stats.tov);
  const threeMakes = statCount(stats.three);
  const fgMakes = statCount(stats.fg);
  const fgAtt = statAttempts(stats.fg);
  const fgPct = fgAtt > 0 ? fgMakes / fgAtt : 0;
  const fgFloor = FG_PCT_FLOOR[fgPositionGroup(playerOrGroup)];
  const picks: NotablePick[] = [{ key: "pts" }];
  const fgEfficient = fgAtt >= FG_MIN_ATTEMPTS && fgPct > fgFloor;
  const fgVolume = fgMakes >= 10;
  if (fgEfficient || fgVolume) {
    picks.push({ key: "fg" });
  }
  if (threeMakes >= THREE_MIN_MAKES) {
    picks.push({ key: "three", label: "3PM", value: stats.three });
  }
  if (tov >= 6 || (tov >= 5 && pts >= 30)) {
    picks.push({ key: "tov" });
  }
  if (reb >= 4) {
    picks.push({ key: "reb" });
  }
  if (ast >= 4) {
    picks.push({ key: "ast" });
  }
  if (stl >= 2) {
    picks.push({ key: "stl" });
  }
  if (blk >= 2) {
    picks.push({ key: "blk" });
  }
  /** Short nights and heavy minutes read; a boring 30–35 can skip. Always last. */
  const showMin = min > 0 && (min < 30 || min >= 36);
  const room = showMin ? STC_STAT_MAX - 1 : STC_STAT_MAX;
  const picked = picks.slice(0, room).map((item) => lineFromGame(item.key, stats, item));
  if (showMin) {
    picked.push(lineFromGame("min", stats));
  }
  const lines = picked.length ? picked : [lineFromGame("pts", stats)];
  return withAutoFillStatOrder(lines);
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
    matchup: formatStatCardMatchup(game),
    stats: draft.stats.map((line) => ({
      ...line,
      label: gameLabelFor(line),
      value: clipStatValue(valueFromGame(line, game.stats)),
    })),
  };
};

export const fillStatCardFromStandout = (
  draft: StatCardDraft,
  game: LastGame | null,
): StatCardDraft => {
  if (!game) {
    return draft;
  }
  return {
    ...draft,
    source: "last-game",
    matchup: formatStatCardMatchup(game),
    stats: notableStatCardLines(game.stats, getPlayer(draft.playerId)),
  };
};

/** Brick / TO night — FG makes-attempts, volume 3s, turnovers, PTS. Not the standout set. */
export const notableRoughNightLines = (
  stats: LastGameStats,
  _playerOrGroup?: NotableStatPosition,
): StatCardLine[] => {
  const min = statCount(stats.min);
  const tov = statCount(stats.tov);
  const threeMakes = statCount(stats.three);
  const threeAtt = statAttempts(stats.three);
  const fgMakes = statCount(stats.fg);
  const fgAtt = statAttempts(stats.fg);
  const picks: NotablePick[] = [{ key: "pts" }];
  if (fgAtt > 0 || fgMakes > 0) {
    picks.push({ key: "fg" });
  }
  if (threeMakes >= THREE_MIN_MAKES || threeAtt >= FG_MIN_ATTEMPTS) {
    picks.push({ key: "three", label: "3PM", value: stats.three });
  }
  if (tov > 0) {
    picks.push({ key: "tov" });
  }
  const showMin = min > 0 && (min < 30 || min >= 36);
  const room = showMin ? STC_STAT_MAX - 1 : STC_STAT_MAX;
  const picked = picks
    .slice(0, room)
    .map((item) => lineFromGame(item.key, stats, item));
  if (showMin) {
    picked.push(lineFromGame("min", stats));
  }
  const lines = picked.length ? picked : [lineFromGame("pts", stats)];
  return withAutoFillStatOrder(lines);
};

export const fillStatCardFromRoughNight = (
  draft: StatCardDraft,
  game: LastGame | null,
): StatCardDraft => {
  if (!game) {
    return draft;
  }
  return {
    ...draft,
    source: "last-game",
    matchup: formatStatCardMatchup(game),
    stats: notableRoughNightLines(game.stats, getPlayer(draft.playerId)),
  };
};

const HIGH_FLOOR: Partial<Record<StatCardKey, number>> = {
  pts: 20,
  reb: 10,
  ast: 8,
  stl: 3,
  blk: 3,
};

const maxStat = (games: LastGame[], key: StatCardKey) =>
  games.reduce((best, game) => {
    const raw = Number.parseFloat(String(game.stats[key as keyof LastGameStats] ?? ""));
    return Number.isFinite(raw) && raw > best ? raw : best;
  }, 0);

export const statHighKind = (
  key: StatCardKey,
  value: string,
  seasonGames: LastGame[],
  careerGames: LastGame[] = seasonGames,
): StatHighKind | null => {
  const floor = HIGH_FLOOR[key];
  if (floor == null) {
    return null;
  }
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < floor) {
    return null;
  }
  const seasonMax = maxStat(seasonGames, key);
  const careerMax = maxStat(careerGames, key);
  if (careerGames.length > seasonGames.length && n >= careerMax && careerMax > 0) {
    return "career";
  }
  if (n >= seasonMax && seasonMax > 0) {
    return "season";
  }
  return null;
};

export const applyStatCardHighs = (
  draft: StatCardDraft,
  seasonGames: LastGame[],
  careerGames: LastGame[] = seasonGames,
): StatCardDraft => {
  if (!draft.showHighPip) {
    return {
      ...draft,
      stats: draft.stats.map((line) => ({ ...line, high: null })),
    };
  }
  return {
    ...draft,
    stats: draft.stats.map((line) => ({
      ...line,
      high: statHighKind(line.key, line.value, seasonGames, careerGames),
    })),
  };
};

/** Cover pack cards keep that night’s pasted crop; ESPN headshot if none. */
export const statCardFromCoverSlot = (
  slot: {
    playerId: string | null;
    firstName: string;
    lastName: string;
    teamId: string | null;
    photoSrc?: string | null;
    customPhoto?: boolean;
    pan?: PhotoPan;
  },
  game: LastGame | null,
  gameDate?: string | null,
): StatCardDraft | null => {
  if (!slot.playerId) {
    return null;
  }
  const player = getPlayer(slot.playerId);
  if (!player) {
    return null;
  }
  const custom = Boolean(slot.customPhoto && slot.photoSrc);
  let draft = fillStatCardFromPlayer(player, defaultStatCardDraft());
  draft = {
    ...draft,
    firstName: slot.firstName || draft.firstName,
    lastName: slot.lastName || draft.lastName,
    teamId: slot.teamId || draft.teamId,
    gameDate: isoDateOnly(gameDate) || draft.gameDate,
    photoSrc: custom ? slot.photoSrc! : draft.photoSrc,
    customPhoto: custom,
    pan: slot.pan ? { ...slot.pan } : draft.pan,
  };
  if (game) {
    draft = fillStatCardFromStandout(draft, game);
  }
  return {
    ...draft,
    photoSrc: custom ? slot.photoSrc! : draft.photoSrc,
    customPhoto: custom,
    pan: slot.pan ? { ...slot.pan } : draft.pan,
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
  gameStats?: LastGameStats | null,
): StatCardLine[] => {
  const option = STAT_CARD_LINE_OPTIONS.find((item) => item.key === key);
  if (!option) {
    return stats;
  }
  const next = { ...option };
  const value =
    source === "last-game" && gameStats
      ? clipStatValue(lastGameValueForKey(key, gameStats))
      : "";
  return stats.map((line, lineIndex) =>
    lineIndex === index
      ? {
          ...next,
          label: source === "season" ? seasonLabelFor(next) : next.label,
          value,
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

/** MIN stays last when it is still on the card. */
export const keepMinLast = (stats: StatCardLine[]): StatCardLine[] => {
  const rest = stats.filter((line) => line.key !== "min");
  const mins = stats.filter((line) => line.key === "min");
  return mins.length ? [...rest, ...mins] : stats;
};

export const removeStatCardLine = (stats: StatCardLine[], index: number) => {
  if (stats.length <= 1 || index < 0 || index >= stats.length) {
    return stats;
  }
  return keepMinLast(stats.filter((_, lineIndex) => lineIndex !== index));
};

/** Graphic drag: keep the dropped order, including MIN off last. */
export const moveStatCardLine = (
  stats: StatCardLine[],
  fromIndex: number,
  toIndex: number,
): StatCardLine[] => {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= stats.length ||
    toIndex >= stats.length
  ) {
    return stats;
  }
  const next = [...stats];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) {
    return stats;
  }
  next.splice(toIndex, 0, moved);
  return next;
};
