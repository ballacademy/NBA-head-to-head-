import {
  DEFAULT_CUSTOM_PAN,
  isPhotoPan,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { getTeam } from "../standingsComposer/teams";
import { splitPlayerName } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import type { TierPlayer } from "../tierListComposer/nbaActivePlayers";

export const DEFAULT_QUOTE = "I’M HIM.";
export const QUOTE_MAX = 180;
export const ATTRIB_MAX = 48;

export interface QuoteDraft {
  quote: string;
  attribution: string;
  playerId: string | null;
  teamId: string | null;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
  showHeadshot: boolean;
  showBa?: boolean;
}

const isNullableString = (value: unknown) =>
  typeof value === "string" || value === null;

export const isQuoteDraft = (value: unknown): value is QuoteDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as QuoteDraft).quote === "string" &&
      typeof (value as QuoteDraft).attribution === "string" &&
      isNullableString((value as QuoteDraft).playerId) &&
      isNullableString((value as QuoteDraft).teamId) &&
      isNullableString((value as QuoteDraft).photoSrc) &&
      typeof (value as QuoteDraft).customPhoto === "boolean" &&
      isPhotoPan((value as QuoteDraft).pan) &&
      typeof (value as QuoteDraft).showHeadshot === "boolean",
  );

export const defaultQuoteDraft = (): QuoteDraft => ({
  quote: DEFAULT_QUOTE,
  attribution: "",
  playerId: null,
  teamId: null,
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_CUSTOM_PAN },
  showHeadshot: true,
  showBa: true,
});

export const hasCustomPhoto = (draft: QuoteDraft) =>
  Boolean(draft.customPhoto && draft.photoSrc);

export const speakerNameFromPlayer = (player: TierPlayer) => {
  const names = splitPlayerName(player.name);
  return `${names.firstName} ${names.lastName}`.replace(/\s+/g, " ").trim();
};

/** Always refreshes name, team, and photo (unless keep-custom). Pull-quote stays. */
export const fillQuoteFromPlayer = (
  player: TierPlayer,
  previous: QuoteDraft,
  keepCustomPhoto = false,
): QuoteDraft => {
  const keep = keepCustomPhoto && hasCustomPhoto(previous);
  return {
    ...previous,
    playerId: player.id,
    teamId: getTeam(player.team)?.id ?? player.team ?? null,
    attribution: speakerNameFromPlayer(player).slice(0, ATTRIB_MAX),
    photoSrc: keep ? previous.photoSrc : player.headshotUrl,
    customPhoto: Boolean(keep),
    pan: keep ? { ...previous.pan } : { x: 0.5, y: 0.22, zoom: 1, rotate: 0 },
    showHeadshot: true,
  };
};

export const clearQuoteSpeaker = (draft: QuoteDraft): QuoteDraft => ({
  ...draft,
  playerId: null,
  teamId: null,
  attribution: "",
  photoSrc: hasCustomPhoto(draft) ? draft.photoSrc : null,
  customPhoto: hasCustomPhoto(draft),
});
