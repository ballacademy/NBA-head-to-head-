import {
  getConferenceForTeam,
  getDivisionForTeam,
} from "../lib/divisions";
import { NBA_TEAMS_BY_ID } from "../standingsComposer/teams";
import type { TierPlayer } from "../tierListComposer/nbaActivePlayers";

const playerShot = (espnId: string) =>
  `https://a.espncdn.com/i/headshots/nba/players/full/${espnId}.png`;

const coach65Shot = (espnId: string) =>
  `https://a.espncdn.com/i/headshots/nba/coaches/65/${espnId}.jpg`;

interface CoachSeed {
  name: string;
  team: string;
  /** ESPN players/full PNG — former players with working frontal portraits. */
  playerId?: string;
  /** ESPN coaches/65 JPG — frontal studio stamps when full PNGs 404. */
  coach65Id?: string;
}

/** 2026-27 head coaches — picker rows for pyramid, tier list, and Every Team. */
const COACH_SEEDS: CoachSeed[] = [
  { name: "Quin Snyder", team: "ATL", coach65Id: "52081" },
  { name: "Joe Mazzulla", team: "BOS", coach65Id: "2232684" },
  { name: "Jordi Fernandez", team: "BKN" },
  { name: "Charles Lee", team: "CHA" },
  { name: "Tiago Splitter", team: "CHI", playerId: "3233" },
  { name: "Kenny Atkinson", team: "CLE", coach65Id: "6809" },
  { name: "Dusty May", team: "DAL" },
  { name: "David Adelman", team: "DEN" },
  { name: "J.B. Bickerstaff", team: "DET", coach65Id: "2613478" },
  { name: "Steve Kerr", team: "GSW", playerId: "996" },
  { name: "Ime Udoka", team: "HOU", playerId: "2171" },
  { name: "Rick Carlisle", team: "IND", coach65Id: "4661" },
  { name: "Tyronn Lue", team: "LAC", playerId: "165" },
  { name: "JJ Redick", team: "LAL", playerId: "3989" },
  { name: "Tuomas Iisalo", team: "MEM" },
  { name: "Erik Spoelstra", team: "MIA", playerId: "6749" },
  { name: "Taylor Jenkins", team: "MIL" },
  { name: "Chris Finch", team: "MIN" },
  { name: "Jamahl Mosley", team: "NOP" },
  { name: "Mike Brown", team: "NYK", coach65Id: "3612" },
  { name: "Mark Daigneault", team: "OKC" },
  { name: "Sean Sweeney", team: "ORL", playerId: "2142798" },
  { name: "Nick Nurse", team: "PHI", coach65Id: "52085" },
  { name: "Jordan Ott", team: "PHX" },
  { name: "Micah Nori", team: "POR", playerId: "2487822" },
  { name: "Doug Christie", team: "SAC", playerId: "16" },
  { name: "Mitch Johnson", team: "SAS" },
  { name: "Darko Rajakovic", team: "TOR" },
  { name: "Will Hardy", team: "UTA" },
  { name: "Brian Keefe", team: "WAS" },
];

const toCoach = (seed: CoachSeed): TierPlayer => {
  const team = NBA_TEAMS_BY_ID[seed.team];
  const headshotUrl = seed.playerId
    ? playerShot(seed.playerId)
    : seed.coach65Id
      ? coach65Shot(seed.coach65Id)
      : team?.logoSrc ?? "";
  return {
    id: `coach-${seed.team}`,
    name: seed.name,
    team: seed.team,
    headshotUrl,
    age: 48,
    heightInches: 76,
    displayHeight: "",
    position: "HC",
    positionGroup: "G",
    division: getDivisionForTeam(seed.team) ?? "Atlantic",
    conference:
      getConferenceForTeam(seed.team) ?? team?.conference ?? "East",
    draftYear: null,
    draftRound: null,
    draftPick: null,
    country: null,
    experienceYears: 8,
    allStar: false,
    ppg: 0,
    role: "coach",
  };
};

export const NBA_COACHES: TierPlayer[] = COACH_SEEDS.map(toCoach);

export const NBA_COACHES_BY_ID: Record<string, TierPlayer> = Object.fromEntries(
  NBA_COACHES.map((coach) => [coach.id, coach]),
);

export const isCoachId = (id: string | null | undefined) =>
  Boolean(id && id.startsWith("coach-"));

export const getCoach = (id: string | null | undefined): TierPlayer | null =>
  (id && NBA_COACHES_BY_ID[id]) || null;

export const getTeamCoach = (teamId: string | null | undefined): TierPlayer | null =>
  teamId ? NBA_COACHES.find((coach) => coach.team === teamId) ?? null : null;

export const withCoaches = (players: readonly TierPlayer[]) => [
  ...NBA_COACHES,
  ...players,
];
