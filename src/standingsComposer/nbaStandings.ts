import { ESPN_ABBREV_TO_TEAM } from "../playerOfTheDayComposer/lastGame";
import { NBA_TEAMS_BY_ID, type Conference } from "./teams";
import type { RankingSlots } from "./rankingState";
import { SLOT_COUNT } from "./rankingState";

export const ESPN_STANDINGS_URL =
  "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings";

interface EspnStandingTeam {
  abbreviation?: string;
  displayName?: string;
}

interface EspnStandingEntry {
  team?: EspnStandingTeam;
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

export const parseConferenceStandings = (
  payload: EspnStandingsPayload | null | undefined,
  conference: Conference,
): string[] => {
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
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of match?.standings?.entries ?? []) {
    const id = teamIdFromAbbrev(entry.team?.abbreviation);
    if (!id || seen.has(id) || NBA_TEAMS_BY_ID[id]?.conference !== conference) {
      continue;
    }
    seen.add(id);
    ids.push(id);
    if (ids.length >= SLOT_COUNT) {
      break;
    }
  }
  return ids;
};

export const slotsFromTeamIds = (ids: string[]): RankingSlots => {
  const slots: RankingSlots = Array.from({ length: SLOT_COUNT }, () => null);
  ids.slice(0, SLOT_COUNT).forEach((id, index) => {
    slots[index] = id;
  });
  return slots;
};

export const fetchConferenceStandings = async (
  conference: Conference,
): Promise<RankingSlots> => {
  const response = await fetch(ESPN_STANDINGS_URL, {
    mode: "cors",
    credentials: "omit",
  });
  if (!response.ok) {
    throw new Error("Could not load NBA standings");
  }
  const payload = (await response.json()) as EspnStandingsPayload;
  return slotsFromTeamIds(parseConferenceStandings(payload, conference));
};
