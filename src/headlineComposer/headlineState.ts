import { normalizeComposerTitle } from "../instagramComposer/titleLayout";
import {
  clampPan,
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
  isPhotoPan,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { getTeam } from "../standingsComposer/teams";
import {
  hasCustomPhoto as stripHasCustomPhoto,
  splitPlayerName,
  type TotwStrip,
} from "../teamOfTheWeekComposer/teamOfTheWeekState";
import type { TierPlayer } from "../tierListComposer/nbaActivePlayers";

export { clampPan, type PhotoPan };

export const DEFAULT_HEADLINE = "MASSIVE LEAP";
export const DEFAULT_HEADLINE_BODY = "";
export const HEADLINE_BODY_MAX = 180;

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
});

export const hasCustomPhoto = (draft: HeadlineDraft) =>
  stripHasCustomPhoto(draft as unknown as TotwStrip);

export const headlineLabel = (headline: string) =>
  normalizeComposerTitle(headline, DEFAULT_HEADLINE);

export const clipHeadlineBody = (value: string) =>
  value.slice(0, HEADLINE_BODY_MAX);

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
    photoSrc: keep ? previous.photoSrc : player.headshotUrl,
    customPhoto: keep,
    pan: keep ? { ...previous.pan } : { ...DEFAULT_HEADSHOT_PAN },
  };
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
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_CUSTOM_PAN },
});
