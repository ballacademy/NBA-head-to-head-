import { readJson, writeJson } from "./browserStorage";
import type { LineupShareCardInput } from "./lineupShareCard";
import type { Player } from "./types";

export type CommunityShareableKind = "matchup" | "lineup" | "tierList";

export interface CommunityMatchupAttachment {
  kind: "matchup";
  modeLabel: string;
  result: "win" | "loss" | "tie";
  userTeam: string;
  opponentTeam: string;
  userOvr: number;
  opponentOvr: number;
  userLineupNames: string[];
  opponentLineupNames: string[];
  /** Player ids used to rebuild the share-card image on demand. */
  userLineupIds?: string[];
  userAccent?: string;
  userRecord?: string;
  /** Competitive W-L (or W-L-T) after the match, e.g. "12-5". */
  userWinRecord?: string;
  ovrOverflow?: number;
  savedAt: string;
}

export interface CommunityLineupAttachment {
  kind: "lineup";
  title: string;
  modeLabel: string;
  ovr?: number;
  resultLabel?: string;
  lineupNames: string[];
  lineupIds?: string[];
  accent?: string;
  savedAt: string;
}

export interface CommunityTierListAttachment {
  kind: "tierList";
  title: string;
  publishedId: string;
  savedAt: string;
}

export type CommunityPostAttachment =
  | CommunityMatchupAttachment
  | CommunityLineupAttachment
  | CommunityTierListAttachment;

const SHAREABLES_KEY = "nba-head-to-head-community-shareables";
const MAX_SHAREABLES = 8;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const isMatchup = (value: unknown): value is CommunityMatchupAttachment => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as CommunityMatchupAttachment;
  return (
    entry.kind === "matchup" &&
    typeof entry.modeLabel === "string" &&
    (entry.result === "win" ||
      entry.result === "loss" ||
      entry.result === "tie") &&
    typeof entry.userTeam === "string" &&
    typeof entry.opponentTeam === "string" &&
    isStringArray(entry.userLineupNames) &&
    isStringArray(entry.opponentLineupNames)
  );
};

const isLineup = (value: unknown): value is CommunityLineupAttachment => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as CommunityLineupAttachment;
  return (
    entry.kind === "lineup" &&
    typeof entry.title === "string" &&
    typeof entry.modeLabel === "string" &&
    isStringArray(entry.lineupNames)
  );
};

const isTierList = (value: unknown): value is CommunityTierListAttachment => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as CommunityTierListAttachment;
  return (
    entry.kind === "tierList" &&
    typeof entry.title === "string" &&
    typeof entry.publishedId === "string" &&
    entry.publishedId.trim().length > 0
  );
};

export const isCommunityPostAttachment = (
  value: unknown,
): value is CommunityPostAttachment =>
  isMatchup(value) || isLineup(value) || isTierList(value);

export const loadCommunityShareables = (): CommunityPostAttachment[] => {
  const saved = readJson<unknown>(SHAREABLES_KEY);
  if (!Array.isArray(saved)) {
    return [];
  }

  return saved.filter(isCommunityPostAttachment).slice(0, MAX_SHAREABLES);
};

const saveCommunityShareables = (entries: CommunityPostAttachment[]) => {
  writeJson(SHAREABLES_KEY, entries.slice(0, MAX_SHAREABLES));
};

export const rememberCommunityShareable = (
  entry: CommunityPostAttachment,
) => {
  const current = loadCommunityShareables();
  const next = [
    entry,
    ...current.filter((candidate) => {
      if (candidate.kind !== entry.kind) {
        return true;
      }
      if (candidate.kind === "matchup" && entry.kind === "matchup") {
        return !(
          candidate.userTeam === entry.userTeam &&
          candidate.opponentTeam === entry.opponentTeam &&
          candidate.savedAt === entry.savedAt
        );
      }
      if (candidate.kind === "lineup" && entry.kind === "lineup") {
        return !(
          candidate.title === entry.title &&
          candidate.resultLabel === entry.resultLabel &&
          candidate.savedAt === entry.savedAt
        );
      }
      if (candidate.kind === "tierList" && entry.kind === "tierList") {
        return candidate.publishedId !== entry.publishedId;
      }
      return true;
    }),
  ];
  saveCommunityShareables(next);
};

export const formatCommunityMatchupDetails = (
  attachment: CommunityMatchupAttachment,
) => {
  const verb =
    attachment.result === "win"
      ? "beat"
      : attachment.result === "loss"
        ? "lost to"
        : "tied";
  return {
    headline: `${attachment.userTeam} ${verb} ${attachment.opponentTeam}`,
    score: `${attachment.userOvr}–${attachment.opponentOvr} OVR · ${attachment.modeLabel}`,
    record: attachment.userWinRecord
      ? `Record ${attachment.userWinRecord}`
      : attachment.userRecord
        ? `Projected ${attachment.userRecord}`
        : null,
    yourFive: attachment.userLineupNames.join(", "),
    theirFive: attachment.opponentLineupNames.join(", "),
  };
};

export const formatCommunityAttachmentSummary = (
  attachment: CommunityPostAttachment,
) => {
  if (attachment.kind === "matchup") {
    const verb =
      attachment.result === "win"
        ? "beat"
        : attachment.result === "loss"
          ? "lost to"
          : "tied";
    return `${attachment.modeLabel}: ${attachment.userTeam} ${verb} ${attachment.opponentTeam} (${attachment.userOvr}–${attachment.opponentOvr} OVR)`;
  }

  if (attachment.kind === "tierList") {
    return `Tier list: ${attachment.title}`;
  }

  const result = attachment.resultLabel
    ? ` · ${attachment.resultLabel}`
    : attachment.ovr != null
      ? ` · ${attachment.ovr} OVR`
      : "";
  return `${attachment.modeLabel}: ${attachment.title}${result}`;
};

const resolvePlayersByIds = (
  ids: string[] | undefined,
  names: string[],
  playersById: Map<string, Player>,
): Player[] => {
  if (ids && ids.length > 0) {
    return ids
      .map((id) => playersById.get(id))
      .filter((player): player is Player => player != null);
  }

  const byName = new Map(
    [...playersById.values()].map((player) => [player.name, player]),
  );
  return names
    .map((name) => byName.get(name))
    .filter((player): player is Player => player != null);
};

/** Build a share-card input from a post attachment for on-demand image view. */
export const buildShareCardInputFromAttachment = (
  attachment: CommunityPostAttachment,
  playersById: Map<string, Player>,
): LineupShareCardInput | null => {
  if (attachment.kind === "tierList") {
    return null;
  }

  if (attachment.kind === "matchup") {
    const lineup = resolvePlayersByIds(
      attachment.userLineupIds,
      attachment.userLineupNames,
      playersById,
    );
    if (lineup.length === 0) {
      return null;
    }
    // Default view matches H2H "Share lineup": your five only.
    const winRecord = attachment.userWinRecord?.trim();
    const projectedRecord = attachment.userRecord?.trim();
    return {
      teamName: attachment.userTeam,
      accent: attachment.userAccent?.trim() || "#fb7185",
      ovr: attachment.userOvr,
      ovrOverflow: attachment.ovrOverflow,
      lineup,
      record: winRecord || projectedRecord || undefined,
      recordLabel: winRecord ? "Record" : projectedRecord ? "Projected" : undefined,
    };
  }

  const lineup = resolvePlayersByIds(
    attachment.lineupIds,
    attachment.lineupNames,
    playersById,
  );
  if (lineup.length === 0) {
    return null;
  }

  return {
    teamName: attachment.title,
    accent: attachment.accent?.trim() || "#22c55e",
    ovr: attachment.ovr ?? 0,
    lineup,
    headline: attachment.title,
    statLabel: "RESULT",
    statValue: attachment.resultLabel || undefined,
  };
};
