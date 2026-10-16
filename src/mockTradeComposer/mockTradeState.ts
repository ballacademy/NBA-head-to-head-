import { graphicCaption } from "../instagramComposer/graphicCaption";
import {
  clampPan,
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
  isPhotoPan,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { getTeam } from "../standingsComposer/teams";
import { splitPlayerName } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import type { TierPlayer } from "../tierListComposer/nbaActivePlayers";

export { clampPan, type PhotoPan };

export const DEFAULT_MOCK_TRADE_TITLE = "MOCK TRADE";
export const MOCK_TRADE_TITLE_MAX = 28;
export const MOCK_TRADE_NAME_MAX = 22;
export const MOCK_TRADE_PLAYER_MAX = 4;
export const MOCK_TRADE_PICK_MAX = 6;
export const MOCK_TRADE_TEAM_MIN = 2;
export const MOCK_TRADE_TEAM_MAX = 3;
export const MOCK_TRADE_YEARS = [
  2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032,
] as const;
export const DEFAULT_MOCK_TRADE_YEAR = 2027;

export type MockTradeRound = "1st" | "2nd";

export interface MockTradePlayer {
  playerId: string | null;
  teamId: string | null;
  firstName: string;
  lastName: string;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
}

export interface MockTradePick {
  year: number;
  round: MockTradeRound;
  fromTeamId: string | null;
  swap: boolean;
  top4?: boolean;
  twoWay?: boolean;
  cash?: boolean;
}

export interface MockTradeSide {
  teamId: string | null;
  players: MockTradePlayer[];
  picks: MockTradePick[];
}

export interface MockTradeDraft {
  title: string;
  sides: MockTradeSide[];
  showBa?: boolean;
}

const isNullableString = (value: unknown) =>
  typeof value === "string" || value === null;

export const parseMockTradeRound = (value: unknown): MockTradeRound => {
  const token = String(value ?? "")
    .trim()
    .toLowerCase();
  if (token === "2" || token === "2nd" || token === "second") {
    return "2nd";
  }
  return "1st";
};

export const parseMockTradeYear = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return DEFAULT_MOCK_TRADE_YEAR;
  }
  const year = Math.round(n);
  if (year < MOCK_TRADE_YEARS[0] || year > MOCK_TRADE_YEARS[MOCK_TRADE_YEARS.length - 1]!) {
    return DEFAULT_MOCK_TRADE_YEAR;
  }
  return year;
};

export const emptyMockTradePlayer = (): MockTradePlayer => ({
  playerId: null,
  teamId: null,
  firstName: "",
  lastName: "",
  photoSrc: null,
  customPhoto: false,
  pan: { ...DEFAULT_HEADSHOT_PAN },
});

export const emptyMockTradePick = (): MockTradePick => ({
  year: DEFAULT_MOCK_TRADE_YEAR,
  round: "1st",
  fromTeamId: null,
  swap: false,
  top4: false,
  twoWay: false,
  cash: false,
});

export const emptyMockTradeSide = (): MockTradeSide => ({
  teamId: null,
  players: [emptyMockTradePlayer()],
  picks: [emptyMockTradePick()],
});

export const isMockTradePlayer = (value: unknown): value is MockTradePlayer =>
  Boolean(
    value &&
      typeof value === "object" &&
      isNullableString((value as MockTradePlayer).playerId) &&
      isNullableString((value as MockTradePlayer).teamId) &&
      typeof (value as MockTradePlayer).firstName === "string" &&
      typeof (value as MockTradePlayer).lastName === "string" &&
      isNullableString((value as MockTradePlayer).photoSrc) &&
      typeof (value as MockTradePlayer).customPhoto === "boolean" &&
      isPhotoPan((value as MockTradePlayer).pan),
  );

export const isMockTradePick = (value: unknown): value is MockTradePick =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as MockTradePick).year === "number" &&
      ((value as MockTradePick).round === "1st" ||
        (value as MockTradePick).round === "2nd") &&
      isNullableString((value as MockTradePick).fromTeamId) &&
      typeof (value as MockTradePick).swap === "boolean",
  );

export const isFilledMockTradePlayer = (player: MockTradePlayer) =>
  Boolean(player.photoSrc || mockTradePlayerName(player));

const parsePlayer = (value: unknown): MockTradePlayer | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<MockTradePlayer>;
  if (
    !isNullableString(raw.playerId) ||
    !isNullableString(raw.teamId) ||
    typeof raw.firstName !== "string" ||
    typeof raw.lastName !== "string" ||
    !isNullableString(raw.photoSrc) ||
    typeof raw.customPhoto !== "boolean"
  ) {
    return null;
  }
  return {
    playerId: raw.playerId,
    teamId: raw.teamId,
    firstName: raw.firstName,
    lastName: raw.lastName,
    photoSrc: raw.photoSrc,
    customPhoto: raw.customPhoto,
    pan: isPhotoPan(raw.pan) ? raw.pan : { ...DEFAULT_HEADSHOT_PAN },
  };
};

const parsePick = (value: unknown): MockTradePick | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<MockTradePick>;
  if (!isNullableString(raw.fromTeamId) && raw.fromTeamId !== undefined) {
    return null;
  }
  return {
    year: parseMockTradeYear(raw.year),
    round: parseMockTradeRound(raw.round),
    fromTeamId: typeof raw.fromTeamId === "string" && raw.fromTeamId.trim()
      ? raw.fromTeamId
      : null,
    swap: raw.swap === true,
    top4: raw.top4 === true,
    twoWay: raw.twoWay === true,
    cash: raw.cash === true,
  };
};

const parseSide = (value: unknown): MockTradeSide | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<MockTradeSide>;
  if (!isNullableString(raw.teamId) && raw.teamId !== undefined) {
    return null;
  }
  const players = Array.isArray(raw.players)
    ? raw.players.map(parsePlayer).filter((row): row is MockTradePlayer => Boolean(row))
    : [emptyMockTradePlayer()];
  const picks = Array.isArray(raw.picks)
    ? raw.picks.map(parsePick).filter((row): row is MockTradePick => Boolean(row))
    : [emptyMockTradePick()];
  return {
    teamId: typeof raw.teamId === "string" && raw.teamId.trim() ? raw.teamId : null,
    players: players.slice(0, MOCK_TRADE_PLAYER_MAX),
    picks: picks.slice(0, MOCK_TRADE_PICK_MAX),
  };
};

export const isMockTradeDraft = (value: unknown): value is MockTradeDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as MockTradeDraft).title === "string" &&
      Array.isArray((value as MockTradeDraft).sides) &&
      (value as MockTradeDraft).sides.length >= MOCK_TRADE_TEAM_MIN,
  );

export const defaultMockTradeDraft = (): MockTradeDraft => ({
  title: DEFAULT_MOCK_TRADE_TITLE,
  sides: [emptyMockTradeSide(), emptyMockTradeSide()],
  showBa: true,
});

export const normalizeMockTradeDraft = (draft: MockTradeDraft): MockTradeDraft => {
  const parsed = draft.sides
    .map(parseSide)
    .filter((side): side is MockTradeSide => Boolean(side));
  while (parsed.length < MOCK_TRADE_TEAM_MIN) {
    parsed.push(emptyMockTradeSide());
  }
  return {
    title: draft.title.trim() ? draft.title : DEFAULT_MOCK_TRADE_TITLE,
    sides: parsed.slice(0, MOCK_TRADE_TEAM_MAX),
    showBa: draft.showBa !== false,
  };
};

export const mockTradeTeamCount = (draft: MockTradeDraft): 2 | 3 =>
  draft.sides.length >= 3 ? 3 : 2;

export const addMockTradeTeam = (draft: MockTradeDraft): MockTradeDraft => {
  if (draft.sides.length >= MOCK_TRADE_TEAM_MAX) {
    return draft;
  }
  return { ...draft, sides: [...draft.sides, emptyMockTradeSide()] };
};

export const removeMockTradeTeam = (draft: MockTradeDraft): MockTradeDraft => {
  if (draft.sides.length <= MOCK_TRADE_TEAM_MIN) {
    return draft;
  }
  return { ...draft, sides: draft.sides.slice(0, MOCK_TRADE_TEAM_MIN) };
};

export const setMockTradeSideTeam = (
  draft: MockTradeDraft,
  index: number,
  teamId: string | null,
): MockTradeDraft => ({
  ...draft,
  sides: draft.sides.map((side, sideIndex) =>
    sideIndex === index ? { ...side, teamId } : side,
  ),
});

export const addMockTradePlayer = (side: MockTradeSide): MockTradeSide =>
  side.players.length >= MOCK_TRADE_PLAYER_MAX
    ? side
    : { ...side, players: [...side.players, emptyMockTradePlayer()] };

export const removeMockTradePlayer = (
  side: MockTradeSide,
  index = side.players.length - 1,
): MockTradeSide => {
  if (!side.players.length || index < 0) {
    return side;
  }
  return {
    ...side,
    players: side.players.filter((_, playerIndex) => playerIndex !== index),
  };
};

export const addMockTradePick = (side: MockTradeSide): MockTradeSide =>
  side.picks.length >= MOCK_TRADE_PICK_MAX
    ? side
    : { ...side, picks: [...side.picks, emptyMockTradePick()] };

export const removeMockTradePick = (
  side: MockTradeSide,
  index = side.picks.length - 1,
): MockTradeSide => {
  if (!side.picks.length || index < 0) {
    return side;
  }
  return {
    ...side,
    picks: side.picks.filter((_, pickIndex) => pickIndex !== index),
  };
};

export const patchMockTradeSide = (
  draft: MockTradeDraft,
  index: number,
  patch: MockTradeSide,
): MockTradeDraft => ({
  ...draft,
  sides: draft.sides.map((side, sideIndex) =>
    sideIndex === index ? patch : side,
  ),
});

export const hasCustomPhoto = (player: MockTradePlayer) =>
  Boolean(player.customPhoto && player.photoSrc);

export const fillMockTradePlayer = (
  player: TierPlayer,
  previous: MockTradePlayer,
  keepCustomPhoto = false,
): MockTradePlayer => {
  const names = splitPlayerName(player.name);
  const keep = keepCustomPhoto && hasCustomPhoto(previous);
  return {
    playerId: player.id,
    teamId: getTeam(player.team)?.id ?? player.team ?? null,
    firstName: names.firstName.slice(0, MOCK_TRADE_NAME_MAX),
    lastName: names.lastName.slice(0, MOCK_TRADE_NAME_MAX),
    photoSrc: keep ? previous.photoSrc : player.headshotUrl || null,
    customPhoto: keep,
    pan: keep ? { ...previous.pan } : { ...DEFAULT_HEADSHOT_PAN },
  };
};

export const setMockTradePhoto = (
  player: MockTradePlayer,
  dataUrl: string,
): MockTradePlayer => ({
  ...player,
  photoSrc: dataUrl,
  customPhoto: true,
  pan: { ...DEFAULT_CUSTOM_PAN },
});

export const clearMockTradePlayer = (player: MockTradePlayer): MockTradePlayer => {
  const keep = hasCustomPhoto(player);
  return {
    ...emptyMockTradePlayer(),
    photoSrc: keep ? player.photoSrc : null,
    customPhoto: keep,
    pan: keep ? { ...player.pan } : { ...DEFAULT_HEADSHOT_PAN },
  };
};

export const mockTradePlayerName = (player: MockTradePlayer) =>
  `${player.firstName} ${player.lastName}`.replace(/\s+/g, " ").trim();

export const mockTradePlayerLockup = (player: MockTradePlayer) =>
  (player.lastName || player.firstName).replace(/\s+/g, " ").trim();

export const mockTradePickLabel = (pick: MockTradePick) => {
  const from = getTeam(pick.fromTeamId)?.id;
  if (pick.cash) {
    return from ? `CASH · ${from}` : "CASH";
  }
  if (pick.twoWay) {
    return from ? `TWO-WAY · ${from}` : "TWO-WAY";
  }
  const year = pick.year || DEFAULT_MOCK_TRADE_YEAR;
  const round = pick.round === "2nd" ? "2ND" : "1ST";
  const bits = [`${year} ${round}`];
  if (pick.top4) {
    bits.push("TOP-4");
  }
  if (pick.swap) {
    bits.push("SWAP");
  }
  if (from) {
    bits.push(from);
  }
  return bits.join(" · ");
};

export const swapMockTradeSides = (draft: MockTradeDraft): MockTradeDraft => {
  if (draft.sides.length < 2) {
    return draft;
  }
  const sides = [...draft.sides];
  const first = sides[0]!;
  sides[0] = sides[1]!;
  sides[1] = first;
  return { ...draft, sides };
};

export const compactMockTradeDraft = (draft: MockTradeDraft): MockTradeDraft => ({
  ...draft,
  sides: draft.sides.map((side) => ({
    ...side,
    players: side.players.filter(isFilledMockTradePlayer),
  })),
});

export const mockTradeCaptionFor = (draft: MockTradeDraft) => {
  const sides = draft.sides.map((side) => {
    const team = getTeam(side.teamId)?.id ?? "TEAM";
    const gets = [
      ...side.players.map(mockTradePlayerName).filter(Boolean),
      ...side.picks.map(mockTradePickLabel),
    ];
    return gets.length ? `${team}: ${gets.join(", ")}` : team;
  });
  return graphicCaption(draft.title, sides);
};
