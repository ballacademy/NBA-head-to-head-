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
  HL_FAMILY_SIZE,
  HL_FAMILY_TRACK,
  HL_NICK_AUTO_MIN,
  fitStackedName,
  headlinePanelTypeWidth,
  parseHeadlineBoardMode,
  parseHeadlineKickerMode,
  parseHeadlineLockup,
  parseHeadlineNamePlacement,
  parseHeadlineNameScope,
  parseHeadlineNameStack,
  parseHeadlinePanelLeft,
  parseHeadlinePlateColor,
  parseHeadlineSubjectMode,
  parseHeadlineWatermark,
  headlineDateKicker,
  wrapHeadlineBody,
  type HeadlineBoardMode,
  type HeadlineKickerMode,
  type HeadlineLockup,
  type HeadlineNamePlacement,
  type HeadlineNameScope,
  type HeadlineNameStack,
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
  parseHeadlineBoardMode,
  type HeadlineBoardMode,
  parseHeadlineNameScope,
  type HeadlineNameScope,
  parseHeadlineNameStack,
  type HeadlineNameStack,
  parseHeadlinePanelLeft,
};

export const DEFAULT_HEADLINE = "BREAKING";
export const DEFAULT_HEADLINE_BODY = "";
export const HEADLINE_BODY_MAX = 180;
export const HEADLINE_MAX = 48;
export const HEADLINE_NAME_MAX = 36;
export const HEADLINE_STORY_MAX = 72;
export const HEADLINE_META_MAX = 48;
export const HEADLINE_SOURCE_MAX = 28;
export const DEFAULT_HEADLINE_WATERMARK: HeadlineWatermark = "faint";

export const HEADLINE_SOURCE_PRESETS = [
  "ESPN",
  "Woj",
  "Shams",
  "Shams / ESPN",
  "Woj / ESPN",
  "The Athletic",
] as const;

/** Shorter lockups when the nickname is too long for the panel. */
export const TEAM_SHORT_LOCKUP: Record<string, string> = {
  MIN: "Wolves",
  POR: "Blazers",
  PHI: "Sixers",
  GSW: "Dubs",
  NOP: "Pels",
  LAC: "Clips",
  MEM: "Grizz",
};

export const HEADLINE_CAPTION_PRESETS: Record<string, string> = {
  BREAKING: "Breaking.",
  "TRADE RUMOR": "Trade rumor.",
  TRADE: "Traded.",
  SIGNING: "Signed.",
  WAIVED: "Waived.",
  "BOUGHT OUT": "Bought out.",
  EXTENSION: "Extension.",
  "RE-SIGNED": "Re-signed.",
  "BLOWN OUT": "Blown out.",
  "CAREER NIGHT": "Career night.",
  "DEFENSIVE CLINIC": "Defensive clinic.",
  OUT: "Out.",
  DOUBTFUL: "Doubtful.",
  QUESTIONABLE: "Questionable.",
  REST: "Rest.",
  GTD: "Game-time decision.",
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
  nameScope?: HeadlineNameScope;
  nameStack?: HeadlineNameStack;
  boardMode?: HeadlineBoardMode;
  panelLeft?: boolean;
  secondTeamId?: string | null;
  storyLine?: string;
  showMeta?: boolean;
  metaLine?: string;
  sourceCredit?: string;
  photoBw?: boolean;
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
  nameScope: "player",
  nameStack: "hurts",
  boardMode: "split",
  panelLeft: false,
  secondTeamId: null,
  storyLine: "",
  showMeta: false,
  metaLine: "",
  sourceCredit: "",
  photoBw: false,
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
  nameScope: parseHeadlineNameScope(
    draft.nameScope ?? (draft.subjectMode === "team" ? "auto" : "player"),
  ),
  nameStack: parseHeadlineNameStack(draft.nameStack),
  boardMode: parseHeadlineBoardMode(draft.boardMode),
  panelLeft: parseHeadlinePanelLeft(draft.panelLeft),
  secondTeamId: draft.secondTeamId ?? null,
  storyLine: typeof draft.storyLine === "string" ? draft.storyLine : "",
  showMeta: draft.showMeta === true,
  metaLine: typeof draft.metaLine === "string" ? draft.metaLine : "",
  sourceCredit: typeof draft.sourceCredit === "string" ? draft.sourceCredit : "",
  photoBw: draft.photoBw === true,
  opponentId: draft.opponentId ?? null,
  gameDate: draft.gameDate ?? null,
});

export const hasCustomPhoto = (draft: HeadlineDraft) =>
  stripHasCustomPhoto(draft as unknown as TotwStrip);

export const headlineLabel = (headline: string) =>
  normalizeComposerTitle(headline, DEFAULT_HEADLINE);

export const clipHeadlineBody = (value: string) =>
  value.slice(0, HEADLINE_BODY_MAX);

export const clipHeadlineName = (value: string) =>
  value.replace(/[\r\n]+/g, " ").slice(0, HEADLINE_NAME_MAX);

export const clipHeadlineStory = (value: string) =>
  value.replace(/[\r\n]+/g, " ").slice(0, HEADLINE_STORY_MAX);

export const clipHeadlineMeta = (value: string) =>
  value.replace(/[\r\n]+/g, " ").slice(0, HEADLINE_META_MAX);

export const clipHeadlineSource = (value: string) =>
  value.replace(/[\r\n]+/g, " ").slice(0, HEADLINE_SOURCE_MAX);

const titleCaseOverlay = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (/^\d/.test(word)) {
        return word.toUpperCase() === "76ERS" ? "76ers" : word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

export const teamShortLockup = (team: NbaTeam | null) => {
  if (!team) {
    return "";
  }
  return TEAM_SHORT_LOCKUP[team.id] ?? team.shortName;
};

export const pickHeadlineTeamOverlay = (
  team: NbaTeam | null,
  scope: HeadlineNameScope = "auto",
) => {
  if (!team) {
    return { firstName: "", lastName: "" };
  }
  const marks = splitTeamWordmark(team);
  const city = titleCaseOverlay(marks.city);
  const nick = titleCaseOverlay(marks.nick);
  const short = titleCaseOverlay(teamShortLockup(team));
  if (scope === "city") {
    return { firstName: city, lastName: "" };
  }
  if (scope === "nick") {
    return { firstName: city, lastName: nick };
  }
  if (scope === "short") {
    return { firstName: city, lastName: short };
  }
  const typeW = headlinePanelTypeWidth();
  const nickSize = fitStackedName(nick, HL_FAMILY_SIZE, HL_FAMILY_TRACK, typeW);
  if (nickSize >= HL_NICK_AUTO_MIN) {
    return { firstName: city, lastName: nick };
  }
  return { firstName: city, lastName: short };
};

export const headlineOverlayFromTeam = (team: NbaTeam | null) =>
  pickHeadlineTeamOverlay(team, "auto");

const overlayIsEmpty = (draft: Pick<HeadlineDraft, "firstName" | "lastName">) =>
  !draft.firstName.trim() && !draft.lastName.trim();

/** Switch stacked type only — photo, logo, and Team stay. */
export const applyHeadlineNameScope = (
  draft: HeadlineDraft,
  scope: HeadlineNameScope,
): HeadlineDraft => {
  if (scope === "player") {
    const player = getPlayer(draft.playerId);
    if (!player) {
      return { ...draft, nameScope: "player", subjectMode: "player" };
    }
    const names = splitPlayerName(player.name);
    return {
      ...draft,
      nameScope: "player",
      subjectMode: "player",
      firstName: names.firstName,
      lastName: names.lastName,
    };
  }
  return {
    ...draft,
    nameScope: scope,
    subjectMode: "team",
    ...pickHeadlineTeamOverlay(getTeam(draft.teamId), scope),
  };
};

export const applyHeadlineSubject = (
  draft: HeadlineDraft,
  mode: HeadlineSubjectMode,
): HeadlineDraft =>
  applyHeadlineNameScope(draft, mode === "team" ? "auto" : "player");

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
    nameScope: "player",
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
    subjectMode: "team",
    nameScope: previous.nameScope === "player" ? "auto" : previous.nameScope,
    boardMode:
      previous.boardMode === "team-only" ? "team-only" : previous.boardMode,
    ...pickHeadlineTeamOverlay(
      team,
      previous.nameScope === "player" ? "auto" : previous.nameScope,
    ),
  };
};

/** Logo and panel color follow Team. Overlay type stays unless it is still blank. */
export const setHeadlineTeamId = (
  draft: HeadlineDraft,
  teamId: string | null,
): HeadlineDraft => {
  if (!teamId) {
    return { ...draft, teamId: null };
  }
  const nextId = getTeam(teamId)?.id ?? teamId;
  if (overlayIsEmpty(draft)) {
    return {
      ...draft,
      teamId: nextId,
      ...headlineOverlayFromTeam(getTeam(nextId)),
    };
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

export const formatHeadlineMeta = (
  record: StandingRecord | null,
  gameDate?: string | null,
  game?: LastGame | null,
) => {
  const bits: string[] = [];
  if (record) {
    bits.push(formatHeadlineRecord(record));
  }
  if (game?.result) {
    bits.push(
      `${game.result} ${formatHeadlineScore(game.playerScore, game.opponentScore)}`,
    );
  }
  const date = headlineDateKicker(gameDate ?? game?.gameDate, "date");
  if (date) {
    bits.push(date);
  }
  return bits.join(" · ");
};

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
