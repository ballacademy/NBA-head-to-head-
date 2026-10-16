import type { LastGame } from "../playerOfTheDayComposer/lastGame";
import {
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
  isPhotoPan,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { getTeam } from "../standingsComposer/teams";
import { splitPlayerName } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import type { TierPlayer } from "../tierListComposer/nbaActivePlayers";

export const DEFAULT_QUOTE = "";
export const QUOTE_PRESETS = [
  "THEY CAN’T GUARD ME.",
  "THAT’S GAME.",
  "NIGHT NIGHT.",
  "FROM DOWNTOWN.",
] as const;

const foldQuote = (value: string) =>
  value.replace(/\s+/g, " ").trim().toUpperCase().replace(/[’']/g, "'");

/** Stock chips like I'M HIM skip the keep-quote dialog and stay on the graphic. */
export const isStockQuote = (value: string) => {
  const folded = foldQuote(value);
  return !folded || QUOTE_PRESETS.some((preset) => foldQuote(preset) === folded);
};
export const QUOTE_MAX = 180;
export const ATTRIB_MAX = 48;
export const SOURCE_MAX = 48;

export interface QuoteDraft {
  quote: string;
  attribution: string;
  source: string;
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
  source: "",
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

export const fillQuoteFromPlayer = (
  player: TierPlayer,
  previous: QuoteDraft,
  keepCustomPhoto = false,
  keepQuote = true,
): QuoteDraft => {
  const keep = keepCustomPhoto && hasCustomPhoto(previous);
  return {
    ...previous,
    playerId: player.id,
    teamId: getTeam(player.team)?.id ?? player.team ?? null,
    attribution: speakerNameFromPlayer(player).slice(0, ATTRIB_MAX),
    quote: keepQuote ? previous.quote : "",
    photoSrc: keep ? previous.photoSrc : player.headshotUrl || null,
    customPhoto: Boolean(keep),
    pan: keep ? { ...previous.pan } : { ...DEFAULT_HEADSHOT_PAN },
    showHeadshot: true,
    source: previous.source ?? "",
  };
};

export const lastGameQuoteLine = (game: LastGame | null | undefined) => {
  if (!game) {
    return "";
  }
  const pts = game.stats.pts.trim();
  const reb = game.stats.reb.trim();
  const ast = game.stats.ast.trim();
  const minMatch = String(game.stats.min).match(/^(\d+)/);
  const min = minMatch?.[1] ?? "";
  if (!pts || !reb || !ast) {
    return "";
  }
  return `${pts}/${reb}/${ast}${min ? ` IN ${min} MIN` : ""}`;
};

/** Chip presets from the last box — volume line first, then a punchy PTS line. */
export const lastGameQuotePresets = (game: LastGame | null | undefined) => {
  if (!game) {
    return [];
  }
  const presets: string[] = [];
  const line = lastGameQuoteLine(game);
  if (line) {
    presets.push(line);
  }
  const pts = game.stats.pts.trim();
  if (pts) {
    presets.push(`${pts} POINTS`);
  }
  const threeMakes = Number.parseFloat(
    String(game.stats.three).split("-")[0] ?? "",
  );
  if (Number.isFinite(threeMakes) && threeMakes >= 4) {
    presets.push(`${threeMakes} THREES`);
  }
  return presets;
};

export const setQuotePhoto = (draft: QuoteDraft, dataUrl: string): QuoteDraft => ({
  ...draft,
  photoSrc: dataUrl,
  customPhoto: true,
  pan: { ...DEFAULT_CUSTOM_PAN },
  showHeadshot: true,
});

export const clearQuoteSpeaker = (draft: QuoteDraft): QuoteDraft => ({
  ...draft,
  playerId: null,
  teamId: null,
  attribution: "",
  photoSrc: hasCustomPhoto(draft) ? draft.photoSrc : null,
  customPhoto: hasCustomPhoto(draft),
});
