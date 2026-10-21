import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import {
  readLeaderboardDraft,
  winsForName,
} from "../potdLeaderboardComposer/potdLeaderboardState";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { getPlayer, type TierPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  emptyStats,
  todayDateLabel,
  type LastGame,
  type LastGameStats,
} from "./lastGame";
import {
  totwCountingScore,
  totwEfficiencyIndex,
  type NightStandout,
} from "./nightStandouts";

export { DEFAULT_BRAND };

export const DEFAULT_POTD_TITLE = "PLAYER OF THE DAY?";
export const POTD_TITLE_TRACK = 0.02;
export const POTD_CARD_COUNT = 2;
export const POTD_FILL_COUNT = 2;
export const POTD_PICKER_LIMIT = 8;
/** Light mint/coral so W/L still reads on dark team-color bars. */
export const POTD_WL_WIN = "#7EFF96";
export const POTD_WL_LOSS = "#FF7E7E";

export const potdResultOutcome = (result: string): "W" | "L" | null => {
  const token = result
    .toUpperCase()
    .split(/\s+/)
    .find((part) => part === "W" || part === "L");
  return token === "W" || token === "L" ? token : null;
};

export const potdResultFill = (result: string, on: boolean) => {
  if (!on) {
    return null;
  }
  const outcome = potdResultOutcome(result);
  if (outcome === "W") {
    return POTD_WL_WIN;
  }
  if (outcome === "L") {
    return POTD_WL_LOSS;
  }
  return null;
};

export const potdNightHeading = (
  date: string,
  todayIso: string,
  yesterdayIso: string,
) => {
  if (date === todayIso) {
    return "Tonight’s best";
  }
  if (date === yesterdayIso) {
    return "Last night’s best";
  }
  return `Best · ${date}`;
};

const minutesPlayed = (stats: LastGameStats) => {
  const value = Number.parseFloat(stats.min);
  return Number.isFinite(value) ? value : 0;
};

/** TOTW counting × efficiency on one night — no surprise / over-expectation. */
export const potdNightScore = (row: NightStandout) =>
  totwCountingScore(row.game.stats) * totwEfficiencyIndex(row.game.stats);

export const rankPotdNightBest = (rows: NightStandout[]) => {
  const seen = new Set<string>();
  const eligible: NightStandout[] = [];
  for (const row of rows) {
    if (minutesPlayed(row.game.stats) <= 0 || seen.has(row.athleteId)) {
      continue;
    }
    if (!getPlayer(row.athleteId)) {
      continue;
    }
    seen.add(row.athleteId);
    eligible.push(row);
  }
  return eligible.sort((left, right) => {
    const score = potdNightScore(right) - potdNightScore(left);
    if (score) {
      return score;
    }
    const counting =
      totwCountingScore(right.game.stats) - totwCountingScore(left.game.stats);
    if (counting) {
      return counting;
    }
    return right.score - left.score;
  });
};

export const fillPotdFromStandouts = (
  cards: PotdCard[],
  rows: NightStandout[],
): PotdCard[] => {
  const ranked = rankPotdNightBest(rows);
  const next = cards.map((card, index) => {
    if (index >= POTD_FILL_COUNT) {
      return { ...card };
    }
    const row = ranked[index];
    if (!row) {
      return createEmptyCard();
    }
    const player = getPlayer(row.athleteId);
    if (!player) {
      return createEmptyCard();
    }
    return fillCardFromPlayer(
      player,
      row.game,
      card,
      leaderboardTotalForName(player.name),
      false,
    );
  });
  return applyLeaderboardTotals(next);
};

const recBadge = (row: NightStandout, index: number) => {
  const flag = row.flags.find((item) => item !== "Hot night");
  if (index === 0) {
    return flag ?? "#1";
  }
  return flag ?? `#${index + 1}`;
};

/** Best-of-night names for the existing picker recs. Used pair stay listed. */
export const potdPickerSuggestions = (
  rows: NightStandout[],
  limit = POTD_PICKER_LIMIT,
) =>
  rankPotdNightBest(rows)
    .slice(0, limit)
    .map((row, index) => ({
      id: row.athleteId,
      badge: recBadge(row, index),
      meta: row.line,
    }));

export interface PhotoPan {
  x: number;
  y: number;
  zoom?: number;
  rotate?: number;
}

export const MIN_PHOTO_ZOOM = 1;
export const MAX_PHOTO_ZOOM = 6;
export const DEFAULT_PHOTO_ZOOM = 1;

export const DEFAULT_HEADSHOT_PAN: PhotoPan = {
  x: 0.5,
  y: 0.22,
  zoom: DEFAULT_PHOTO_ZOOM,
  rotate: 0,
};
export const DEFAULT_CUSTOM_PAN: PhotoPan = {
  x: 0.5,
  y: 0.5,
  zoom: DEFAULT_PHOTO_ZOOM,
  rotate: 0,
};

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
  showBa?: boolean;
  wlColor?: boolean;
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

export const blankStats = (): LastGameStats => ({
  pts: "—",
  reb: "—",
  ast: "—",
  stl: "—",
  blk: "—",
  fg: "—",
  three: "—",
  tov: "—",
  min: "—",
  ft: "—",
});

export const createEmptyCard = (): PotdCard => ({
  playerId: null,
  teamId: null,
  firstName: "",
  lastName: "",
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_HEADSHOT_PAN },
  total: "",
  stats: blankStats(),
  result: "",
});

export const createEmptyCards = (): PotdCard[] =>
  Array.from({ length: POTD_CARD_COUNT }, createEmptyCard);

export const isPhotoPan = (value: unknown): value is PhotoPan =>
  Boolean(
    value &&
      typeof value === "object" &&
      Number.isFinite((value as PhotoPan).x) &&
      Number.isFinite((value as PhotoPan).y) &&
      ((value as PhotoPan).zoom === undefined ||
        Number.isFinite((value as PhotoPan).zoom)) &&
      ((value as PhotoPan).rotate === undefined ||
        Number.isFinite((value as PhotoPan).rotate)),
  );

export const clampZoom = (zoom: number) =>
  Math.min(MAX_PHOTO_ZOOM, Math.max(MIN_PHOTO_ZOOM, zoom));

export const photoZoom = (pan: PhotoPan) =>
  clampZoom(
    Number.isFinite(pan.zoom) ? (pan.zoom as number) : DEFAULT_PHOTO_ZOOM,
  );

export const photoRotate = (pan: PhotoPan) => {
  const value = Number.isFinite(pan.rotate) ? (pan.rotate as number) : 0;
  const wrapped = ((value % 360) + 360) % 360;
  return wrapped;
};

export const clampPan = (pan: PhotoPan): PhotoPan => ({
  x: Math.min(1, Math.max(0, pan.x)),
  y: Math.min(1, Math.max(0, pan.y)),
  zoom: photoZoom(pan),
  rotate: photoRotate(pan),
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

export const hasCustomPhoto = (slot: {
  customPhoto: boolean;
  photoSrc: string | null;
}) => Boolean(slot.customPhoto && slot.photoSrc);

export const fillCardFromPlayer = (
  player: TierPlayer,
  game: LastGame | null,
  previous?: PotdCard,
  total = "0",
  keepCustomPhoto = false,
): PotdCard => {
  const names = splitPlayerName(player.name);
  const teamId = game?.teamId || player.team;
  const keep = keepCustomPhoto && previous ? hasCustomPhoto(previous) : false;
  return {
    playerId: player.id,
    teamId: getTeam(teamId)?.id ?? player.team,
    firstName: names.firstName,
    lastName: names.lastName,
    photoSrc: keep ? previous!.photoSrc : player.headshotUrl,
    customPhoto: keep,
    pan: keep ? { ...previous!.pan } : { ...DEFAULT_HEADSHOT_PAN },
    total,
    stats: game?.stats ?? emptyStats(),
    result: game?.resultLine ?? "",
  };
};

export const applyPlayerPick = (
  cards: PotdCard[],
  index: number,
  player: TierPlayer,
  game: LastGame | null,
  total = "0",
  keepCustomPhoto = false,
): PotdCard[] => {
  if (index < 0 || index >= cards.length) {
    return cards;
  }
  const next = cards.map((card, cardIndex) =>
    cardIndex === index
      ? fillCardFromPlayer(player, game, card, total, keepCustomPhoto)
      : { ...card },
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

export const cardPlayerName = (card: PotdCard) =>
  `${card.firstName} ${card.lastName}`.replace(/\s+/g, " ").trim();

export const leaderboardTotalForName = (name: string) =>
  String(winsForName(name, readLeaderboardDraft().entries));

export const applyLeaderboardTotals = (cards: PotdCard[]): PotdCard[] => {
  const entries = readLeaderboardDraft().entries;
  return cards.map((card) => {
    const name = cardPlayerName(card);
    if (!name) {
      return card;
    }
    return { ...card, total: String(winsForName(name, entries)) };
  });
};

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
  wlColor: false,
});
