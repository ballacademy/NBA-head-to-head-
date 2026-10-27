import {
  parseComposerWatermark,
  type ComposerWatermark,
} from "../instagramComposer/composerWatermark";
import {
  mondayOfIsoWeek,
  rangeWeekLine,
  thisWeekRange,
} from "../instagramComposer/composerDateRange";
import { insertItems, swapItems } from "../instagramComposer/composerSlotSwap";
import {
  measureTitleAdvance,
  splitBalancedTitle,
} from "../instagramComposer/titleLayout";
import { isoDateOnly, nbaTodayIso, shiftIsoDate } from "../playerOfTheDayComposer/lastGame";
import type { NightStandout } from "../playerOfTheDayComposer/nightStandouts";
import {
  clampPan,
  DEFAULT_HEADSHOT_PAN,
  isPhotoPan,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { splitPlayerName } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import { selectPlusStarters } from "../teamOfTheWeekPlusComposer/teamOfTheWeekPlusState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { SCC_TITLE_MAX_EM, SCC_TITLE_TRACK } from "../statCardCoverComposer/statCardCoverLayout";

export { clampPan, type PhotoPan };

export const TAKEAWAYS_STORAGE_KEY = "ddgm:takeaways-composer";
export const TAKEAWAYS_SAVES_KEY = "ddgm:takeaways-composer:saves";

export const DEFAULT_TAKEAWAYS_TITLE = "NBA TAKEAWAYS";
export const TAKEAWAYS_TITLE_MAX = 48;
export const TAKEAWAYS_LINE_MAX = 72;
export const TAKEAWAYS_FACT_MAX = 24;
export const TAKEAWAYS_CARD_MIN = 3;
export const TAKEAWAYS_CARD_MAX = 8;
export const TAKEAWAYS_CARD_DEFAULT = 5;
/** 2026-27 opening night — WEEK 1 is that ISO week. */
export const TAKEAWAYS_SEASON_OPEN = "2026-10-21";

export type TakeawaysCoverFaces = 0 | 3 | 4;
export type TakeawaysTitleStyle = "lockup" | "plate";
export type TakeawaysWeekPip = "week-x" | "week-of";
export type TakeawaysCoverField = "standouts" | "metal";
export type TakeawaysWell = "fade" | "overlay" | "metal" | "charcoal" | "team";

export interface TakeawaysCard {
  playerId: string | null;
  teamId: string | null;
  firstName: string;
  lastName: string;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
  line1: string;
  line2: string;
  fact: string;
}

export interface TakeawaysDraft {
  brand: string;
  title: string;
  weekLine: string;
  rangeLine: string;
  from: string;
  to: string;
  cards: TakeawaysCard[];
  currentIndex: number;
  coverFaces: TakeawaysCoverFaces;
  titleStyle: TakeawaysTitleStyle;
  weekPip: TakeawaysWeekPip;
  coverField: TakeawaysCoverField;
  well: TakeawaysWell;
  showRangeUnderPip: boolean;
  showIndex: boolean;
  showWeekGhost: boolean;
  showFactChip: boolean;
  showBa?: boolean;
  showGold?: boolean;
  watermark?: ComposerWatermark;
  autoWeek?: boolean;
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const isNullableString = (value: unknown) =>
  typeof value === "string" || value === null;

export const parseTakeawaysCoverFaces = (value: unknown): TakeawaysCoverFaces => {
  if (value === 0 || value === "0" || value === "none" || value === "type") {
    return 0;
  }
  if (value === 4 || value === "4") {
    return 4;
  }
  return 3;
};

export const parseTakeawaysCardCount = (value: unknown) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) {
    return TAKEAWAYS_CARD_DEFAULT;
  }
  return Math.max(TAKEAWAYS_CARD_MIN, Math.min(TAKEAWAYS_CARD_MAX, n));
};

export const parseTakeawaysTitleStyle = (value: unknown): TakeawaysTitleStyle =>
  value === "plate" ? "plate" : "lockup";

export const parseTakeawaysWeekPip = (value: unknown): TakeawaysWeekPip =>
  value === "week-of" ? "week-of" : "week-x";

export const parseTakeawaysCoverField = (value: unknown): TakeawaysCoverField =>
  value === "metal" ? "metal" : "standouts";

export const parseTakeawaysWell = (value: unknown): TakeawaysWell => {
  if (
    value === "overlay" ||
    value === "metal" ||
    value === "charcoal" ||
    value === "team"
  ) {
    return value;
  }
  return "fade";
};

export const emptyTakeawaysCard = (): TakeawaysCard => ({
  playerId: null,
  teamId: null,
  firstName: "",
  lastName: "",
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_HEADSHOT_PAN },
  line1: "",
  line2: "",
  fact: "",
});

export const emptyTakeawaysCards = (count = TAKEAWAYS_CARD_DEFAULT) =>
  Array.from({ length: parseTakeawaysCardCount(count) }, emptyTakeawaysCard);

export const isTakeawaysCard = (value: unknown): value is TakeawaysCard =>
  Boolean(
    value &&
      typeof value === "object" &&
      isNullableString((value as TakeawaysCard).playerId) &&
      isNullableString((value as TakeawaysCard).teamId) &&
      typeof (value as TakeawaysCard).firstName === "string" &&
      typeof (value as TakeawaysCard).lastName === "string" &&
      isNullableString((value as TakeawaysCard).photoSrc) &&
      typeof (value as TakeawaysCard).customPhoto === "boolean" &&
      isPhotoPan((value as TakeawaysCard).pan) &&
      typeof ((value as TakeawaysCard).line1 ?? "") === "string",
  );

export const isTakeawaysDraft = (value: unknown): value is TakeawaysDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as TakeawaysDraft).brand === "string" &&
      typeof (value as TakeawaysDraft).title === "string" &&
      Array.isArray((value as TakeawaysDraft).cards) &&
      (value as TakeawaysDraft).cards.every(isTakeawaysCard),
  );

const daysBetween = (from: string, to: string) => {
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return 0;
  }
  return Math.round((b - a) / 86400000);
};

export const nbaTakeawaysWeekNumber = (
  iso: string,
  open = TAKEAWAYS_SEASON_OPEN,
) => {
  const weekMonday = mondayOfIsoWeek(isoDateOnly(iso) || nbaTodayIso());
  const openMonday = mondayOfIsoWeek(open);
  const weeks = Math.floor(daysBetween(openMonday, weekMonday) / 7);
  return Math.max(1, weeks + 1);
};

export const takeawaysWeekX = (iso: string) =>
  `WEEK ${nbaTakeawaysWeekNumber(iso)}`;

export const takeawaysWeekOf = (from: string, to: string) => {
  const line = rangeWeekLine(from, to);
  return line ? `WEEK OF ${line}` : "";
};

export const takeawaysRangeLine = (from: string, to: string) => {
  const start = isoDateOnly(from);
  const end = isoDateOnly(to) || start;
  const startMatch = start.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const endMatch = end.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!startMatch || !endMatch) {
    return "";
  }
  const startMonth = MONTHS[Number(startMatch[2]) - 1] ?? "";
  const endMonth = MONTHS[Number(endMatch[2]) - 1] ?? "";
  const startDay = Number(startMatch[3]);
  const endDay = Number(endMatch[3]);
  if (start === end) {
    return `${startMonth} ${startDay}`;
  }
  if (startMatch[2] === endMatch[2]) {
    return `${startMonth} ${startDay}–${endDay}`;
  }
  return `${startMonth} ${startDay}–${endMonth} ${endDay}`;
};

export const takeawaysWeekPill = (draft: TakeawaysDraft) => {
  const line = draft.weekLine.replace(/\s+/g, " ").trim();
  if (line) {
    return line.toUpperCase();
  }
  return draft.weekPip === "week-of"
    ? takeawaysWeekOf(draft.from, draft.to)
    : takeawaysWeekX(draft.from);
};

export const isAutoTakeawaysTitle = (title: string) =>
  title.replace(/\s+/g, " ").trim().toUpperCase() === DEFAULT_TAKEAWAYS_TITLE;

export const splitTakeawaysTitle = (
  title: string,
  style: TakeawaysTitleStyle = "lockup",
) => {
  const text =
    title.replace(/\s+/g, " ").trim().toUpperCase() || DEFAULT_TAKEAWAYS_TITLE;
  if (style === "plate") {
    return [text];
  }
  if (text === DEFAULT_TAKEAWAYS_TITLE) {
    return ["NBA", "TAKEAWAYS"];
  }
  if (measureTitleAdvance(text, SCC_TITLE_TRACK) <= SCC_TITLE_MAX_EM) {
    return [text];
  }
  return splitBalancedTitle(text, DEFAULT_TAKEAWAYS_TITLE, SCC_TITLE_TRACK);
};

export const takeawaysCardName = (card: TakeawaysCard) =>
  `${card.firstName} ${card.lastName}`.replace(/\s+/g, " ").trim();

export const takeawaysCardOccupied = (card: TakeawaysCard) =>
  Boolean(card.playerId || takeawaysCardName(card) || card.photoSrc);

export const takeawaysCardFilled = (card: TakeawaysCard) =>
  Boolean(card.playerId);

export const visibleTakeawaysCards = (
  cards: TakeawaysCard[],
  exporting = false,
) => (exporting ? cards.filter(takeawaysCardOccupied) : cards);

export const defaultTakeawaysDraft = (now = new Date()): TakeawaysDraft => {
  const range = thisWeekRange(now);
  return {
    brand: DEFAULT_BRAND,
    title: DEFAULT_TAKEAWAYS_TITLE,
    weekLine: takeawaysWeekX(range.from),
    rangeLine: takeawaysRangeLine(range.from, range.to),
    from: range.from,
    to: range.to,
    cards: emptyTakeawaysCards(),
    currentIndex: 0,
    coverFaces: 3,
    titleStyle: "lockup",
    weekPip: "week-x",
    coverField: "standouts",
    well: "fade",
    showRangeUnderPip: false,
    showIndex: false,
    showWeekGhost: false,
    showFactChip: false,
    showBa: true,
    showGold: true,
    watermark: "off",
    autoWeek: true,
  };
};

export const normalizeTakeawaysDraft = (
  draft: TakeawaysDraft,
): TakeawaysDraft => {
  const count = parseTakeawaysCardCount(draft.cards.length);
  const cards = [...draft.cards.slice(0, count)];
  while (cards.length < count) {
    cards.push(emptyTakeawaysCard());
  }
  const from = isoDateOnly(draft.from) || thisWeekRange().from;
  const to = isoDateOnly(draft.to) || shiftIsoDate(from, 6);
  const autoWeek = draft.autoWeek !== false;
  const weekPip = parseTakeawaysWeekPip(draft.weekPip);
  const weekLine = autoWeek
    ? weekPip === "week-of"
      ? takeawaysWeekOf(from, to)
      : takeawaysWeekX(from)
    : draft.weekLine.replace(/\s+/g, " ").trim();
  const currentIndex = Math.max(
    0,
    Math.min(cards.length - 1, Math.round(Number(draft.currentIndex) || 0)),
  );
  return {
    ...draft,
    brand: draft.brand.trim() || DEFAULT_BRAND,
    title: (isAutoTakeawaysTitle(draft.title)
      ? DEFAULT_TAKEAWAYS_TITLE
      : draft.title.replace(/\s+/g, " ").trim()
    ).slice(0, TAKEAWAYS_TITLE_MAX),
    weekLine,
    rangeLine: takeawaysRangeLine(from, to),
    from,
    to,
    cards: cards.map((card) => ({
      ...card,
      line1: (card.line1 ?? "").slice(0, TAKEAWAYS_LINE_MAX),
      line2: (card.line2 ?? "").slice(0, TAKEAWAYS_LINE_MAX),
      fact: (card.fact ?? "").slice(0, TAKEAWAYS_FACT_MAX),
      pan: clampPan(card.pan),
    })),
    currentIndex,
    coverFaces: parseTakeawaysCoverFaces(draft.coverFaces),
    titleStyle: parseTakeawaysTitleStyle(draft.titleStyle),
    weekPip,
    coverField: parseTakeawaysCoverField(draft.coverField),
    well: parseTakeawaysWell(draft.well),
    showRangeUnderPip: draft.showRangeUnderPip === true,
    showIndex: draft.showIndex === true,
    showWeekGhost: draft.showWeekGhost === true,
    showFactChip: draft.showFactChip === true,
    showBa: draft.showBa !== false,
    showGold: draft.showGold !== false,
    watermark: parseComposerWatermark(draft.watermark ?? "off"),
    autoWeek,
  };
};

export const applyTakeawaysRange = (
  draft: TakeawaysDraft,
  from: string,
  to: string,
): TakeawaysDraft =>
  normalizeTakeawaysDraft({
    ...draft,
    from,
    to,
  });

export const setTakeawaysCardCount = (
  draft: TakeawaysDraft,
  count: number,
): TakeawaysDraft => {
  const next = parseTakeawaysCardCount(count);
  const cards = [...draft.cards.slice(0, next)];
  while (cards.length < next) {
    cards.push(emptyTakeawaysCard());
  }
  return normalizeTakeawaysDraft({ ...draft, cards });
};

export const takeawaysCoverCards = (draft: TakeawaysDraft) => {
  if (draft.coverFaces === 0) {
    return [];
  }
  return draft.cards.slice(0, draft.coverFaces);
};

export const takeawaysCoverViewCards = (
  draft: TakeawaysDraft,
  exporting = false,
) => {
  const slots = takeawaysCoverCards(draft);
  return exporting ? slots.filter(takeawaysCardOccupied) : slots;
};

export const hasCustomTakeawaysPhoto = (card: TakeawaysCard) =>
  card.customPhoto && Boolean(card.photoSrc?.startsWith("data:"));

export const fillTakeawaysCardFromPlayer = (
  player: {
    id: string;
    name: string;
    team: string;
    headshotUrl: string;
  },
  previous?: TakeawaysCard,
  keepCustomPhoto = false,
): TakeawaysCard => {
  const names = splitPlayerName(player.name);
  const keep = keepCustomPhoto && previous ? hasCustomTakeawaysPhoto(previous) : false;
  const same = previous?.playerId === player.id;
  return {
    playerId: player.id,
    teamId: getTeam(player.team)?.id ?? player.team,
    firstName: names.firstName,
    lastName: names.lastName,
    photoSrc: keep ? previous!.photoSrc : player.headshotUrl,
    customPhoto: keep,
    pan: keep ? { ...previous!.pan } : { ...DEFAULT_HEADSHOT_PAN },
    line1: same ? previous?.line1 ?? "" : "",
    line2: same ? previous?.line2 ?? "" : "",
    fact: same ? previous?.fact ?? "" : "",
  };
};

export const setTakeawaysCardPlayer = (
  cards: TakeawaysCard[],
  index: number,
  player: {
    id: string;
    name: string;
    team: string;
    headshotUrl: string;
  },
  keepCustomPhoto = false,
): TakeawaysCard[] => {
  if (index < 0 || index >= cards.length) {
    return cards;
  }
  const next = cards.map((card, cardIndex) =>
    cardIndex === index
      ? fillTakeawaysCardFromPlayer(player, card, keepCustomPhoto)
      : { ...card },
  );
  return next.map((card, cardIndex) => {
    if (cardIndex !== index && card.playerId === player.id) {
      return emptyTakeawaysCard();
    }
    return card;
  });
};

export const patchTakeawaysCard = (
  cards: TakeawaysCard[],
  index: number,
  patch: Partial<TakeawaysCard>,
): TakeawaysCard[] =>
  cards.map((card, cardIndex) =>
    cardIndex === index ? { ...card, ...patch } : card,
  );

export const clearTakeawaysCard = (cards: TakeawaysCard[], index: number) =>
  cards.map((card, cardIndex) =>
    cardIndex === index ? emptyTakeawaysCard() : card,
  );

export const swapTakeawaysCards = (
  cards: TakeawaysCard[],
  from: number,
  to: number,
) => swapItems(cards, from, to);

export const insertTakeawaysCards = (
  cards: TakeawaysCard[],
  from: number,
  to: number,
) => insertItems(cards, from, to);

export const usedTakeawaysPlayerIds = (cards: TakeawaysCard[]) =>
  new Set(
    cards
      .map((card) => card.playerId)
      .filter((id): id is string => Boolean(id)),
  );

export const usedTakeawaysPlayerLabels = (cards: TakeawaysCard[]) => {
  const used: Record<string, string> = {};
  cards.forEach((card, index) => {
    if (card.playerId) {
      used[card.playerId] = `Takeaway ${index + 1}`;
    }
  });
  return used;
};

/** Hub carry lands in the next empty card — names only, never takeaway copy. */
export const landCarriedTakeawaysPlayer = (
  draft: TakeawaysDraft,
  playerId: string | null | undefined,
): TakeawaysDraft => {
  const id = playerId?.trim();
  if (!id || usedTakeawaysPlayerIds(draft.cards).has(id)) {
    return draft;
  }
  const player = getPlayer(id);
  if (!player) {
    return draft;
  }
  const index = draft.cards.findIndex((card) => !card.playerId);
  if (index < 0) {
    return draft;
  }
  return normalizeTakeawaysDraft({
    ...draft,
    cards: setTakeawaysCardPlayer(draft.cards, index, player, false),
    currentIndex: index,
  });
};

/** Names only — never writes takeaway copy. Fills empty slots from TOTW week names. */
export const fillTakeawaysNames = (
  draft: TakeawaysDraft,
  rows: NightStandout[],
): TakeawaysDraft => {
  const ranked = selectPlusStarters(rows);
  const used = usedTakeawaysPlayerIds(draft.cards);
  const leftover = ranked.filter((row) => !used.has(row.athleteId));
  let cursor = 0;
  const cards = draft.cards.map((card) => {
    if (card.playerId) {
      return card;
    }
    while (cursor < leftover.length) {
      const row = leftover[cursor]!;
      cursor += 1;
      const player = getPlayer(row.athleteId);
      if (!player) {
        continue;
      }
      return fillTakeawaysCardFromPlayer(player, card, false);
    }
    return card;
  });
  return normalizeTakeawaysDraft({ ...draft, cards });
};

export const takeawaysCaptionLines = (draft: TakeawaysDraft) => {
  const people = visibleTakeawaysCards(draft.cards, true).flatMap((card) => {
    const name = takeawaysCardName(card);
    const bits = [card.line1, card.line2].map((line) => line.trim()).filter(Boolean);
    if (!name && !bits.length) {
      return [];
    }
    return [bits.length ? `${name} — ${bits.join(" ")}` : name];
  });
  return [
    draft.title || DEFAULT_TAKEAWAYS_TITLE,
    takeawaysWeekPill(draft),
    draft.showRangeUnderPip ? draft.rangeLine : "",
    ...people,
  ].filter(Boolean);
};

export const takeawaysExportFilename = (
  title: string,
  week: string,
  player = "",
) => {
  const bits = [title || DEFAULT_TAKEAWAYS_TITLE, week, player]
    .map((bit) => bit.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return bits.join(" ");
};

export const takeawaysDraftOccupied = (draft: TakeawaysDraft) =>
  draft.cards.some(takeawaysCardOccupied);
