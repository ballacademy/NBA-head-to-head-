import catalog from "../../data/nba-active-tier-players.json";
import { getTeam, NBA_TEAMS_BY_ID, type Conference } from "../standingsComposer/teams";

export interface TierPlayer {
  id: string;
  name: string;
  team: string;
  headshotUrl: string;
}

type CatalogFile = {
  description: string;
  source: string;
  headshotCdn: string;
  playerCount: number;
  players: TierPlayer[];
};

const data = catalog as CatalogFile;

export const NBA_ACTIVE_PLAYERS: TierPlayer[] = data.players;
export const NBA_ACTIVE_PLAYER_COUNT = data.playerCount;
export const NBA_HEADSHOT_CDN = data.headshotCdn;
export const NBA_ROSTER_SOURCE = data.source;

export const NBA_ACTIVE_PLAYERS_BY_ID: Record<string, TierPlayer> =
  Object.fromEntries(NBA_ACTIVE_PLAYERS.map((player) => [player.id, player]));

export const getPlayer = (id: string | null | undefined): TierPlayer | null =>
  (id && NBA_ACTIVE_PLAYERS_BY_ID[id]) || null;

export type PlayerConferenceFilter = "all" | Conference;

export const searchPlayers = (
  query: string,
  conference: PlayerConferenceFilter = "all",
): TierPlayer[] => {
  const needle = query.trim().toLowerCase();
  return NBA_ACTIVE_PLAYERS.filter((player) => {
    if (conference !== "all") {
      const team = getTeam(player.team);
      if (team?.conference !== conference) {
        return false;
      }
    }
    if (!needle) {
      return true;
    }
    const teamCode = needle.toUpperCase();
    if (NBA_TEAMS_BY_ID[teamCode]) {
      return player.team === teamCode;
    }
    return (
      player.name.toLowerCase().includes(needle) ||
      player.team.toLowerCase().includes(needle)
    );
  });
};

/** A few stars for screenshots / seed boards. */
export const EXAMPLE_PLAYER_IDS = {
  lebron: "1966",
  jokic: "3112335",
  shai: "4278073",
  luka: "3945274",
  wemby: "5104157",
  ant: "4594268",
  curry: "3975",
  tatum: "4065648",
} as const;
