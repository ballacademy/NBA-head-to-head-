import { readJson, writeJson } from "./browserStorage";

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
  savedAt: string;
}

export interface CommunityLineupAttachment {
  kind: "lineup";
  title: string;
  modeLabel: string;
  ovr?: number;
  resultLabel?: string;
  lineupNames: string[];
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
    Array.isArray(entry.userLineupNames) &&
    Array.isArray(entry.opponentLineupNames)
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
    Array.isArray(entry.lineupNames)
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
