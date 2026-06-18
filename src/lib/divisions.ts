import type { Division } from "./types";

const divisionTeams: Record<Division, readonly string[]> = {
  Atlantic: ["BOS", "BRK", "BKN", "NYK", "PHI", "TOR"],
  Central: ["CHI", "CLE", "DET", "IND", "MIL"],
  Southeast: ["ATL", "CHA", "CHO", "MIA", "ORL", "WAS"],
  Northwest: ["DEN", "MIN", "OKC", "POR", "SEA", "UTA"],
  Pacific: ["GSW", "LAC", "LAL", "PHO", "PHX", "SAC"],
  Southwest: ["DAL", "HOU", "MEM", "NOP", "NO", "SAS", "SA"],
};

const teamDivisionLookup = new Map<string, Division>();

for (const [division, teams] of Object.entries(divisionTeams) as Array<
  [Division, readonly string[]]
>) {
  for (const team of teams) {
    teamDivisionLookup.set(team, division);
  }
}

const multiTeamPattern = /^\dTM$/;

export const isDraftableTeam = (team: string) => !multiTeamPattern.test(team);

export const getDivisionForTeam = (team: string): Division | undefined => {
  if (!isDraftableTeam(team)) {
    return undefined;
  }

  return teamDivisionLookup.get(team);
};

export const DIVISIONS: Division[] = [
  "Atlantic",
  "Central",
  "Southeast",
  "Northwest",
  "Pacific",
  "Southwest",
];
