import {
  readLastShowBa,
  storedOrLastShowBa,
} from "../instagramComposer/composerBoardDefaults";
import { formatComposerName } from "../instagramComposer/composerNameStyle";
import { graphicCaption } from "../instagramComposer/graphicCaption";
import {
  DEFAULT_COMPOSER_WATERMARK,
  parseComposerWatermark,
  type ComposerWatermark,
} from "../instagramComposer/composerWatermark";
import {
  clampPan,
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
  isPhotoPan,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import type { ComposerStatsSample } from "../instagramComposer/composerStatsSample";
import type { LastGame, LastGameStats } from "../playerOfTheDayComposer/lastGame";
import {
  everyTeamCurrentSeason,
  isPercentStatMetric,
  playerRowForSeason,
  rosterStatValue,
  statsSeasonFor,
  type EveryTeamStatMetric,
} from "../everyTeamComposer/historicalRosters";
import { getTeam } from "../standingsComposer/teams";
import {
  hasCustomPhoto as stripHasCustomPhoto,
  splitPlayerName,
  type TotwStrip,
} from "../teamOfTheWeekComposer/teamOfTheWeekState";
import { getPlayer, type TierPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  defaultLetterGradeFields,
  normalizeLetterGradeFields,
  type LetterGradeFields,
} from "../lib/letterGrade";

export { clampPan, type PhotoPan };

export const DEFAULT_COMPARE_TITLE = "NOT A SIXTH MAN";
export const DEFAULT_COMPARE_SUBTITLE = "CAREER START VS CAREER BENCH APPEARANCES";
export const DEFAULT_STATS_LABEL = "CAREER STATS";

const foldCompareLine = (value: string) =>
  value.replace(/\s+/g, " ").trim().toUpperCase();

/** Leftover default footer under a new title — hide it, don't keep it. */
export const isAutoCompareSubtitle = (value: string) =>
  foldCompareLine(value) === foldCompareLine(DEFAULT_COMPARE_SUBTITLE);
export const COMPARE_STAT_COUNT = 5;
export const COMPARE_STAT_MAX = 10;

/** Ctrl+V uses the last clicked side; an open picker still wins. */
export const comparePasteSlotIndex = (
  lastClicked: 0 | 1,
  picker: 0 | 1 | null = null,
): 0 | 1 => (picker === 0 || picker === 1 ? picker : lastClicked);

export type CompareStatsMode = "season" | "game" | "last-5" | "this-week";
export type CompareStatKey =
  | "pts"
  | "fgPct"
  | "fg3Pct"
  | "reb"
  | "ast"
  | "stl"
  | "blk"
  | "tov"
  | "ftPct"
  | "min"
  | "gp";

export interface CompareStatPreset {
  key: CompareStatKey;
  label: string;
  metric: EveryTeamStatMetric;
  game?: keyof LastGameStats;
  pctFromMakes?: boolean;
}

export const COMPARE_STAT_PRESETS: CompareStatPreset[] = [
  { key: "pts", label: "PTS", metric: "points", game: "pts" },
  { key: "fgPct", label: "FG%", metric: "fgPct", game: "fg", pctFromMakes: true },
  { key: "fg3Pct", label: "3P%", metric: "fg3Pct", game: "three", pctFromMakes: true },
  { key: "reb", label: "REB", metric: "rebounds", game: "reb" },
  { key: "ast", label: "AST", metric: "assists", game: "ast" },
  { key: "ftPct", label: "FT%", metric: "ftPct", game: "ft", pctFromMakes: true },
  { key: "tov", label: "TOV", metric: "turnovers", game: "tov" },
  { key: "min", label: "MIN", metric: "minutes", game: "min" },
  { key: "blk", label: "BLK", metric: "blocks", game: "blk" },
  { key: "stl", label: "STL", metric: "steals", game: "stl" },
  { key: "gp", label: "GP", metric: "games" },
];

export const DEFAULT_COMPARE_STAT_KEYS: CompareStatKey[] = [
  "pts",
  "fgPct",
  "fg3Pct",
  "reb",
  "ast",
];

export interface CompareStat {
  key: CompareStatKey;
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

export interface CompareDraft extends LetterGradeFields {
  title: string;
  subtitle: string;
  statsLabel: string;
  sides: [CompareSide, CompareSide];
  stats: CompareStat[];
  statsMode?: CompareStatsMode;
  season?: string;
  sideSeasons?: [string | null, string | null];
  showBa?: boolean;
  showWinner?: boolean;
  watermark?: ComposerWatermark;
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

export const compareStatPreset = (key: CompareStatKey) =>
  COMPARE_STAT_PRESETS.find((item) => item.key === key) ?? COMPARE_STAT_PRESETS[0]!;

export const parseCompareStatKey = (value: unknown): CompareStatKey =>
  COMPARE_STAT_PRESETS.some((item) => item.key === value)
    ? (value as CompareStatKey)
    : "pts";

export const compareStatKeyFromLabel = (label: string): CompareStatKey => {
  const token = label.trim().toUpperCase();
  const match = COMPARE_STAT_PRESETS.find((item) => item.label === token);
  return match?.key ?? "pts";
};

export const emptyCompareStat = (key: CompareStatKey): CompareStat => {
  const preset = compareStatPreset(key);
  return { key: preset.key, label: preset.label, left: "", right: "" };
};

export const defaultCompareStats = (): CompareStat[] =>
  DEFAULT_COMPARE_STAT_KEYS.map((key) => emptyCompareStat(key));

export const parseCompareStatsMode = (value: unknown): CompareStatsMode => {
  if (value === "game" || value === "last-5" || value === "this-week") {
    return value;
  }
  return "season";
};

export const parseSideSeasons = (
  value: unknown,
): [string | null, string | null] => {
  if (!Array.isArray(value) || value.length < 2) {
    return [null, null];
  }
  const left = value[0];
  const right = value[1];
  return [
    typeof left === "string" && left.trim() ? left : null,
    typeof right === "string" && right.trim() ? right : null,
  ];
};

export const parseCompareStats = (value: unknown): CompareStat[] => {
  if (!Array.isArray(value) || !value.length) {
    return defaultCompareStats();
  }
  const rows = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const row = item as Partial<CompareStat>;
      if (typeof row.left !== "string" || typeof row.right !== "string") {
        return null;
      }
      const key =
        typeof row.key === "string"
          ? parseCompareStatKey(row.key)
          : compareStatKeyFromLabel(typeof row.label === "string" ? row.label : "");
      const preset = compareStatPreset(key);
      return {
        key: preset.key,
        label:
          typeof row.label === "string" && row.label.trim()
            ? row.label
            : preset.label,
        left: row.left,
        right: row.right,
      } satisfies CompareStat;
    })
    .filter((row): row is CompareStat => Boolean(row));
  return rows.length ? rows.slice(0, COMPARE_STAT_MAX) : defaultCompareStats();
};

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

const NIGHT_MONTHS = [
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

/** Shared one-game stamp — Tonight / Last night / a date, not per-player last game. */
export const compareGameNightLabel = (iso?: string | null) => {
  const match = (iso ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "ONE GAME";
  }
  const month = NIGHT_MONTHS[Number(match[2]) - 1] ?? "";
  return `${month} ${Number(match[3])}`.trim();
};

export const autoCompareStatsLabel = (
  mode: CompareStatsMode,
  season: string,
  nightIso?: string | null,
) => {
  if (mode === "game") {
    return compareGameNightLabel(nightIso);
  }
  if (mode === "last-5") {
    return "LAST 5";
  }
  if (mode === "this-week") {
    return "THIS WEEK";
  }
  return `${statsSeasonFor(season)} AVG`;
};

/** Leftover season-avg copy must not print on a Last game / Tonight PNG. */
export const isSeasonAverageStatsLabel = (
  value: string,
  season?: string | null,
) => {
  const folded = foldCompareLine(value);
  if (!folded) {
    return false;
  }
  if (season && folded === foldCompareLine(autoCompareStatsLabel("season", season))) {
    return true;
  }
  return (
    folded.includes("SEASON AVERAGE") ||
    folded.includes("SEASON AVG") ||
    /\d{4}\s*[-–]\s*\d{2,4}\s+AVG$/.test(folded) ||
    /\d{4}\s*[-–]\s*\d{4}$/.test(folded)
  );
};

export const visibleCompareStatsLabel = (
  draft: Pick<CompareDraft, "statsLabel" | "statsMode" | "season">,
) => {
  const raw = (draft.statsLabel ?? "").trim();
  if (
    parseCompareStatsMode(draft.statsMode) === "game" &&
    isSeasonAverageStatsLabel(raw, draft.season)
  ) {
    return "";
  }
  return raw;
};

export const defaultCompareDraft = (): CompareDraft => {
  const season = everyTeamCurrentSeason();
  return {
    title: DEFAULT_COMPARE_TITLE,
    subtitle: "",
    statsLabel: autoCompareStatsLabel("season", season),
    sides: [emptyCompareSide(), emptyCompareSide()],
    stats: defaultCompareStats(),
    statsMode: "season",
    season,
    sideSeasons: [null, null],
    showBa: readLastShowBa(),
    showWinner: false,
    watermark: DEFAULT_COMPOSER_WATERMARK,
    ...defaultLetterGradeFields(),
  };
};

export const normalizeCompareDraft = (draft: CompareDraft): CompareDraft => {
  const season =
    typeof draft.season === "string" && draft.season.trim()
      ? draft.season
      : everyTeamCurrentSeason();
  const statsMode = parseCompareStatsMode(draft.statsMode);
  const statsLabel = (draft.statsLabel ?? "").trim();
  return {
    ...draft,
    subtitle: isAutoCompareSubtitle(draft.subtitle) ? "" : draft.subtitle,
    statsLabel:
      statsMode === "game" && isSeasonAverageStatsLabel(statsLabel, season)
        ? ""
        : statsLabel || draft.statsLabel || "",
    stats: parseCompareStats(draft.stats),
    statsMode,
    season,
    sideSeasons: parseSideSeasons(draft.sideSeasons),
    showBa: storedOrLastShowBa(draft.showBa),
    showWinner: draft.showWinner === true,
    watermark: parseComposerWatermark(draft.watermark),
    ...normalizeLetterGradeFields(draft),
  };
};

export const compareStatBarShares = (left: string, right: string) => {
  const a = Math.abs(numericStat(left) ?? 0);
  const b = Math.abs(numericStat(right) ?? 0);
  const max = Math.max(a, b);
  if (max <= 0) {
    return { left: 0, right: 0 };
  }
  return { left: a / max, right: b / max };
};

export const hasCustomPhoto = (side: CompareSide) =>
  stripHasCustomPhoto(side as unknown as TotwStrip);

export const compareSideName = (
  side: CompareSide,
  style?: Parameters<typeof formatComposerName>[2],
) => formatComposerName(side.firstName, side.lastName, style);

export const compareCaptionFor = (draft: CompareDraft) =>
  graphicCaption(
    draft.title,
    draft.sides.map((side) => compareSideName(side)).filter(Boolean),
    isAutoCompareSubtitle(draft.subtitle) ? [] : [draft.subtitle],
  );

export const compareSideCaption = (
  side: CompareSide,
  style?: Parameters<typeof formatComposerName>[2],
) => {
  const name = compareSideName(side, style);
  const team = getTeam(side.teamId)?.id;
  if (!name) {
    return "";
  }
  return team ? `${name} · ${team}` : name;
};

export const effectiveCompareSeason = (
  draft: Pick<CompareDraft, "season" | "sideSeasons">,
  side: 0 | 1,
) => draft.sideSeasons?.[side] || draft.season || everyTeamCurrentSeason();

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

export const formatCompareMinutes = (raw: string) => {
  const text = raw.trim();
  if (!text) {
    return "";
  }
  const clock = text.match(/^(\d{1,3}):(\d{2})/);
  if (clock) {
    return clock[1]!;
  }
  const n = Number.parseFloat(text);
  if (!Number.isFinite(n)) {
    return text;
  }
  if (n > 0 && n < 3) {
    return String(Math.round(n * 60));
  }
  return String(Math.round(n));
};

export const formatCompareSeasonValue = (
  value: number | null,
  metric: EveryTeamStatMetric,
) => {
  if (value == null) {
    return "";
  }
  if (isPercentStatMetric(metric)) {
    return (value * 100).toFixed(1);
  }
  if (metric === "games" || metric === "minutes") {
    return String(Math.round(value));
  }
  return value.toFixed(1);
};

export const valueFromLastGame = (
  preset: CompareStatPreset,
  game: LastGame | null,
) => {
  if (!game || !preset.game) {
    return "";
  }
  const raw = game.stats[preset.game] ?? "";
  if (preset.game === "min") {
    return formatCompareMinutes(raw);
  }
  return preset.pctFromMakes ? pctFromMakes(raw) : raw;
};

export const statsFromLastGame = (
  game: LastGame | null,
  stats: CompareStat[] = defaultCompareStats(),
): string[] =>
  stats.map((stat) => valueFromLastGame(compareStatPreset(stat.key), game));

export const statsFromSeason = (
  playerId: string | null,
  teamId: string | null,
  season: string,
  stats: CompareStat[] = defaultCompareStats(),
  sample: ComposerStatsSample = "regular",
): string[] => {
  if (!playerId) {
    return stats.map(() => "");
  }
  const row = playerRowForSeason(playerId, season, teamId, sample);
  return stats.map((stat) => {
    const preset = compareStatPreset(stat.key);
    return formatCompareSeasonValue(
      rosterStatValue(row, preset.metric),
      preset.metric,
    );
  });
};

export const applySideStatValues = (
  stats: CompareStat[],
  side: 0 | 1,
  values: string[],
): CompareStat[] =>
  stats.map((stat, index) => ({
    ...stat,
    [side === 0 ? "left" : "right"]: values[index] ?? "",
  }));

export const numericStat = (value: string): number | null => {
  const cleaned = value.replace(/[% ,]/g, "").trim();
  if (!cleaned) {
    return null;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const LOWER_IS_BETTER_KEYS = new Set(["tov", "pf"]);
const LOWER_IS_BETTER_LABELS = new Set(["TOV", "PF", "FOULS"]);

export const compareStatLowerIsBetter = (
  key?: string | null,
  label?: string | null,
) => {
  if (LOWER_IS_BETTER_KEYS.has((key ?? "").trim().toLowerCase())) {
    return true;
  }
  return LOWER_IS_BETTER_LABELS.has((label ?? "").trim().toUpperCase());
};

export const leadingSide = (
  left: string,
  right: string,
  lowerIsBetter = false,
): 0 | 1 | null => {
  const a = numericStat(left);
  const b = numericStat(right);
  if (a == null || b == null || a === b) {
    return null;
  }
  if (lowerIsBetter) {
    return a < b ? 0 : 1;
  }
  return a > b ? 0 : 1;
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
    photoSrc: keep ? previous.photoSrc : player.headshotUrl || null,
    customPhoto: keep,
    pan: keep ? { ...previous.pan } : { ...DEFAULT_HEADSHOT_PAN },
  };
};

export const landCarriedComparePlayer = (
  draft: CompareDraft,
  playerId: string | null | undefined,
): CompareDraft => {
  const id = playerId?.trim();
  if (!id || draft.sides[0]?.playerId) {
    return draft;
  }
  const player = getPlayer(id);
  if (!player) {
    return draft;
  }
  const side = fillCompareSide(player, draft.sides[0]!);
  return {
    ...draft,
    sides: [side, draft.sides[1]!],
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

export const setCompareStatKey = (
  stats: CompareStat[],
  index: number,
  key: CompareStatKey,
) => {
  const preset = compareStatPreset(key);
  return patchCompareStat(stats, index, {
    key: preset.key,
    label: preset.label,
  });
};

export const nextCompareStat = (stats: CompareStat[]): CompareStat | null => {
  if (stats.length >= COMPARE_STAT_MAX) {
    return null;
  }
  const used = new Set(stats.map((stat) => stat.key));
  const next = COMPARE_STAT_PRESETS.find((preset) => !used.has(preset.key));
  return next ? emptyCompareStat(next.key) : null;
};

export const addCompareStat = (stats: CompareStat[]): CompareStat[] => {
  const next = nextCompareStat(stats);
  return next ? [...stats, next] : stats;
};

export const removeCompareStat = (stats: CompareStat[], index: number) => {
  if (stats.length <= 1 || index < 0 || index >= stats.length) {
    return stats;
  }
  return stats.filter((_, statIndex) => statIndex !== index);
};

export const moveCompareStat = (
  stats: CompareStat[],
  fromIndex: number,
  toIndex: number,
): CompareStat[] => {
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

export const visibleCompareStats = (
  stats: CompareStat[],
  exporting = false,
) =>
  exporting
    ? stats.filter((stat) => stat.left.trim() || stat.right.trim())
    : stats;

export const compareWinner = (stats: CompareStat[]): 0 | 1 | null => {
  let left = 0;
  let right = 0;
  for (const stat of stats) {
    const lead = leadingSide(
      stat.left,
      stat.right,
      compareStatLowerIsBetter(stat.key, stat.label),
    );
    if (lead === 0) {
      left += 1;
    } else if (lead === 1) {
      right += 1;
    }
  }
  if (left === right || (!left && !right)) {
    return null;
  }
  return left > right ? 0 : 1;
};

export const swapCompareSides = (draft: CompareDraft): CompareDraft => ({
  ...draft,
  sides: [draft.sides[1]!, draft.sides[0]!],
  stats: draft.stats.map((stat) => ({
    ...stat,
    left: stat.right,
    right: stat.left,
  })),
  sideSeasons: draft.sideSeasons
    ? [draft.sideSeasons[1] ?? null, draft.sideSeasons[0] ?? null]
    : draft.sideSeasons,
});

export const resetCompareKeepPhotos = (draft: CompareDraft): CompareDraft => {
  const blank = defaultCompareDraft();
  return {
    ...blank,
    showBa: draft.showBa,
    showWinner: false,
    watermark: draft.watermark,
    sides: draft.sides.map((side) =>
      side.customPhoto && side.photoSrc
        ? {
            ...emptyCompareSide(),
            photoSrc: side.photoSrc,
            customPhoto: true,
            pan: { ...side.pan },
          }
        : emptyCompareSide(),
    ) as CompareDraft["sides"],
  };
};
