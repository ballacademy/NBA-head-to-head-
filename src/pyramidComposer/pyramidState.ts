import {
  storedOrLastShowBa,
  storedOrLastShowNames,
} from "../instagramComposer/composerBoardDefaults";
import { normalizeComposerTitle } from "../instagramComposer/titleLayout";
import {
  DEFAULT_HEADSHOT_PAN,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import {
  applyPlayerPick,
  clearStrip,
  createEmptyStrip,
  hasCustomPhoto,
  isTotwStrip,
  patchStrip,
  setStripPhoto,
  swapStrips,
  usedPlayerIds,
  type TotwStrip,
} from "../teamOfTheWeekComposer/teamOfTheWeekState";
import { NBA_COACHES, getCoach } from "../instagramComposer/nbaCoaches";
import type { StandingRecord } from "../standingsComposer/rankingState";
import {
  NBA_ACTIVE_PLAYERS,
  type TierPlayer,
} from "../tierListComposer/nbaActivePlayers";
import {
  clampPyramidRows,
  pyramidSlotCount,
  PYR_DEFAULT_ROWS,
  PYR_MAX_ROWS,
  PYR_MIN_ROWS,
} from "./pyramidLayout";

export {
  hasCustomPhoto,
  patchStrip,
  setStripPhoto,
  swapStrips,
  type TotwStrip as PyramidSlot,
};

export const DEFAULT_PYRAMID_TITLE = "NBA COY PYRAMID";
export const PYRAMID_TITLE_TRACK = 0.04;
export const PYRAMID_HEADSHOT_PAN: PhotoPan = {
  x: 0.5,
  y: 0.58,
  zoom: 1.36,
  rotate: 0,
};

export interface PyramidDraft {
  title: string;
  slots: TotwStrip[];
  rows?: number;
  showBa?: boolean;
  showNames?: boolean;
  rowLabels?: string[];
}

export const PYR_ROW_LABEL_MAX = 12;

export const parsePyramidRowLabels = (
  value: unknown,
  rowCount: number,
): string[] => {
  const n = clampPyramidRows(rowCount);
  const raw = Array.isArray(value) ? value : [];
  return Array.from({ length: n }, (_, index) => {
    const item = raw[index];
    if (typeof item !== "string") {
      return "";
    }
    return item.replace(/\s+/g, " ").trim().slice(0, PYR_ROW_LABEL_MAX);
  });
};

export const parsePyramidRows = (
  value: unknown,
  slotCount?: number,
): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampPyramidRows(value);
  }
  if (slotCount === pyramidSlotCount(5)) {
    return 5;
  }
  if (slotCount === pyramidSlotCount(6)) {
    return 6;
  }
  return PYR_DEFAULT_ROWS;
};

export const createEmptyPyramidSlots = (
  rowCount = PYR_DEFAULT_ROWS,
): TotwStrip[] =>
  Array.from({ length: pyramidSlotCount(rowCount) }, createEmptyStrip);

export const resizePyramidSlots = (
  slots: TotwStrip[],
  rowCount: number,
): TotwStrip[] => {
  const next = pyramidSlotCount(rowCount);
  if (slots.length === next) {
    return slots;
  }
  if (slots.length > next) {
    return slots.slice(0, next);
  }
  return [
    ...slots,
    ...Array.from({ length: next - slots.length }, createEmptyStrip),
  ];
};

export const isPyramidDraft = (value: unknown): value is PyramidDraft => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const draft = value as PyramidDraft;
  if (typeof draft.title !== "string" || !Array.isArray(draft.slots)) {
    return false;
  }
  const rows = parsePyramidRows(draft.rows, draft.slots.length);
  return (
    draft.slots.length === pyramidSlotCount(rows) &&
    draft.slots.every(isTotwStrip)
  );
};

export const defaultPyramidDraft = (): PyramidDraft => ({
  title: DEFAULT_PYRAMID_TITLE,
  slots: createEmptyPyramidSlots(PYR_DEFAULT_ROWS),
  rows: PYR_DEFAULT_ROWS,
  showBa: storedOrLastShowBa(undefined),
  showNames: storedOrLastShowNames(undefined, false),
  rowLabels: parsePyramidRowLabels(undefined, PYR_DEFAULT_ROWS),
});

export const pyramidSlotPops = (slot: TotwStrip) =>
  Boolean(slot.photoSrc) && !hasCustomPhoto(slot);

export const applyPyramidPick = (
  slots: TotwStrip[],
  index: number,
  player: TierPlayer,
  keepCustomPhoto = false,
): TotwStrip[] => {
  const next = applyPlayerPick(slots, index, player, keepCustomPhoto);
  if (keepCustomPhoto) {
    return next;
  }
  return patchStrip(next, index, { pan: { ...PYRAMID_HEADSHOT_PAN } });
};

export const clearPyramidSlot = (slots: TotwStrip[], index: number) =>
  clearStrip(slots, index);

export const usedPyramidPlayerIds = (slots: TotwStrip[]) => {
  const used = usedPlayerIds(slots);
  const labeled: Record<string, string> = {};
  Object.entries(used).forEach(([id, label]) => {
    labeled[id] = label.replace(/^Strip /, "Slot ");
  });
  return labeled;
};

export const pyramidTitle = (title: string) =>
  normalizeComposerTitle(title, DEFAULT_PYRAMID_TITLE);

export const PYRAMID_COY_SEED_IDS = [
  "coach-BOS",
  "coach-OKC",
  "coach-HOU",
  "coach-LAC",
  "coach-PHI",
  "coach-CLE",
  "coach-DET",
  "coach-ATL",
  "coach-NYK",
  "coach-MIN",
] as const;

export const pyramidBoardEmpty = (slots: TotwStrip[]) =>
  slots.every((slot) => !slot.playerId);

export const pyramidLadderKind = (title: string): "coach" | "player" => {
  const token = title.toUpperCase();
  if (/COACH|COY/.test(token)) {
    return "coach";
  }
  if (
    /PLAYER|MVP|DPOY|MIP|6MOY|SIXTH|ALL-NBA|ALL NBA|ALL-DEFENSE|ALL DEFENSE|ROOKIE|ROY/.test(
      token,
    )
  ) {
    return "player";
  }
  return "coach";
};

export const PYRAMID_AWARD_GROUPS = [
  { id: "mvp", label: "MVP", title: "NBA MVP PYRAMID", kind: "player" as const },
  { id: "dpoy", label: "DPOY", title: "NBA DPOY PYRAMID", kind: "player" as const },
  { id: "mip", label: "MIP", title: "NBA MIP PYRAMID", kind: "player" as const },
  { id: "6moy", label: "6MOY", title: "NBA 6MOY PYRAMID", kind: "player" as const },
  { id: "coy", label: "COY", title: "NBA COY PYRAMID", kind: "coach" as const },
  {
    id: "all-nba",
    label: "All-NBA",
    title: "NBA ALL-NBA PYRAMID",
    kind: "player" as const,
  },
  {
    id: "all-defense",
    label: "All-Defense",
    title: "NBA ALL-DEFENSE PYRAMID",
    kind: "player" as const,
  },
  {
    id: "roy",
    label: "Rookie",
    title: "NBA ROOKIE PYRAMID",
    kind: "player" as const,
  },
] as const;

export type PyramidAwardId = (typeof PYRAMID_AWARD_GROUPS)[number]["id"];

export const pyramidAwardFromTitle = (title: string): PyramidAwardId => {
  const token = title.toUpperCase();
  if (/DPOY|ALL-DEFENSE|ALL DEFENSE/.test(token)) {
    return /ALL/.test(token) ? "all-defense" : "dpoy";
  }
  if (/MIP/.test(token)) {
    return "mip";
  }
  if (/6MOY|SIXTH/.test(token)) {
    return "6moy";
  }
  if (/ROOKIE|ROY/.test(token)) {
    return "roy";
  }
  if (/ALL-NBA|ALL NBA/.test(token)) {
    return "all-nba";
  }
  if (/MVP/.test(token)) {
    return "mvp";
  }
  if (/COACH|COY/.test(token)) {
    return "coy";
  }
  return pyramidLadderKind(title) === "player" ? "mvp" : "coy";
};

const byPpg = (left: TierPlayer, right: TierPlayer) => right.ppg - left.ppg;

export const pyramidAwardLadder = (
  award: PyramidAwardId,
  count: number,
): TierPlayer[] => {
  if (award === "coy") {
    return coyCoachLadder(count);
  }
  const pool = NBA_ACTIVE_PLAYERS.filter((player) => player.ppg > 0);
  if (award === "roy") {
    return [...pool]
      .filter((player) => player.experienceYears <= 1)
      .sort(byPpg)
      .slice(0, count);
  }
  if (award === "6moy") {
    const bench = pool.filter((player) => (player.depth ?? 1) > 1);
    return [...(bench.length ? bench : pool)].sort(byPpg).slice(0, count);
  }
  if (award === "mip") {
    return [...pool]
      .filter((player) => !player.allStar)
      .sort(byPpg)
      .slice(0, count);
  }
  if (award === "dpoy" || award === "all-defense") {
    return [...pool]
      .filter((player) => player.positionGroup === "C" || player.positionGroup === "F")
      .sort(byPpg)
      .slice(0, count);
  }
  return mvpPlayerLadder(count);
};

export const coyCoachLadder = (count: number): TierPlayer[] => {
  const seeded = PYRAMID_COY_SEED_IDS.map((id) => getCoach(id)).filter(
    (coach): coach is TierPlayer => Boolean(coach),
  );
  const used = new Set(seeded.map((coach) => coach.id));
  return [...seeded, ...NBA_COACHES.filter((coach) => !used.has(coach.id))].slice(
    0,
    count,
  );
};

export const mvpPlayerLadder = (count: number): TierPlayer[] =>
  [...NBA_ACTIVE_PLAYERS]
    .filter((player) => player.ppg > 0)
    .sort((left, right) => right.ppg - left.ppg)
    .slice(0, count);

export const coachesFromStandings = (
  east: Array<string | null>,
  west: Array<string | null>,
  records: Record<string, StandingRecord>,
  count: number,
): TierPlayer[] => {
  const ids = [...east, ...west].filter((id): id is string => Boolean(id));
  ids.sort((left, right) => {
    const leftWins = records[left]?.wins ?? -1;
    const rightWins = records[right]?.wins ?? -1;
    if (rightWins !== leftWins) {
      return rightWins - leftWins;
    }
    const leftLosses = records[left]?.losses ?? 99;
    const rightLosses = records[right]?.losses ?? 99;
    return leftLosses - rightLosses;
  });
  const coaches: TierPlayer[] = [];
  for (const id of ids) {
    const coach = getCoach(`coach-${id}`);
    if (coach) {
      coaches.push(coach);
    }
    if (coaches.length >= count) {
      break;
    }
  }
  return coaches.length ? coaches : coyCoachLadder(count);
};

export const fillPyramidFromPlayers = (
  rowCount: number,
  players: TierPlayer[],
  previous: TotwStrip[] = [],
): TotwStrip[] => {
  const previousById = new Map<string, TotwStrip>();
  for (const slot of previous) {
    if (slot.playerId) {
      previousById.set(slot.playerId, slot);
    }
  }
  let next = createEmptyPyramidSlots(rowCount);
  players.slice(0, pyramidSlotCount(rowCount)).forEach((player, index) => {
    const keep = Boolean(
      previousById.get(player.id) && hasCustomPhoto(previousById.get(player.id)!),
    );
    next = applyPyramidPick(next, index, player, keep);
  });
  return next;
};

export { PYR_MIN_ROWS, PYR_MAX_ROWS, PYR_DEFAULT_ROWS, DEFAULT_HEADSHOT_PAN };
