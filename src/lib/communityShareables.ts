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
  opponentLineupIds?: string[];
  userAccent?: string;
  opponentAccent?: string;
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
  /** e.g. "Top 12%" when a Daily percentile is known. */
  percentileLabel?: string;
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

  const parts: string[] = [];
  if (attachment.resultLabel) {
    parts.push(attachment.resultLabel);
  } else if (attachment.ovr != null) {
    parts.push(`${attachment.ovr} OVR`);
  }
  if (attachment.percentileLabel) {
    parts.push(attachment.percentileLabel);
  }
  const result = parts.length > 0 ? ` · ${parts.join(" · ")}` : "";
  return `${attachment.modeLabel}: ${attachment.title}${result}`;
};

/** Compact chip label for post cards and attach dropdowns. */
export const formatCommunityAttachmentChip = (
  attachment: CommunityPostAttachment,
) => {
  if (attachment.kind === "matchup") {
    const result =
      attachment.result === "win"
        ? "W"
        : attachment.result === "loss"
          ? "L"
          : "T";
    const mode =
      /pro|salary|ranked/i.test(attachment.modeLabel)
        ? "Pro"
        : /classic|casual|h2h|head/i.test(attachment.modeLabel)
          ? "H2H"
          : /event/i.test(attachment.modeLabel)
            ? "Event"
            : /practice/i.test(attachment.modeLabel)
              ? "Practice"
              : attachment.modeLabel.slice(0, 12);
    return `${mode} · ${result} · ${attachment.userOvr}–${attachment.opponentOvr}`;
  }

  if (attachment.kind === "tierList") {
    const title =
      attachment.title.trim().length > 28
        ? `${attachment.title.trim().slice(0, 27)}…`
        : attachment.title.trim();
    return `Tier · ${title || "List"}`;
  }

  const mode = /daily/i.test(attachment.modeLabel)
    ? "Daily"
    : attachment.modeLabel.slice(0, 12);
  const detail =
    attachment.percentileLabel?.trim() ||
    attachment.resultLabel?.trim() ||
    (attachment.ovr != null ? `${attachment.ovr} OVR` : null);
  return detail ? `${mode} · ${detail}` : mode;
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

  const percentile = attachment.percentileLabel?.trim();
  return {
    teamName: attachment.title,
    accent: attachment.accent?.trim() || "#22c55e",
    ovr: attachment.ovr ?? 0,
    lineup,
    headline: attachment.title,
    statLabel: percentile || "RESULT",
    statValue: attachment.resultLabel || undefined,
  };
};

/** Build both sides of a matchup for the dual-team share image. */
export const buildMatchupShareCardInputsFromAttachment = (
  attachment: CommunityMatchupAttachment,
  playersById: Map<string, Player>,
): { user: LineupShareCardInput; opponent: LineupShareCardInput } | null => {
  const user = buildShareCardInputFromAttachment(attachment, playersById);
  if (!user) {
    return null;
  }

  const opponentLineup = resolvePlayersByIds(
    attachment.opponentLineupIds,
    attachment.opponentLineupNames,
    playersById,
  );
  if (opponentLineup.length === 0) {
    return null;
  }

  return {
    user,
    opponent: {
      teamName: attachment.opponentTeam,
      accent: attachment.opponentAccent?.trim() || "#38bdf8",
      ovr: attachment.opponentOvr,
      lineup: opponentLineup,
      headline: attachment.opponentTeam,
    },
  };
};

/** Alias used by newer community post helpers. */
export type CommunityShareableAttachment = CommunityPostAttachment;
