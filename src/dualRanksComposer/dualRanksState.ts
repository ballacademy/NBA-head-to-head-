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
  formatComposerName,
  type ComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import { abbreviateOverflowName } from "../instagramComposer/nameFit";
import { measureTitleAdvance } from "../instagramComposer/titleLayout";
import {
  columnHeaderFor,
  emptyLeaderRows,
  LEADER_HEADER_MAX,
  LEADER_ROW_DEFAULT,
  leaderCaptionLines,
  leaderRowOccupied,
  parseLeaderRowCount,
  resizeLeaderRows,
  visibleLeaderRows,
  type LeaderRow,
  type LeaderWindowKind,
} from "../leaderboardComposer/leaderboardFill";

export const DUAL_RANKS_STORAGE_KEY = "ddgm:dual-ranks-composer";
export const DUAL_RANKS_SAVES_KEY = "ddgm:dual-ranks-composer:saves";

export type DualRanksLayout = "side" | "top" | "well";

export interface DualRanksDraft {
  leftHeader: string;
  rightHeader: string;
  leftRows: LeaderRow[];
  rightRows: LeaderRow[];
  leftMetric: EveryTeamStatMetric;
  rightMetric: EveryTeamStatMetric;
  windowKind: LeaderWindowKind;
  from: string;
  to: string;
  season: string;
  layout: DualRanksLayout;
  /** Team-color name plates. Default On; Off restores hairline rows. */
  namePlates: boolean;
  featuredPlayerId: string | null;
  playerId: string | null;
  teamId: string | null;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
  showBa?: boolean;
}

const isNullable = (value: unknown) =>
  typeof value === "string" || value === null;

export const isDualRanksDraft = (value: unknown): value is DualRanksDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as DualRanksDraft).leftRows) &&
      Array.isArray((value as DualRanksDraft).rightRows),
  );

export const defaultDualRanksDraft = (season = "2026-27"): DualRanksDraft => ({
  leftHeader: columnHeaderFor("points"),
  rightHeader: columnHeaderFor("assists"),
  leftRows: emptyLeaderRows(LEADER_ROW_DEFAULT),
  rightRows: emptyLeaderRows(LEADER_ROW_DEFAULT),
  leftMetric: "points",
  rightMetric: "assists",
  windowKind: "season",
  from: "",
  to: "",
  season,
  layout: "side",
  namePlates: true,
  featuredPlayerId: null,
  playerId: null,
  teamId: null,
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_CUSTOM_PAN },
  showBa: true,
});

export const normalizeDualRanksDraft = (
  value: Partial<DualRanksDraft>,
  fallback = defaultDualRanksDraft(),
): DualRanksDraft => {
  const count = parseLeaderRowCount(
    value.leftRows?.length ?? fallback.leftRows.length,
  );
  return {
    ...fallback,
    ...value,
    leftHeader: (value.leftHeader ?? fallback.leftHeader).slice(0, LEADER_HEADER_MAX),
    rightHeader: (value.rightHeader ?? fallback.rightHeader).slice(
      0,
      LEADER_HEADER_MAX,
    ),
    leftRows: resizeLeaderRows(value.leftRows ?? fallback.leftRows, count),
    rightRows: resizeLeaderRows(value.rightRows ?? fallback.rightRows, count),
    layout:
      value.layout === "top" || value.layout === "well" ? value.layout : "side",
    namePlates: value.namePlates !== false,
    customPhoto: value.customPhoto === true,
    pan: isPhotoPan(value.pan) ? value.pan : fallback.pan,
    photoSrc: isNullable(value.photoSrc) ? value.photoSrc : fallback.photoSrc,
    playerId: isNullable(value.playerId) ? value.playerId : fallback.playerId,
    teamId: isNullable(value.teamId) ? value.teamId : fallback.teamId,
    featuredPlayerId: isNullable(value.featuredPlayerId)
      ? value.featuredPlayerId
      : fallback.featuredPlayerId,
    showBa: value.showBa !== false,
  };
};

export const hasCustomDualPhoto = (draft: DualRanksDraft) =>
  Boolean(draft.customPhoto && draft.photoSrc);

export const setDualRanksPhoto = (
  draft: DualRanksDraft,
  dataUrl: string,
): DualRanksDraft => ({
  ...draft,
  photoSrc: dataUrl,
  customPhoto: true,
  pan: { ...DEFAULT_CUSTOM_PAN },
});

export const applyDualRanksHero = (
  draft: DualRanksDraft,
  player: TierPlayer,
  keepPhoto: boolean,
): DualRanksDraft => {
  const keep = keepPhoto && hasCustomDualPhoto(draft);
  const inLeft = draft.leftRows.some((row) => row.playerId === player.id);
  const inRight = draft.rightRows.some((row) => row.playerId === player.id);
  return {
    ...draft,
    playerId: player.id,
    teamId: getTeam(player.team)?.id ?? player.team ?? null,
    featuredPlayerId: inLeft || inRight ? player.id : draft.featuredPlayerId,
    photoSrc: keep ? draft.photoSrc : player.headshotUrl || null,
    customPhoto: Boolean(keep),
    pan: keep ? { ...draft.pan } : { ...DEFAULT_HEADSHOT_PAN },
  };
};

export const dualExportColumns = (
  draft: DualRanksDraft,
  exporting: boolean,
  square: boolean,
) => {
  const slice = (rows: LeaderRow[]) => {
    const cut = square ? rows.slice(0, 5) : rows;
    return visibleLeaderRows(cut, exporting);
  };
  const left = slice(draft.leftRows);
  const right = slice(draft.rightRows);
  if (!exporting) {
    return { left, right, hideRight: false, hideLeft: false };
  }
  const hideLeft = !left.some(leaderRowOccupied);
  const hideRight = !right.some(leaderRowOccupied);
  return { left, right, hideLeft, hideRight };
};

export const dualCaptionLines = (draft: DualRanksDraft) => [
  ...leaderCaptionLines(draft.leftHeader, draft.leftRows),
  ...leaderCaptionLines(draft.rightHeader, draft.rightRows).slice(1),
];

/** Two-column rows are tight — keep the full name when it fits, else period-abbreviate. */
export const DUAL_NAME_ADVANCE = 12.2;

export const fitDualRankName = (
  row: Pick<LeaderRow, "firstName" | "lastName">,
  style: ComposerNameStyle = "full",
  maxAdvance = DUAL_NAME_ADVANCE,
) =>
  abbreviateOverflowName(
    formatComposerName(row.firstName, row.lastName, style) ||
      `${row.firstName} ${row.lastName}`.replace(/\s+/g, " ").trim(),
    maxAdvance,
    (value) => measureTitleAdvance(value, 0.02),
  );
