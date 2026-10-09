export type Conference = "East" | "West";

export interface NbaTeam {
  id: string;
  name: string;
  shortName: string;
  conference: Conference;
  /** Local ESPN 500px PNG, vendored from a.espncdn.com. */
  logoSrc: string;
  /** Top-left cell fill, sampled from the example graphic where possible. */
  cellFrom: string;
  /** Bottom-right cell fill (diagonal shade). */
  cellTo: string;
}

const logo = (id: string) => `/nba-logos/${id}.png`;

/**
 * 30 NBA teams with Instagram-board cell colors.
 * East fills are sampled from the reference graphic; West fills use the same
 * saturated diagonal treatment from each club's identity colors.
 */
export const NBA_TEAMS: NbaTeam[] = [
  { id: "ATL", name: "Atlanta Hawks", shortName: "Hawks", conference: "East", logoSrc: logo("ATL"), cellFrom: "#d53b3d", cellTo: "#70360e" },
  { id: "BOS", name: "Boston Celtics", shortName: "Celtics", conference: "East", logoSrc: logo("BOS"), cellFrom: "#348c35", cellTo: "#183c18" },
  { id: "BKN", name: "Brooklyn Nets", shortName: "Nets", conference: "East", logoSrc: logo("BKN"), cellFrom: "#424242", cellTo: "#14191c" },
  { id: "CHA", name: "Charlotte Hornets", shortName: "Hornets", conference: "East", logoSrc: logo("CHA"), cellFrom: "#0d908a", cellTo: "#0c5b5b" },
  { id: "CHI", name: "Chicago Bulls", shortName: "Bulls", conference: "East", logoSrc: logo("CHI"), cellFrom: "#e11432", cellTo: "#640817" },
  { id: "CLE", name: "Cleveland Cavaliers", shortName: "Cavaliers", conference: "East", logoSrc: logo("CLE"), cellFrom: "#8d3e4f", cellTo: "#581023" },
  { id: "DAL", name: "Dallas Mavericks", shortName: "Mavericks", conference: "West", logoSrc: logo("DAL"), cellFrom: "#1a6fb5", cellTo: "#0a3358" },
  { id: "DEN", name: "Denver Nuggets", shortName: "Nuggets", conference: "West", logoSrc: logo("DEN"), cellFrom: "#1a3a6b", cellTo: "#0b1a33" },
  { id: "DET", name: "Detroit Pistons", shortName: "Pistons", conference: "East", logoSrc: logo("DET"), cellFrom: "#e22e45", cellTo: "#74113d" },
  { id: "GSW", name: "Golden State Warriors", shortName: "Warriors", conference: "West", logoSrc: logo("GSW"), cellFrom: "#1d5aad", cellTo: "#102a5c" },
  { id: "HOU", name: "Houston Rockets", shortName: "Rockets", conference: "West", logoSrc: logo("HOU"), cellFrom: "#ce1141", cellTo: "#5c081c" },
  { id: "IND", name: "Indiana Pacers", shortName: "Pacers", conference: "East", logoSrc: logo("IND"), cellFrom: "#f8ca1f", cellTo: "#81702b" },
  { id: "LAC", name: "LA Clippers", shortName: "Clippers", conference: "West", logoSrc: logo("LAC"), cellFrom: "#d32033", cellTo: "#1d2f6b" },
  { id: "LAL", name: "Los Angeles Lakers", shortName: "Lakers", conference: "West", logoSrc: logo("LAL"), cellFrom: "#6a35a0", cellTo: "#2e1248" },
  { id: "MEM", name: "Memphis Grizzlies", shortName: "Grizzlies", conference: "West", logoSrc: logo("MEM"), cellFrom: "#5d76a9", cellTo: "#1a2248" },
  { id: "MIA", name: "Miami Heat", shortName: "Heat", conference: "East", logoSrc: logo("MIA"), cellFrom: "#ae2344", cellTo: "#660420" },
  { id: "MIL", name: "Milwaukee Bucks", shortName: "Bucks", conference: "East", logoSrc: logo("MIL"), cellFrom: "#306824", cellTo: "#08431c" },
  { id: "MIN", name: "Minnesota Timberwolves", shortName: "Timberwolves", conference: "West", logoSrc: logo("MIN"), cellFrom: "#1a4a7a", cellTo: "#0a1c33" },
  { id: "NOP", name: "New Orleans Pelicans", shortName: "Pelicans", conference: "West", logoSrc: logo("NOP"), cellFrom: "#0c3a6b", cellTo: "#6b1020" },
  { id: "NYK", name: "New York Knicks", shortName: "Knicks", conference: "East", logoSrc: logo("NYK"), cellFrom: "#de5e1f", cellTo: "#5a3d37" },
  { id: "OKC", name: "Oklahoma City Thunder", shortName: "Thunder", conference: "West", logoSrc: logo("OKC"), cellFrom: "#1a8fd0", cellTo: "#0a4a72" },
  { id: "ORL", name: "Orlando Magic", shortName: "Magic", conference: "East", logoSrc: logo("ORL"), cellFrom: "#0d61b9", cellTo: "#05466a" },
  { id: "PHI", name: "Philadelphia 76ers", shortName: "76ers", conference: "East", logoSrc: logo("PHI"), cellFrom: "#d32c45", cellTo: "#5b2b41" },
  { id: "PHX", name: "Phoenix Suns", shortName: "Suns", conference: "West", logoSrc: logo("PHX"), cellFrom: "#e56020", cellTo: "#3a1860" },
  { id: "POR", name: "Portland Trail Blazers", shortName: "Trail Blazers", conference: "West", logoSrc: logo("POR"), cellFrom: "#e03a3e", cellTo: "#1a1a1a" },
  { id: "SAC", name: "Sacramento Kings", shortName: "Kings", conference: "West", logoSrc: logo("SAC"), cellFrom: "#6b3a96", cellTo: "#2c1648" },
  { id: "SAS", name: "San Antonio Spurs", shortName: "Spurs", conference: "West", logoSrc: logo("SAS"), cellFrom: "#8a9299", cellTo: "#1a1a1a" },
  { id: "TOR", name: "Toronto Raptors", shortName: "Raptors", conference: "East", logoSrc: logo("TOR"), cellFrom: "#760e29", cellTo: "#421b2d" },
  { id: "UTA", name: "Utah Jazz", shortName: "Jazz", conference: "West", logoSrc: logo("UTA"), cellFrom: "#1a4a8c", cellTo: "#0a2248" },
  { id: "WAS", name: "Washington Wizards", shortName: "Wizards", conference: "East", logoSrc: logo("WAS"), cellFrom: "#14285d", cellTo: "#0e3747" },
];

export const NBA_TEAMS_BY_ID: Record<string, NbaTeam> = Object.fromEntries(
  NBA_TEAMS.map((team) => [team.id, team]),
);

export const EAST_TEAMS = NBA_TEAMS.filter((team) => team.conference === "East");
export const WEST_TEAMS = NBA_TEAMS.filter((team) => team.conference === "West");

export const getTeam = (id: string | null | undefined): NbaTeam | null =>
  (id && NBA_TEAMS_BY_ID[id]) || null;
