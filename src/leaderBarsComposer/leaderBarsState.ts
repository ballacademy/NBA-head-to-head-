import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import {
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
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
  visibleLeaderRows,
  type LeaderRow,
  type LeaderWindowKind,
} from "../leaderboardComposer/leaderboardFill";

export const LEADER_BARS_STORAGE_KEY = "ddgm:leader-bars-composer";
export const LEADER_BARS_SAVES_KEY = "ddgm:leader-bars-composer:saves";
export const DEFAULT_LEADER_BARS_TITLE = "PPG LEADERS";
export const LEADER_BARS_TITLE_TRACK = 0.04;

export type LeaderBarsPhotoPos = "top" | "bottom";
export type LeaderBarsBarStyle = "gold" | "team";

export interface LeaderBarsDraft {
  title: string;
  rows: LeaderRow[];
  metric: EveryTeamStatMetric;
  windowKind: LeaderWindowKind;
  from: string;
  to: string;
  season: string;
  photoPos: LeaderBarsPhotoPos;
  barStyle: LeaderBarsBarStyle;
  showBarHeadshots: boolean;
  playerId: string | null;
  teamId: string | null;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
  showBa?: boolean;
}

const isNullable = (value: unknown) =>
  typeof value === "string" || value === null;

export const isLeaderBarsDraft = (value: unknown): value is LeaderBarsDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as LeaderBarsDraft).title === "string" &&
      Array.isArray((value as LeaderBarsDraft).rows),
  );

export const defaultLeaderBarsDraft = (
  season = "2026-27",
  range = { from: "", to: "" },
): LeaderBarsDraft => ({
  title: DEFAULT_LEADER_BARS_TITLE,
  rows: emptyLeaderRows(LEADER_ROW_DEFAULT),
  metric: "points",
  windowKind: "season",
  from: range.from,
  to: range.to,
  season,
  photoPos: "top",
  barStyle: "gold",
  showBarHeadshots: false,
  playerId: null,
  teamId: null,
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_CUSTOM_PAN },
  showBa: true,
});

export const normalizeLeaderBarsDraft = (
  value: Partial<LeaderBarsDraft>,
  fallback = defaultLeaderBarsDraft(),
): LeaderBarsDraft => {
  const count = parseLeaderRowCount(value.rows?.length ?? fallback.rows.length);
  return {
    ...fallback,
    ...value,
    title: (value.title ?? fallback.title).slice(0, LEADER_TITLE_MAX),
    rows: resizeLeaderRows(value.rows ?? fallback.rows, count),
    photoPos: value.photoPos === "bottom" ? "bottom" : "top",
    barStyle: value.barStyle === "team" ? "team" : "gold",
    showBarHeadshots: value.showBarHeadshots === true,
    customPhoto: value.customPhoto === true,
    pan: isPhotoPan(value.pan) ? value.pan : fallback.pan,
    photoSrc: isNullable(value.photoSrc) ? value.photoSrc : fallback.photoSrc,
    playerId: isNullable(value.playerId) ? value.playerId : fallback.playerId,
    teamId: isNullable(value.teamId) ? value.teamId : fallback.teamId,
    showBa: value.showBa !== false,
  };
};

export const splitLeaderBarsTitle = (title: string) =>
  splitBalancedTitle(title, DEFAULT_LEADER_BARS_TITLE, LEADER_BARS_TITLE_TRACK);

export const hasCustomLeaderPhoto = (draft: LeaderBarsDraft) =>
  Boolean(draft.customPhoto && draft.photoSrc);

export const setLeaderBarsPhoto = (
  draft: LeaderBarsDraft,
  dataUrl: string,
): LeaderBarsDraft => ({
  ...draft,
  photoSrc: dataUrl,
  customPhoto: true,
  pan: { ...DEFAULT_CUSTOM_PAN },
});

export const applyLeaderBarsHero = (
  draft: LeaderBarsDraft,
  player: TierPlayer,
  keepPhoto: boolean,
): LeaderBarsDraft => {
  const keep = keepPhoto && hasCustomLeaderPhoto(draft);
  return {
    ...draft,
    playerId: player.id,
    teamId: getTeam(player.team)?.id ?? player.team ?? null,
    photoSrc: keep ? draft.photoSrc : player.headshotUrl || null,
    customPhoto: Boolean(keep),
    pan: keep ? { ...draft.pan } : { ...DEFAULT_HEADSHOT_PAN },
  };
};

export const heroFromFirstRow = (draft: LeaderBarsDraft, player: TierPlayer) =>
  applyLeaderBarsHero(draft, player, hasCustomLeaderPhoto(draft));

export const leaderBarsCaption = (draft: LeaderBarsDraft) =>
  leaderCaptionLines(draft.title || DEFAULT_LEADER_BARS_TITLE, draft.rows);

export const leaderBarsExportRows = (
  draft: LeaderBarsDraft,
  exporting: boolean,
  square: boolean,
) => {
  const rows = square ? draft.rows.slice(0, 5) : draft.rows;
  return visibleLeaderRows(rows, exporting);
};

export const leaderBarsOccupied = (draft: LeaderBarsDraft) =>
  Boolean(draft.photoSrc) || draft.rows.some(leaderRowOccupied);
