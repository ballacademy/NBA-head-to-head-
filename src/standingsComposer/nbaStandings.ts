import { ESPN_ABBREV_TO_TEAM } from "../playerOfTheDayComposer/lastGame";
import { NBA_TEAMS_BY_ID, type Conference } from "./teams";
import type { RankingSlots, StandingRecord } from "./rankingState";
import { SLOT_COUNT } from "./rankingState";

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

const statNumber = (entry: EspnStandingEntry, names: string[]) => {
  const tokens = names.map((name) => name.toLowerCase());
  for (const stat of entry.stats ?? []) {
    const label = `${stat.name ?? ""} ${stat.abbreviation ?? ""}`.toLowerCase();
    if (!tokens.some((token) => label.includes(token))) {
      continue;
    }
    const value = Number(stat.value ?? stat.displayValue);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return null;
};

const last10FromEntry = (entry: EspnStandingEntry): string | null => {
  for (const stat of entry.stats ?? []) {
    const label = `${stat.name ?? ""} ${stat.abbreviation ?? ""}`.toLowerCase();
    if (!label.includes("last ten") && stat.abbreviation !== "L10") {
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
  const wins = statNumber(entry, ["wins", " w"]);
  const losses = statNumber(entry, ["losses", " l"]);
  if (wins == null || losses == null) {
    return null;
  }
  return { wins, losses, last10: last10FromEntry(entry) };
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
  const match =
    groups.find((group) => conferenceOf(group) === conference) ??
    groups.find((group) =>
      (group.standings?.entries ?? []).some((entry) => {
        const id = teamIdFromAbbrev(entry.team?.abbreviation);
        return id && NBA_TEAMS_BY_ID[id]?.conference === conference;
      }),
    );
  const rows: ConferenceStandingRow[] = [];
  const seen = new Set<string>();
  for (const entry of match?.standings?.entries ?? []) {
    const id = teamIdFromAbbrev(entry.team?.abbreviation);
    if (!id || seen.has(id) || NBA_TEAMS_BY_ID[id]?.conference !== conference) {
      continue;
    }
    seen.add(id);
    rows.push({ id, record: recordFromEntry(entry) });
    if (rows.length >= SLOT_COUNT) {
      break;
    }
  }
  return rows;
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
  return {
    slots: slotsFromTeamIds(rows.map((row) => row.id)),
    records: recordsFromStandingRows(rows),
  };
};

export const fetchConferenceStandings = async (
  conference: Conference,
): Promise<RankingSlots> => {
  const bundle = await fetchConferenceStandingsBundle(conference);
  return bundle.slots;
};

let recordsCache: Record<string, StandingRecord> | null = null;

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
  recordsCache = {
    ...recordsFromStandingRows(parseConferenceStandingRows(payload, "East")),
    ...recordsFromStandingRows(parseConferenceStandingRows(payload, "West")),
  };
  return recordsCache;
};
