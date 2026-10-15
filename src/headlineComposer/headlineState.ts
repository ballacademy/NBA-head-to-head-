import { normalizeComposerTitle } from "../instagramComposer/titleLayout";
import { graphicCaption } from "../instagramComposer/graphicCaption";
import {
  clampPan,
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
  isPhotoPan,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { getTeam, type NbaTeam } from "../standingsComposer/teams";
import type { LastGame } from "../playerOfTheDayComposer/lastGame";
import type { StandingRecord } from "../standingsComposer/rankingState";
import {
  hasCustomPhoto as stripHasCustomPhoto,
  splitPlayerName,
  type TotwStrip,
} from "../teamOfTheWeekComposer/teamOfTheWeekState";
import { getPlayer, type TierPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  parseHeadlineKickerMode,
  parseHeadlineLockup,
  parseHeadlineNamePlacement,
  parseHeadlinePlateColor,
  parseHeadlineSubjectMode,
  parseHeadlineWatermark,
  wrapHeadlineBody,
  type HeadlineKickerMode,
  type HeadlineLockup,
  type HeadlineNamePlacement,
  type HeadlinePlateColor,
  type HeadlineSubjectMode,
  type HeadlineWatermark,
} from "./headlineLayout";

export {
  clampPan,
  type PhotoPan,
  parseHeadlineWatermark,
  type HeadlineWatermark,
  parseHeadlinePlateColor,
  type HeadlinePlateColor,
  parseHeadlineLockup,
  type HeadlineLockup,
  parseHeadlineNamePlacement,
  type HeadlineNamePlacement,
  parseHeadlineKickerMode,
  type HeadlineKickerMode,
  parseHeadlineSubjectMode,
  type HeadlineSubjectMode,
};

export const DEFAULT_HEADLINE = "BREAKING";
export const DEFAULT_HEADLINE_BODY = "";
export const HEADLINE_BODY_MAX = 180;
export const HEADLINE_MAX = 48;
export const DEFAULT_HEADLINE_WATERMARK: HeadlineWatermark = "faint";

export const HEADLINE_CAPTION_PRESETS: Record<string, string> = {
  BREAKING: "Breaking.",
  "BLOWN OUT": "Blown out.",
  "CAREER NIGHT": "Career night.",
  "DEFENSIVE CLINIC": "Defensive clinic.",
  OUT: "Out.",
  QUESTIONABLE: "Questionable.",
  "MASSIVE LEAP": "The leap is real.",
  "STATEMENT WIN": "Statement made.",
  "HE’S HIM": "He’s him.",
  "HE'S HIM": "He’s him.",
  "HOT TAKE": "Hot take.",
  UNLOCKED: "Unlocked.",
};

export interface HeadlineDraft {
  headline: string;
  body: string;
  teamId: string | null;
  playerId: string | null;
  firstName: string;
  lastName: string;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
  showBa?: boolean;
  watermark?: HeadlineWatermark;
  plateColor?: HeadlinePlateColor;
  lockup?: HeadlineLockup;
  namePlacement?: HeadlineNamePlacement;
  showOpponentMark?: boolean;
  kickerMode?: HeadlineKickerMode;
  subjectMode?: HeadlineSubjectMode;
  opponentId?: string | null;
  gameDate?: string | null;
}

const isNullableString = (value: unknown) =>
  typeof value === "string" || value === null;

export const isHeadlineDraft = (value: unknown): value is HeadlineDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as HeadlineDraft).headline === "string" &&
      typeof (value as HeadlineDraft).body === "string" &&
      isNullableString((value as HeadlineDraft).teamId) &&
      isNullableString((value as HeadlineDraft).playerId) &&
      typeof (value as HeadlineDraft).firstName === "string" &&
      typeof (value as HeadlineDraft).lastName === "string" &&
      isNullableString((value as HeadlineDraft).photoSrc) &&
      typeof (value as HeadlineDraft).customPhoto === "boolean" &&
      isPhotoPan((value as HeadlineDraft).pan),
  );

export const defaultHeadlineDraft = (): HeadlineDraft => ({
  headline: DEFAULT_HEADLINE,
  body: DEFAULT_HEADLINE_BODY,
  teamId: null,
  playerId: null,
  firstName: "",
  lastName: "",
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_CUSTOM_PAN },
  showBa: true,
  watermark: DEFAULT_HEADLINE_WATERMARK,
  plateColor: "white",
  lockup: "bottom",
  namePlacement: "off",
  showOpponentMark: false,
  kickerMode: "off",
  subjectMode: "player",
  opponentId: null,
  gameDate: null,
});

export const normalizeHeadlineDraft = (draft: HeadlineDraft): HeadlineDraft => ({
  ...draft,
  showBa: draft.showBa !== false,
  watermark: parseHeadlineWatermark(draft.watermark),
  plateColor: parseHeadlinePlateColor(draft.plateColor),
  lockup: parseHeadlineLockup(draft.lockup),
  namePlacement: parseHeadlineNamePlacement(draft.namePlacement),
  showOpponentMark: draft.showOpponentMark === true,
  kickerMode: parseHeadlineKickerMode(draft.kickerMode),
  subjectMode: parseHeadlineSubjectMode(draft.subjectMode),
  opponentId: draft.opponentId ?? null,
  gameDate: draft.gameDate ?? null,
});

export const hasCustomPhoto = (draft: HeadlineDraft) =>
  stripHasCustomPhoto(draft as unknown as TotwStrip);

export const headlineLabel = (headline: string) =>
  normalizeComposerTitle(headline, DEFAULT_HEADLINE);

export const clipHeadlineBody = (value: string) =>
  value.slice(0, HEADLINE_BODY_MAX);

export const headlinePlayerName = (draft: Pick<HeadlineDraft, "firstName" | "lastName">) =>
  `${draft.firstName} ${draft.lastName}`.replace(/\s+/g, " ").trim();

export const fillHeadlineFromPlayer = (
  player: TierPlayer,
  previous: HeadlineDraft,
  keepCustomPhoto = false,
): HeadlineDraft => {
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
    subjectMode: "player",
    watermark: parseHeadlineWatermark(previous.watermark),
  };
};

export const fillHeadlineFromTeam = (
  teamId: string,
  previous: HeadlineDraft,
): HeadlineDraft => {
  const team = getTeam(teamId);
  return {
    ...previous,
    teamId: team?.id ?? teamId,
    playerId: null,
    firstName: "",
    lastName: "",
    photoSrc: previous.customPhoto ? previous.photoSrc : null,
    customPhoto: previous.customPhoto,
    pan: previous.customPhoto ? { ...previous.pan } : { ...DEFAULT_CUSTOM_PAN },
    subjectMode: "team",
  };
};

/** Team dropdown never labels a picked player as another club. */
export const setHeadlineTeamId = (
  draft: HeadlineDraft,
  teamId: string | null,
): HeadlineDraft => {
  if (!teamId) {
    return { ...draft, teamId: null };
  }
  const nextId = getTeam(teamId)?.id ?? teamId;
  if (draft.playerId) {
    const player = getPlayer(draft.playerId);
    const playerTeam = getTeam(player?.team)?.id ?? player?.team ?? null;
    if (playerTeam && playerTeam !== nextId) {
      return fillHeadlineFromTeam(nextId, draft);
    }
  }
  return { ...draft, teamId: nextId };
};

export const splitTeamWordmark = (team: NbaTeam | null) => {
  if (!team) {
    return { city: "", nick: "" };
  }
  const full = team.name.replace(/\s+/g, " ").trim();
  const nick = team.shortName.replace(/\s+/g, " ").trim();
  const escaped = nick.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const city = full.replace(new RegExp(`\\s+${escaped}$`, "i"), "").trim();
  return {
    city: (city && city !== full ? city : full).toUpperCase(),
    nick: nick.toUpperCase(),
  };
};

const SCORE_DASH = "\u2013";

export const formatHeadlineScore = (playerScore: string, opponentScore: string) =>
  `${playerScore}${SCORE_DASH}${opponentScore}`;

export const formatHeadlineRecord = (record: StandingRecord) =>
  `${record.wins}${SCORE_DASH}${record.losses}`;

export const formatHeadlineBodyLines = (
  team: NbaTeam | null,
  game: LastGame | null,
  record: StandingRecord | null,
): string[] => {
  if (!team) {
    return [];
  }
  const nick = team.shortName.toUpperCase();
  const rec = record ? formatHeadlineRecord(record) : "";
  const lines: string[] = [];
  if (game) {
    const score = formatHeadlineScore(game.playerScore, game.opponentScore);
    lines.push(
      game.result === "W"
        ? `AFTER BEATING ${game.opponentAbbrev} ${score}`
        : `AFTER LOSING TO ${game.opponentAbbrev} ${score}`,
    );
    if (rec) {
      lines.push(`LAST NIGHT, THE ${nick}`);
      lines.push(`HAVE A RECORD OF ${rec}`);
    } else {
      lines.push("LAST NIGHT");
    }
  } else if (rec) {
    lines.push(`THE ${nick} ARE ${rec}`);
  }
  return wrapHeadlineBody(lines.join("\n"));
};

export const formatHeadlineBody = (
  team: NbaTeam | null,
  game: LastGame | null,
  record: StandingRecord | null,
) => formatHeadlineBodyLines(team, game, record).join("\n");

export const headlineBodyLines = (body: string) => wrapHeadlineBody(body);

export const headlineCaptionFor = (
  headline: string,
  body: string,
  playerName = "",
) => {
  const title = headlineLabel(headline);
  const punch = HEADLINE_CAPTION_PRESETS[title] ?? "";
  return graphicCaption(
    title,
    playerName ? [playerName] : [],
    [punch, body.replace(/\n/g, " ")],
  );
};

export const setHeadlinePhoto = (
  draft: HeadlineDraft,
  dataUrl: string,
): HeadlineDraft => ({
  ...draft,
  photoSrc: dataUrl,
  customPhoto: true,
  pan: { ...DEFAULT_CUSTOM_PAN },
});

export const clearHeadlineSubject = (draft: HeadlineDraft): HeadlineDraft => ({
  ...draft,
  playerId: null,
  firstName: "",
  lastName: "",
  photoSrc: draft.customPhoto ? draft.photoSrc : null,
  customPhoto: draft.customPhoto,
  opponentId: null,
  gameDate: null,
});
