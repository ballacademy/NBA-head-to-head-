import type { Conference, Division } from "./types";

export interface TeamInfo {
  division: Division;
  conference: Conference;
}

// All 30 NBA teams mapped to their division and conference.
export const TEAMS: Record<string, TeamInfo> = {
  // Eastern Conference - Atlantic
  BOS: { division: "Atlantic", conference: "East" },
  BKN: { division: "Atlantic", conference: "East" },
  NYK: { division: "Atlantic", conference: "East" },
  PHI: { division: "Atlantic", conference: "East" },
  TOR: { division: "Atlantic", conference: "East" },
  // Eastern Conference - Central
  CHI: { division: "Central", conference: "East" },
  CLE: { division: "Central", conference: "East" },
  DET: { division: "Central", conference: "East" },
  IND: { division: "Central", conference: "East" },
  MIL: { division: "Central", conference: "East" },
  // Eastern Conference - Southeast
  ATL: { division: "Southeast", conference: "East" },
  CHA: { division: "Southeast", conference: "East" },
  MIA: { division: "Southeast", conference: "East" },
  ORL: { division: "Southeast", conference: "East" },
  WAS: { division: "Southeast", conference: "East" },
  // Western Conference - Northwest
  DEN: { division: "Northwest", conference: "West" },
  MIN: { division: "Northwest", conference: "West" },
  OKC: { division: "Northwest", conference: "West" },
  POR: { division: "Northwest", conference: "West" },
  UTA: { division: "Northwest", conference: "West" },
  // Western Conference - Pacific
  GSW: { division: "Pacific", conference: "West" },
  LAC: { division: "Pacific", conference: "West" },
  LAL: { division: "Pacific", conference: "West" },
  PHX: { division: "Pacific", conference: "West" },
  SAC: { division: "Pacific", conference: "West" },
  // Western Conference - Southwest
  DAL: { division: "Southwest", conference: "West" },
  HOU: { division: "Southwest", conference: "West" },
  MEM: { division: "Southwest", conference: "West" },
  NOP: { division: "Southwest", conference: "West" },
  SAS: { division: "Southwest", conference: "West" },
};

export const conferenceForTeam = (team: string): Conference | undefined =>
  TEAMS[team]?.conference;

export const divisionForTeam = (team: string): Division | undefined =>
  TEAMS[team]?.division;
