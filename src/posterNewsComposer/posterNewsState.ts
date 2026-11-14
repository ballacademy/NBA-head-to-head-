import {
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
  isPhotoPan,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { getTeam } from "../standingsComposer/teams";
import { splitComposerPersonName } from "../instagramComposer/composerNameStyle";
import type { TierPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  defaultLetterGradeFields,
  normalizeLetterGradeFields,
  type LetterGradeFields,
} from "../lib/letterGrade";

export const POSTER_NEWS_STORAGE_KEY = "ddgm:poster-news-composer";
export const POSTER_NEWS_SAVES_KEY = "ddgm:poster-news-composer:saves";
export const POSTER_KICKER_PRESETS = [
  "BREAKING",
  "REPORT",
  "STATEMENT",
  "INJURY",
] as const;
export type PosterKicker = (typeof POSTER_KICKER_PRESETS)[number];
export const POSTER_LINE_MAX = 48;
export const POSTER_KICKER_MAX = 18;

export type PosterNameMode = "name-stack" | "even";

export interface PosterNewsDraft extends LetterGradeFields {
  kicker: string;
  given: string;
  family: string;
  line1: string;
  line2: string;
  line3: string;
  nameMode: PosterNameMode;
  showDatePip: boolean;
  datePip: string;
  source: string;
  playerId: string | null;
  teamId: string | null;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
  showBa?: boolean;
}

const isNullable = (value: unknown) =>
  typeof value === "string" || value === null;

export const isPosterNewsDraft = (value: unknown): value is PosterNewsDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as PosterNewsDraft).kicker === "string",
  );

export const defaultPosterNewsDraft = (): PosterNewsDraft => ({
  kicker: "BREAKING",
  given: "",
  family: "",
  line1: "",
  line2: "",
  line3: "",
  nameMode: "name-stack",
  showDatePip: false,
  datePip: "",
  source: "",
  playerId: null,
  teamId: null,
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_CUSTOM_PAN },
  showBa: true,
  ...defaultLetterGradeFields(),
});

export const normalizePosterNewsDraft = (
  value: Partial<PosterNewsDraft>,
  fallback = defaultPosterNewsDraft(),
): PosterNewsDraft => ({
  ...fallback,
  ...value,
  ...normalizeLetterGradeFields(value),
  kicker: (value.kicker ?? fallback.kicker).slice(0, POSTER_KICKER_MAX),
  given: (value.given ?? fallback.given).slice(0, POSTER_LINE_MAX),
  family: (value.family ?? fallback.family).slice(0, POSTER_LINE_MAX),
  line1: (value.line1 ?? fallback.line1).slice(0, POSTER_LINE_MAX),
  line2: (value.line2 ?? fallback.line2).slice(0, POSTER_LINE_MAX),
  line3: (value.line3 ?? fallback.line3).slice(0, POSTER_LINE_MAX),
  nameMode: value.nameMode === "even" ? "even" : "name-stack",
  showDatePip: value.showDatePip === true,
  source: value.source ?? "",
  customPhoto: value.customPhoto === true,
  pan: isPhotoPan(value.pan) ? value.pan : fallback.pan,
  photoSrc: isNullable(value.photoSrc) ? value.photoSrc : fallback.photoSrc,
  playerId: isNullable(value.playerId) ? value.playerId : fallback.playerId,
  teamId: isNullable(value.teamId) ? value.teamId : fallback.teamId,
  showBa: value.showBa !== false,
  showLetterGrade: value.showLetterGrade === true,
});

export const parsePosterKicker = (value: unknown): PosterKicker =>
  POSTER_KICKER_PRESETS.includes(value as PosterKicker)
    ? (value as PosterKicker)
    : "BREAKING";

export const hasCustomPosterPhoto = (draft: PosterNewsDraft) =>
  Boolean(draft.customPhoto && draft.photoSrc);

export const setPosterNewsPhoto = (
  draft: PosterNewsDraft,
  dataUrl: string,
): PosterNewsDraft => ({
  ...draft,
  photoSrc: dataUrl,
  customPhoto: true,
  pan: { ...DEFAULT_CUSTOM_PAN },
});

/** Pick fills the headshot only — never writes the headline from a box score. */
export const applyPosterNewsPlayer = (
  draft: PosterNewsDraft,
  player: TierPlayer,
  keepPhoto: boolean,
): PosterNewsDraft => {
  const keep = keepPhoto && hasCustomPosterPhoto(draft);
  const names = splitComposerPersonName(player.name);
  return {
    ...draft,
    playerId: player.id,
    teamId: getTeam(player.team)?.id ?? player.team ?? null,
    given: draft.given || names.firstName,
    family: draft.family || names.lastName,
    photoSrc: keep ? draft.photoSrc : player.headshotUrl || null,
    customPhoto: Boolean(keep),
    pan: keep ? { ...draft.pan } : { ...DEFAULT_HEADSHOT_PAN },
  };
};

export const posterHeadlineLines = (draft: PosterNewsDraft) => {
  if (draft.nameMode === "even") {
    return [draft.line1, draft.line2, draft.line3].map((line) =>
      line.replace(/\s+/g, " ").trim(),
    );
  }
  return [draft.line1, draft.line2, draft.line3].map((line) =>
    line.replace(/\s+/g, " ").trim(),
  );
};

export const posterCaptionLines = (draft: PosterNewsDraft) =>
  [
    draft.kicker,
    draft.nameMode === "name-stack"
      ? `${draft.given} ${draft.family}`.trim()
      : "",
    ...posterHeadlineLines(draft),
  ].filter(Boolean);

export const pickDidNotWriteHeadline = (
  before: PosterNewsDraft,
  after: PosterNewsDraft,
) =>
  before.line1 === after.line1 &&
  before.line2 === after.line2 &&
  before.line3 === after.line3 &&
  before.kicker === after.kicker;
