import { readJson, writeJson } from "./browserStorage";
import type { LineupShareCardInput } from "./lineupShareCard";
import type { Player } from "./types";

export type CommunityShareableKind = "matchup" | "lineup" | "tierList";

export interface CommunityMatchupAttachment {
  kind: "matchup";
  modeLabel: string;
  result: "win" | "loss" | "tie";
  userTeam: string;
  /** Linked account username for share-card rebuilds. */
  username?: string;
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
  /** Projected season W–L for the opposing five (same format as userRecord). */
  opponentRecord?: string;
  /** Competitive W-L (or W-L-T) after the match, e.g. "12-5". */
  userWinRecord?: string;
  ovrOverflow?: number;
  opponentOvrOverflow?: number;
  savedAt: string;
}

/** Label for competitive monthly W–L on share cards and post attachments. */
export const COMMUNITY_COMPETITIVE_RECORD_LABEL = "This month";

export const formatCommunityCompetitiveRecord = (userWinRecord: string) =>
  `${COMMUNITY_COMPETITIVE_RECORD_LABEL} ${userWinRecord}`;

export const communityMatchupAttachmentViewLabel = (
  kind: "matchup" | "lineup",
) => (kind === "matchup" ? "View matchup" : "View lineup");

export const communityMatchupViewerToggleLabel = (
  showingFullMatchup: boolean,
) => (showingFullMatchup ? "View my lineup" : "View full matchup");

export const formatCommunityActivityStrip = (postsToday: number) =>
  `${postsToday} new post${postsToday === 1 ? "" : "s"} today`;

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
  /** Linked account username for share-card rebuilds. */
  username?: string;
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

export const formatShareableOvr = (ovr: number, overflow?: number) => {
  const extra = Math.max(0, Math.round(overflow ?? 0));
  return extra > 0 ? `${ovr}(+${extra})` : `${ovr}`;
};

const formatMatchupOvrPair = (attachment: CommunityMatchupAttachment) =>
  `${formatShareableOvr(attachment.userOvr, attachment.ovrOverflow)}–${formatShareableOvr(attachment.opponentOvr, attachment.opponentOvrOverflow)}`;

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

/** Newest remembered matchup/lineup/tier attachment, if any. */
export const getLatestCommunityShareable = () =>
  loadCommunityShareables()[0] ?? null;

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
    score: `${formatMatchupOvrPair(attachment)} OVR · ${attachment.modeLabel}`,
    record: attachment.userRecord
      ? `Projected ${attachment.userRecord}`
      : attachment.userWinRecord
        ? formatCommunityCompetitiveRecord(attachment.userWinRecord)
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
    return `${attachment.modeLabel}: ${attachment.userTeam} ${verb} ${attachment.opponentTeam} (${formatMatchupOvrPair(attachment)} OVR)`;
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
        : /casual|classic/i.test(attachment.modeLabel)
          ? "Casual"
          : /event/i.test(attachment.modeLabel)
            ? "Event"
            : /all[- ]?time/i.test(attachment.modeLabel)
              ? "All-Time"
              : /practice/i.test(attachment.modeLabel)
                ? "Practice"
                : /h2h|head/i.test(attachment.modeLabel)
                  ? "H2H"
                  : attachment.modeLabel.slice(0, 12);
    return `${mode} · ${result} · ${formatMatchupOvrPair(attachment)}`;
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
): { players: Player[]; missingCount: number } => {
  const byName = new Map(
    [...playersById.values()].map((player) => [player.name, player]),
  );

  if (ids && ids.length > 0) {
    const resolved = ids.map((id, index) => {
      const byId = playersById.get(id);
      if (byId) {
        return byId;
      }
      const fallbackName = names[index];
      return fallbackName ? byName.get(fallbackName) : undefined;
    });
    const players = resolved.filter(
      (player): player is Player => player != null,
    );
    return {
      players,
      missingCount: Math.max(0, ids.length - players.length),
    };
  }

  const resolved = names.map((name) => byName.get(name));
  const players = resolved.filter(
    (player): player is Player => player != null,
  );
  return {
    players,
    missingCount: Math.max(0, names.length - players.length),
  };
};

export const formatMissingPlayersShareWarning = (missingCount: number) => {
  if (missingCount <= 0) {
    return null;
  }
  return missingCount === 1
    ? "1 player couldn’t be resolved and was left out of the image."
    : `${missingCount} players couldn’t be resolved and were left out of the image.`;
};

const formatSavedFooterNote = (savedAt: string) => {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return `Saved ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
};

/** Build a share-card input from a post attachment for on-demand image view. */
export const buildShareCardInputFromAttachment = (
  attachment: CommunityPostAttachment,
  playersById: Map<string, Player>,
): (LineupShareCardInput & { missingPlayerCount: number }) | null => {
  if (attachment.kind === "tierList") {
    return null;
  }

  if (attachment.kind === "matchup") {
    const { players: lineup, missingCount } = resolvePlayersByIds(
      attachment.userLineupIds,
      attachment.userLineupNames,
      playersById,
    );
    if (lineup.length === 0) {
      return null;
    }
    // Default view matches H2H "Share lineup": your five + projected team W-L.
    const projectedRecord = attachment.userRecord?.trim();
    const winRecord = attachment.userWinRecord?.trim();
    return {
      teamName: attachment.userTeam,
      username: attachment.username,
      accent: attachment.userAccent?.trim() || "#fb7185",
      ovr: attachment.userOvr,
      ovrOverflow: attachment.ovrOverflow,
      lineup,
      subhead: attachment.modeLabel,
      footerNote: formatSavedFooterNote(attachment.savedAt),
      record: projectedRecord || winRecord || undefined,
      recordLabel: projectedRecord
        ? "Projected"
        : winRecord
          ? COMMUNITY_COMPETITIVE_RECORD_LABEL
          : undefined,
      missingPlayerCount: missingCount,
    };
  }

  const { players: lineup, missingCount } = resolvePlayersByIds(
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
    username: attachment.username,
    accent: attachment.accent?.trim() || "#22c55e",
    ovr: attachment.ovr ?? 0,
    lineup,
    headline: attachment.title,
    subhead: attachment.modeLabel,
    footerNote: formatSavedFooterNote(attachment.savedAt),
    statLabel: percentile || "RESULT",
    statValue: attachment.resultLabel || undefined,
    missingPlayerCount: missingCount,
  };
};

/** Build both sides of a matchup for the dual-team share image. */
export const buildMatchupShareCardInputsFromAttachment = (
  attachment: CommunityMatchupAttachment,
  playersById: Map<string, Player>,
): {
  user: LineupShareCardInput;
  opponent: LineupShareCardInput;
  missingPlayerCount: number;
} | null => {
  const user = buildShareCardInputFromAttachment(attachment, playersById);
  if (!user) {
    return null;
  }

  const { players: opponentLineup, missingCount: opponentMissing } =
    resolvePlayersByIds(
      attachment.opponentLineupIds,
      attachment.opponentLineupNames,
      playersById,
    );
  if (opponentLineup.length === 0) {
    return null;
  }

  const { missingPlayerCount: userMissing, ...userInput } = user;
  const projectedOpponentRecord = attachment.opponentRecord?.trim();

  return {
    user: userInput,
    opponent: {
      teamName: attachment.opponentTeam,
      accent: attachment.opponentAccent?.trim() || "#38bdf8",
      ovr: attachment.opponentOvr,
      ovrOverflow: attachment.opponentOvrOverflow,
      lineup: opponentLineup,
      headline: attachment.opponentTeam,
      // Mode label + saved date live on the top (user) card only so the
      // stacked matchup image doesn’t repeat Casual H2H / Saved date / brand.
      showBrandChrome: false,
      record: projectedOpponentRecord || undefined,
      recordLabel: projectedOpponentRecord ? "Projected" : undefined,
    },
    missingPlayerCount: userMissing + opponentMissing,
  };
};

/** Alias used by newer community post helpers. */
export type CommunityShareableAttachment = CommunityPostAttachment;
