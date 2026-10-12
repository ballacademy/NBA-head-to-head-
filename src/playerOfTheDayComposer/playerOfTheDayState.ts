import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { getPlayer, type TierPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  emptyStats,
  todayDateLabel,
  type LastGame,
  type LastGameStats,
} from "./lastGame";

export { DEFAULT_BRAND };

export const DEFAULT_POTD_TITLE = "PLAYER OF THE DAY?";
export const POTD_TITLE_TRACK = 0.02;
export const POTD_CARD_COUNT = 2;

export interface PhotoPan {
  x: number;
  y: number;
}

export const DEFAULT_HEADSHOT_PAN: PhotoPan = { x: 0.5, y: 0.22 };
export const DEFAULT_CUSTOM_PAN: PhotoPan = { x: 0.5, y: 0.5 };

export interface PotdCard {
  playerId: string | null;
  teamId: string | null;
  firstName: string;
  lastName: string;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
  total: string;
  stats: LastGameStats;
  result: string;
}

export interface PotdDraft {
  brand: string;
  title: string;
  date: string;
  cards: PotdCard[];
}

export const splitPlayerName = (name: string) => {
  const parts = name.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: "" };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1)!,
  };
};

export const createEmptyCard = (): PotdCard => ({
  playerId: null,
  teamId: null,
  firstName: "",
  lastName: "",
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_HEADSHOT_PAN },
  total: "0",
  stats: emptyStats(),
  result: "",
});

export const createEmptyCards = (): PotdCard[] =>
  Array.from({ length: POTD_CARD_COUNT }, createEmptyCard);

export const isPhotoPan = (value: unknown): value is PhotoPan =>
  Boolean(
    value &&
      typeof value === "object" &&
      Number.isFinite((value as PhotoPan).x) &&
      Number.isFinite((value as PhotoPan).y),
  );

export const clampPan = (pan: PhotoPan): PhotoPan => ({
  x: Math.min(1, Math.max(0, pan.x)),
  y: Math.min(1, Math.max(0, pan.y)),
});

const isStats = (value: unknown): value is LastGameStats =>
  Boolean(
    value &&
      typeof value === "object" &&
      ["pts", "reb", "ast", "stl", "blk", "fg", "three", "tov"].every(
        (key) => typeof (value as Record<string, unknown>)[key] === "string",
      ),
  );

export const isPotdCard = (value: unknown): value is PotdCard =>
  Boolean(
    value &&
      typeof value === "object" &&
      (typeof (value as PotdCard).playerId === "string" ||
        (value as PotdCard).playerId === null) &&
      (typeof (value as PotdCard).teamId === "string" ||
        (value as PotdCard).teamId === null) &&
      typeof (value as PotdCard).firstName === "string" &&
      typeof (value as PotdCard).lastName === "string" &&
      (typeof (value as PotdCard).photoSrc === "string" ||
        (value as PotdCard).photoSrc === null) &&
      typeof (value as PotdCard).customPhoto === "boolean" &&
      isPhotoPan((value as PotdCard).pan) &&
      typeof (value as PotdCard).total === "string" &&
      isStats((value as PotdCard).stats) &&
      typeof (value as PotdCard).result === "string",
  );

export const isPotdDraft = (value: unknown): value is PotdDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as PotdDraft).brand === "string" &&
      typeof (value as PotdDraft).title === "string" &&
      typeof (value as PotdDraft).date === "string" &&
      Array.isArray((value as PotdDraft).cards) &&
      (value as PotdDraft).cards.length === POTD_CARD_COUNT &&
      (value as PotdDraft).cards.every(isPotdCard),
  );

export const splitPotdTitle = (title: string): string[] =>
  splitBalancedTitle(title, DEFAULT_POTD_TITLE, POTD_TITLE_TRACK);

export const fillCardFromPlayer = (
  player: TierPlayer,
  game: LastGame | null,
  previous?: PotdCard,
): PotdCard => {
  const names = splitPlayerName(player.name);
  const teamId = game?.teamId || player.team;
  return {
    playerId: player.id,
    teamId: getTeam(teamId)?.id ?? player.team,
    firstName: names.firstName,
    lastName: names.lastName,
    photoSrc: player.headshotUrl,
    customPhoto: false,
    pan: { ...DEFAULT_HEADSHOT_PAN },
    total: previous?.total ?? "0",
    stats: game?.stats ?? emptyStats(),
    result: game?.resultLine ?? "",
  };
};

export const applyPlayerPick = (
  cards: PotdCard[],
  index: number,
  player: TierPlayer,
  game: LastGame | null,
): PotdCard[] => {
  if (index < 0 || index >= cards.length) {
    return cards;
  }
  const next = cards.map((card, cardIndex) =>
    cardIndex === index ? fillCardFromPlayer(player, game, card) : { ...card },
  );
  const pickedId = player.id;
  return next.map((card, cardIndex) => {
    if (cardIndex !== index && card.playerId === pickedId) {
      return createEmptyCard();
    }
    return card;
  });
};

export const clearCard = (cards: PotdCard[], index: number): PotdCard[] => {
  if (index < 0 || index >= cards.length) {
    return cards;
  }
  const next = cards.slice();
  next[index] = createEmptyCard();
  return next;
};

export const patchCard = (
  cards: PotdCard[],
  index: number,
  patch: Partial<PotdCard>,
): PotdCard[] => {
  if (index < 0 || index >= cards.length) {
    return cards;
  }
  const next = cards.slice();
  const current = next[index]!;
  next[index] = {
    ...current,
    ...patch,
    pan: patch.pan ? clampPan(patch.pan) : current.pan,
    stats: patch.stats ? { ...current.stats, ...patch.stats } : current.stats,
  };
  return next;
};

export const setCardPhoto = (
  cards: PotdCard[],
  index: number,
  dataUrl: string,
): PotdCard[] =>
  patchCard(cards, index, {
    photoSrc: dataUrl,
    customPhoto: true,
    pan: { ...DEFAULT_CUSTOM_PAN },
  });

export const usedPlayerIds = (cards: PotdCard[]) => {
  const used: Record<string, string> = {};
  cards.forEach((card, index) => {
    if (card.playerId) {
      used[card.playerId] = index === 0 ? "Left card" : "Right card";
    }
  });
  return used;
};

export const playerForCard = (card: PotdCard) => getPlayer(card.playerId);

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export const exportPotdFilename = (title: string) => {
  const stem = slugify(title) || "player-of-the-day";
  return `${stem}.png`;
};

export const defaultPotdDraft = (): PotdDraft => ({
  brand: DEFAULT_BRAND,
  title: DEFAULT_POTD_TITLE,
  date: todayDateLabel(),
  cards: createEmptyCards(),
});
