import { ESPN_ABBREV_TO_TEAM } from "../playerOfTheDayComposer/lastGame";
import { NBA_TEAMS_BY_ID, type Conference } from "./teams";
import type { RankingSlots, StandingRecord } from "./rankingState";
import { SLOT_COUNT, createEmptySlots } from "./rankingState";

export const ESPN_STANDINGS_URL =
  "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings";

interface EspnStandingTeam {
  abbreviation?: string;
  displayName?: string;
}

interface EspnStandingStat {
  name?: string;
  abbreviation?: string;
  displayValue?: string;
  value?: number | string;
}

interface EspnStandingEntry {
  team?: EspnStandingTeam;
  stats?: EspnStandingStat[];
}

interface EspnStandingsGroup {
  abbreviation?: string;
  name?: string;
  standings?: { entries?: EspnStandingEntry[] };
  children?: EspnStandingsGroup[];
}

export interface EspnStandingsPayload {
  children?: EspnStandingsGroup[];
}

const namedStatNumber = (
  entry: EspnStandingEntry,
  names: string[],
  abbreviations: string[],
) => {
  const nameSet = new Set(names.map((name) => name.toLowerCase()));
  const abbrSet = new Set(abbreviations.map((token) => token.toUpperCase()));
  for (const stat of entry.stats ?? []) {
    const name = `${stat.name ?? ""}`.trim().toLowerCase();
    const abbreviation = `${stat.abbreviation ?? ""}`.trim().toUpperCase();
    if (!nameSet.has(name) && !abbrSet.has(abbreviation)) {
      continue;
    }
    const value = Number(stat.value ?? stat.displayValue);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return null;
};

const overallRecord = (entry: EspnStandingEntry): { wins: number; losses: number } | null => {
  for (const stat of entry.stats ?? []) {
    const name = `${stat.name ?? ""}`.trim().toLowerCase();
    const abbreviation = `${stat.abbreviation ?? ""}`.trim();
    if (name !== "overall" && abbreviation !== "Total") {
      continue;
    }
    const match = `${stat.displayValue ?? ""}`.trim().match(/^(\d{1,2})-(\d{1,2})$/);
    if (!match) {
      continue;
    }
    return { wins: Number(match[1]), losses: Number(match[2]) };
  }
  return null;
};

const last10FromEntry = (entry: EspnStandingEntry): string | null => {
  for (const stat of entry.stats ?? []) {
    const name = `${stat.name ?? ""}`.toLowerCase();
    if (!name.includes("last ten") && stat.abbreviation !== "L10") {
      continue;
    }
    const display = `${stat.displayValue ?? ""}`.trim();
    if (/^\d{1,2}-\d{1,2}$/.test(display)) {
      return display;
    }
  }
  return null;
};

const recordFromEntry = (entry: EspnStandingEntry): StandingRecord | null => {
  let wins = namedStatNumber(entry, ["wins"], ["W"]);
  let losses = namedStatNumber(entry, ["losses"], ["L"]);
  if (wins == null || losses == null) {
    const overall = overallRecord(entry);
    wins = wins ?? overall?.wins ?? null;
    losses = losses ?? overall?.losses ?? null;
  }
  if (wins == null || losses == null) {
    return null;
  }
  return { wins, losses, last10: last10FromEntry(entry) };
};

const playoffSeedFromEntry = (entry: EspnStandingEntry): number | null => {
  const seed = namedStatNumber(
    entry,
    ["playoffseed", "playoff seed"],
    ["SEED"],
  );
  if (seed == null) {
    return null;
  }
  const rank = Math.round(seed);
  return rank >= 1 && rank <= SLOT_COUNT ? rank : null;
};

const teamIdFromAbbrev = (abbreviation?: string) => {
  const token = (abbreviation ?? "").trim().toUpperCase();
  if (!token) {
    return null;
  }
  const mapped = ESPN_ABBREV_TO_TEAM[token] ?? token;
  return NBA_TEAMS_BY_ID[mapped] ? mapped : null;
};

const conferenceOf = (group: EspnStandingsGroup): Conference | null => {
  const token = `${group.abbreviation ?? ""} ${group.name ?? ""}`.toLowerCase();
  if (token.includes("east")) {
    return "East";
  }
  if (token.includes("west")) {
    return "West";
  }
  return null;
};

const collectGroups = (groups: EspnStandingsGroup[] | undefined): EspnStandingsGroup[] => {
  const out: EspnStandingsGroup[] = [];
  for (const group of groups ?? []) {
    out.push(group);
    if (group.children?.length) {
      out.push(...collectGroups(group.children));
    }
  }
  return out;
};

export interface ConferenceStandingRow {
  id: string;
  seed: number | null;
  record: StandingRecord | null;
}

export const parseConferenceStandingRows = (
  payload: EspnStandingsPayload | null | undefined,
  conference: Conference,
): ConferenceStandingRow[] => {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const groups = collectGroups(payload.children);
  const rows: ConferenceStandingRow[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    const groupConference = conferenceOf(group);
    for (const entry of group.standings?.entries ?? []) {
      const id = teamIdFromAbbrev(entry.team?.abbreviation);
      if (!id || seen.has(id) || NBA_TEAMS_BY_ID[id]?.conference !== conference) {
        continue;
      }
      if (groupConference && groupConference !== conference) {
        continue;
      }
      seen.add(id);
      rows.push({
        id,
        seed: playoffSeedFromEntry(entry),
        record: recordFromEntry(entry),
      });
    }
  }
  if (rows.some((row) => row.seed != null)) {
    rows.sort((left, right) => {
      if (left.seed != null && right.seed != null && left.seed !== right.seed) {
        return left.seed - right.seed;
      }
      if (left.seed != null && right.seed == null) {
        return -1;
      }
      if (left.seed == null && right.seed != null) {
        return 1;
      }
      return 0;
    });
  }
  return rows.slice(0, SLOT_COUNT);
};

export const parseConferenceStandings = (
  payload: EspnStandingsPayload | null | undefined,
  conference: Conference,
): string[] => parseConferenceStandingRows(payload, conference).map((row) => row.id);

export const recordsFromStandingRows = (
  rows: ConferenceStandingRow[],
): Record<string, StandingRecord> => {
  const records: Record<string, StandingRecord> = {};
  rows.forEach((row) => {
    if (row.record) {
      records[row.id] = row.record;
    }
  });
  return records;
};

export const slotsFromTeamIds = (ids: string[]): RankingSlots => {
  const slots: RankingSlots = Array.from({ length: SLOT_COUNT }, () => null);
  ids.slice(0, SLOT_COUNT).forEach((id, index) => {
    slots[index] = id;
  });
  return slots;
};

/** Put each club on its playoff seed (1–15). Gaps stay empty until unseeded leftovers fill them. */
export const slotsFromStandingRows = (
  rows: ConferenceStandingRow[],
): RankingSlots => {
  const slots = createEmptySlots();
  const placed = new Set<string>();
  for (const row of rows) {
    if (row.seed == null || row.seed < 1 || row.seed > SLOT_COUNT) {
      continue;
    }
    const index = row.seed - 1;
    if (slots[index]) {
      continue;
    }
    slots[index] = row.id;
    placed.add(row.id);
  }
  let cursor = 0;
  for (const row of rows) {
    if (placed.has(row.id)) {
      continue;
    }
    while (cursor < SLOT_COUNT && slots[cursor]) {
      cursor += 1;
    }
    if (cursor >= SLOT_COUNT) {
      break;
    }
    slots[cursor] = row.id;
    placed.add(row.id);
    cursor += 1;
  }
  return slots;
};

const recordsFromPayload = (
  payload: EspnStandingsPayload,
): Record<string, StandingRecord> => ({
  ...recordsFromStandingRows(parseConferenceStandingRows(payload, "East")),
  ...recordsFromStandingRows(parseConferenceStandingRows(payload, "West")),
});

let recordsCache: Record<string, StandingRecord> | null = null;

export const fetchConferenceStandingsBundle = async (
  conference: Conference,
): Promise<{ slots: RankingSlots; records: Record<string, StandingRecord> }> => {
  const response = await fetch(ESPN_STANDINGS_URL, {
    mode: "cors",
    credentials: "omit",
  });
  if (!response.ok) {
    throw new Error("Could not load NBA standings");
  }
  const payload = (await response.json()) as EspnStandingsPayload;
  const rows = parseConferenceStandingRows(payload, conference);
  recordsCache = recordsFromPayload(payload);
  return {
    slots: slotsFromStandingRows(rows),
    records: recordsCache,
  };
};

export const fetchConferenceStandings = async (
  conference: Conference,
): Promise<RankingSlots> => {
  const bundle = await fetchConferenceStandingsBundle(conference);
  return bundle.slots;
};

export const fetchAllStandingRecords = async (): Promise<
  Record<string, StandingRecord>
> => {
  if (recordsCache) {
    return recordsCache;
  }
  const response = await fetch(ESPN_STANDINGS_URL, {
    mode: "cors",
    credentials: "omit",
  });
  if (!response.ok) {
    return {};
  }
  const payload = (await response.json()) as EspnStandingsPayload;
  recordsCache = recordsFromPayload(payload);
  return recordsCache;
};
