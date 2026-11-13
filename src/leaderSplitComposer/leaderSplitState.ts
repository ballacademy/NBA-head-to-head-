import {
  DEFAULT_CUSTOM_PAN,
  isPhotoPan,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { getTeam } from "../standingsComposer/teams";
import type { TierPlayer } from "../tierListComposer/nbaActivePlayers";
import type { EveryTeamStatMetric } from "../everyTeamComposer/historicalRosters";
import {
  emptyLeaderRows,
  LEADER_ROW_DEFAULT,
  LEADER_TITLE_MAX,
  leaderCaptionLines,
  leaderRowOccupied,
  parseLeaderRowCount,
  resizeLeaderRows,
  type LeaderRow,
  type LeaderWindowKind,
} from "../leaderboardComposer/leaderboardFill";

export const LEADER_SPLIT_STORAGE_KEY = "ddgm:leader-split-composer";
export const LEADER_SPLIT_SAVES_KEY = "ddgm:leader-split-composer:saves";
export const DEFAULT_LEADER_SPLIT_TITLE = "PPG LEADERS";
/** Face lower, fill the leftover crop — not a floating bust in a black well. */
export const LS_HERO_PAN: PhotoPan = { x: 0.5, y: 0.4, zoom: 1.72, rotate: 0 };

export interface LeaderSplitDraft {
  title: string;
  rows: LeaderRow[];
  metric: EveryTeamStatMetric;
  windowKind: LeaderWindowKind;
  from: string;
  to: string;
  season: string;
  mirror: boolean;
  showListHeadshots: boolean;
  /** Team-color name plates. Default Off; packing fills the pane. */
  namePlates: boolean;
  playerId: string | null;
  teamId: string | null;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
  showBa?: boolean;
}

const isNullable = (value: unknown) =>
  typeof value === "string" || value === null;

export const isLeaderSplitDraft = (value: unknown): value is LeaderSplitDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as LeaderSplitDraft).title === "string" &&
      Array.isArray((value as LeaderSplitDraft).rows),
  );

export const defaultLeaderSplitDraft = (
  season = "2026-27",
): LeaderSplitDraft => ({
  title: DEFAULT_LEADER_SPLIT_TITLE,
  rows: emptyLeaderRows(LEADER_ROW_DEFAULT),
  metric: "points",
  windowKind: "season",
  from: "",
  to: "",
  season,
  mirror: false,
  showListHeadshots: false,
  namePlates: false,
  playerId: null,
  teamId: null,
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_CUSTOM_PAN },
  showBa: true,
});

export const normalizeLeaderSplitDraft = (
  value: Partial<LeaderSplitDraft>,
  fallback = defaultLeaderSplitDraft(),
): LeaderSplitDraft => ({
  ...fallback,
  ...value,
  title: (value.title ?? fallback.title).slice(0, LEADER_TITLE_MAX),
  rows: resizeLeaderRows(
    value.rows ?? fallback.rows,
    parseLeaderRowCount(value.rows?.length ?? fallback.rows.length),
  ),
  mirror: value.mirror === true,
  showListHeadshots: value.showListHeadshots === true,
  namePlates: value.namePlates === true,
  customPhoto: value.customPhoto === true,
  pan: isPhotoPan(value.pan) ? value.pan : fallback.pan,
  photoSrc: isNullable(value.photoSrc) ? value.photoSrc : fallback.photoSrc,
  playerId: isNullable(value.playerId) ? value.playerId : fallback.playerId,
  teamId: isNullable(value.teamId) ? value.teamId : fallback.teamId,
  showBa: value.showBa !== false,
});

export const hasCustomSplitPhoto = (draft: LeaderSplitDraft) =>
  Boolean(draft.customPhoto && draft.photoSrc);

export const setLeaderSplitPhoto = (
  draft: LeaderSplitDraft,
  dataUrl: string,
): LeaderSplitDraft => ({
  ...draft,
  photoSrc: dataUrl,
  customPhoto: true,
  pan: { ...DEFAULT_CUSTOM_PAN },
});

export const applyLeaderSplitHero = (
  draft: LeaderSplitDraft,
  player: TierPlayer,
  keepPhoto: boolean,
): LeaderSplitDraft => {
  const keep = keepPhoto && hasCustomSplitPhoto(draft);
  return {
    ...draft,
    playerId: player.id,
    teamId: getTeam(player.team)?.id ?? player.team ?? null,
    photoSrc: keep ? draft.photoSrc : player.headshotUrl || null,
    customPhoto: Boolean(keep),
    pan: keep ? { ...draft.pan } : { ...LS_HERO_PAN },
  };
};

export const leaderSplitCaption = (draft: LeaderSplitDraft) =>
  leaderCaptionLines(draft.title || DEFAULT_LEADER_SPLIT_TITLE, draft.rows);

export const leaderSplitVisibleEntries = (
  draft: LeaderSplitDraft,
  square = false,
) => {
  const rows = square ? draft.rows.slice(0, 5) : draft.rows;
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => leaderRowOccupied(row));
};

export const leaderSplitExportRows = (
  draft: LeaderSplitDraft,
  _exporting: boolean,
  square: boolean,
) => leaderSplitVisibleEntries(draft, square).map((entry) => entry.row);

export const leaderSplitOccupied = (draft: LeaderSplitDraft) =>
  Boolean(draft.photoSrc) || draft.rows.some(leaderRowOccupied);
