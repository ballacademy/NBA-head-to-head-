import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import { NBA_TEAMS, type NbaTeam } from "../standingsComposer/teams";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import {
  rosterHasPlayer,
  seasonForTeam,
  type EveryTeamStatMetric,
} from "./historicalRosters";

export { DEFAULT_BRAND };

/** City / location labels used for alphabetical slot order. */
export const EVERY_TEAM_CITY: Record<string, string> = {
  ATL: "Atlanta",
  BOS: "Boston",
  BKN: "Brooklyn",
  CHA: "Charlotte",
  CHI: "Chicago",
  CLE: "Cleveland",
  DAL: "Dallas",
  DEN: "Denver",
  DET: "Detroit",
  GSW: "Golden State",
  HOU: "Houston",
  IND: "Indiana",
  LAC: "LA Clippers",
  LAL: "Los Angeles Lakers",
  MEM: "Memphis",
  MIA: "Miami",
  MIL: "Milwaukee",
  MIN: "Minnesota",
  NOP: "New Orleans",
  NYK: "New York",
  OKC: "Oklahoma City",
  ORL: "Orlando",
  PHI: "Philadelphia",
  PHX: "Phoenix",
  POR: "Portland",
  SAC: "Sacramento",
  SAS: "San Antonio",
  TOR: "Toronto",
  UTA: "Utah",
  WAS: "Washington",
};

export const EVERY_TEAM_ORDER: NbaTeam[] = [...NBA_TEAMS].sort((a, b) => {
  const left = EVERY_TEAM_CITY[a.id] ?? a.name;
  const right = EVERY_TEAM_CITY[b.id] ?? b.name;
  return left.localeCompare(right);
});

export const EVERY_TEAM_COUNT = EVERY_TEAM_ORDER.length;
export const EVERY_TEAM_COLS = 5;
export const EVERY_TEAM_ROWS = 6;

export const DEFAULT_EVERY_TEAM_TITLE =
  "MOST DISAPPOINTING PLAYER ON EVERY NBA TEAM";

export type EveryTeamSlots = Array<string | null>;

export const createEmptyEveryTeamSlots = (): EveryTeamSlots =>
  Array.from({ length: EVERY_TEAM_COUNT }, () => null);

export const isEveryTeamSlots = (value: unknown): value is EveryTeamSlots =>
  Array.isArray(value) &&
  value.length === EVERY_TEAM_COUNT &&
  value.every((slot) => slot === null || typeof slot === "string");

export type EveryTeamMode = "unranked" | "ranked";

export interface EveryTeamDraft {
  brand: string;
  title: string;
  slots: EveryTeamSlots;
  showBa?: boolean;
  ranked?: boolean;
  rankedOrder?: string[];
  showNames?: boolean;
  season?: string;
  cellSeasons?: Record<string, string>;
}

export const createDefaultRankedOrder = (): string[] =>
  EVERY_TEAM_ORDER.map((team) => team.id);

export const isRankedOrder = (value: unknown): value is string[] => {
  if (!Array.isArray(value) || value.length !== EVERY_TEAM_COUNT) {
    return false;
  }
  const allowed = new Set(EVERY_TEAM_ORDER.map((team) => team.id));
  const seen = new Set<string>();
  return value.every((id) => {
    if (typeof id !== "string" || !allowed.has(id) || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
};

export const normalizeRankedOrder = (value: unknown): string[] => {
  if (isRankedOrder(value)) {
    return value;
  }
  const allowed = new Set(EVERY_TEAM_ORDER.map((team) => team.id));
  const seen = new Set<string>();
  const next: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((id) => {
      if (typeof id === "string" && allowed.has(id) && !seen.has(id)) {
        seen.add(id);
        next.push(id);
      }
    });
  }
  EVERY_TEAM_ORDER.forEach((team) => {
    if (!seen.has(team.id)) {
      next.push(team.id);
    }
  });
  return next;
};

export const slotIndexForTeam = (teamId: string) =>
  EVERY_TEAM_ORDER.findIndex((team) => team.id === teamId);

export const displayedTeams = (
  ranked: boolean,
  rankedOrder: string[] = createDefaultRankedOrder(),
): NbaTeam[] => {
  if (!ranked) {
    return EVERY_TEAM_ORDER;
  }
  return normalizeRankedOrder(rankedOrder).map(
    (id) => EVERY_TEAM_ORDER[slotIndexForTeam(id)]!,
  );
};

export const swapRankedOrder = (
  rankedOrder: string[],
  fromIndex: number,
  toIndex: number,
): string[] => {
  const order = normalizeRankedOrder(rankedOrder);
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= order.length ||
    toIndex >= order.length
  ) {
    return order;
  }
  const next = order.slice();
  const fromId = next[fromIndex]!;
  next[fromIndex] = next[toIndex]!;
  next[toIndex] = fromId;
  return next;
};

/** Move a team to a rank; everyone between that slot and the origin shifts. */
export const insertRankedOrder = (
  rankedOrder: string[],
  fromIndex: number,
  toIndex: number,
): string[] => {
  const order = normalizeRankedOrder(rankedOrder);
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= order.length ||
    toIndex >= order.length
  ) {
    return order;
  }
  const next = order.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved!);
  return next;
};

export const isEveryTeamDraft = (value: unknown): value is EveryTeamDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as EveryTeamDraft).brand === "string" &&
      typeof (value as EveryTeamDraft).title === "string" &&
      isEveryTeamSlots((value as EveryTeamDraft).slots),
  );

export const teamAtSlot = (
  index: number,
  ranked = false,
  rankedOrder: string[] = createDefaultRankedOrder(),
): NbaTeam | null => displayedTeams(ranked, rankedOrder)[index] ?? null;

export const assignPlayer = (
  slots: EveryTeamSlots,
  index: number,
  playerId: string,
): EveryTeamSlots => {
  if (index < 0 || index >= EVERY_TEAM_COUNT || !playerId) {
    return slots;
  }
  const next = slots.slice();
  const previous = next.indexOf(playerId);
  if (previous >= 0 && previous !== index) {
    next[previous] = null;
  }
  next[index] = playerId;
  return next;
};

export const assignPlayerToTeam = (
  slots: EveryTeamSlots,
  teamId: string,
  playerId: string,
): EveryTeamSlots => assignPlayer(slots, slotIndexForTeam(teamId), playerId);

export const clearEveryTeamTeam = (
  slots: EveryTeamSlots,
  teamId: string,
): EveryTeamSlots => clearEveryTeamSlot(slots, slotIndexForTeam(teamId));

export const clearEveryTeamSlot = (
  slots: EveryTeamSlots,
  index: number,
): EveryTeamSlots => {
  if (index < 0 || index >= EVERY_TEAM_COUNT) {
    return slots;
  }
  const next = slots.slice();
  next[index] = null;
  return next;
};

export const nextEmptyEveryTeamSlot = (
  slots: EveryTeamSlots,
  fromIndex: number,
  ranked = false,
  rankedOrder: string[] = createDefaultRankedOrder(),
): number | null => {
  const teams = displayedTeams(ranked, rankedOrder);
  for (let step = 1; step <= EVERY_TEAM_COUNT; step += 1) {
    const index = (fromIndex + step) % EVERY_TEAM_COUNT;
    const team = teams[index];
    if (!team) {
      continue;
    }
    const slotIndex = slotIndexForTeam(team.id);
    if (slotIndex >= 0 && !slots[slotIndex]) {
      return index;
    }
  }
  return null;
};

export const usedEveryTeamLabels = (
  slots: EveryTeamSlots,
  activeIndex: number | null,
  ranked = false,
  rankedOrder: string[] = createDefaultRankedOrder(),
): Record<string, string> => {
  const labels: Record<string, string> = {};
  const teams = displayedTeams(ranked, rankedOrder);
  const activeTeamId =
    activeIndex != null ? teams[activeIndex]?.id ?? null : null;
  slots.forEach((id, index) => {
    if (!id) {
      return;
    }
    const team = EVERY_TEAM_ORDER[index];
    labels[id] =
      team?.id && team.id === activeTeamId ? "This slot" : team?.id ?? "Used";
  });
  return labels;
};

export const pruneSlotsToSeasons = (
  slots: EveryTeamSlots,
  boardSeason: string,
  cellSeasons: Record<string, string> = {},
): EveryTeamSlots =>
  slots.map((playerId, index) => {
    if (!playerId) {
      return null;
    }
    const team = EVERY_TEAM_ORDER[index];
    if (!team) {
      return null;
    }
    return rosterHasPlayer(
      team.id,
      seasonForTeam(team.id, boardSeason, cellSeasons),
      playerId,
    )
      ? playerId
      : null;
  });

export const autoSortRankedOrder = (
  rankedOrder: string[],
  metricValues: Array<number | null>,
): { order: string[]; ranked: number; held: number } => {
  const order = normalizeRankedOrder(rankedOrder);
  const entries = order.map((teamId, index) => ({
    teamId,
    index,
    value: metricValues[index] ?? null,
  }));
  const scored = entries.filter((entry) => entry.value != null);
  const held = entries.filter((entry) => entry.value == null);
  scored.sort(
    (left, right) =>
      (right.value as number) - (left.value as number) || left.index - right.index,
  );
  return {
    order: [...scored, ...held].map((entry) => entry.teamId),
    ranked: scored.length,
    held: held.length,
  };
};

export const autoSortMetricLabel = (metric: EveryTeamStatMetric) =>
  metric === "pra" ? "PRA" : metric === "points" ? "points" : "steals + blocks";

export const splitEveryTeamTitle = (title: string): string[] =>
  splitBalancedTitle(title, DEFAULT_EVERY_TEAM_TITLE);

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export const exportEveryTeamFilename = (title: string) => {
  const stem = slugify(title) || "every-nba-team";
  return `${stem}.png`;
};
