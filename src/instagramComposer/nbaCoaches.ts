import {
  getConferenceForTeam,
  getDivisionForTeam,
} from "../lib/divisions";
import { NBA_TEAMS_BY_ID } from "../standingsComposer/teams";
import type { TierPlayer } from "../tierListComposer/nbaActivePlayers";

const playerShot = (espnId: string) =>
  `https://a.espncdn.com/i/headshots/nba/players/full/${espnId}.png`;

const coachShot = (espnId: string) =>
  `https://a.espncdn.com/i/headshots/nba/coaches/full/${espnId}.png`;

interface CoachSeed {
  name: string;
  team: string;
  playerId?: string;
  coachId?: string;
}

/** 2026-27 head coaches — picker rows for pyramid and the player tier list. */
const COACH_SEEDS: CoachSeed[] = [
  { name: "Quin Snyder", team: "ATL", coachId: "2490178" },
  { name: "Joe Mazzulla", team: "BOS", coachId: "4431698" },
  { name: "Jordi Fernandez", team: "BKN", coachId: "4682255" },
  { name: "Charles Lee", team: "CHA", coachId: "4432810" },
  { name: "Tiago Splitter", team: "CHI", playerId: "3213" },
  { name: "Kenny Atkinson", team: "CLE", coachId: "401148" },
  { name: "Dusty May", team: "DAL", coachId: "4925349" },
  { name: "David Adelman", team: "DEN", coachId: "4872264" },
  { name: "J.B. Bickerstaff", team: "DET", coachId: "4273867" },
  { name: "Steve Kerr", team: "GSW", playerId: "996" },
  { name: "Ime Udoka", team: "HOU", playerId: "2171" },
  { name: "Rick Carlisle", team: "IND", playerId: "43" },
  { name: "Tyronn Lue", team: "LAC", playerId: "165" },
  { name: "JJ Redick", team: "LAL", playerId: "3989" },
  { name: "Tuomas Iisalo", team: "MEM", coachId: "4875120" },
  { name: "Erik Spoelstra", team: "MIA", coachId: "3087" },
  { name: "Taylor Jenkins", team: "MIL", coachId: "4066256" },
  { name: "Chris Finch", team: "MIN", coachId: "4277987" },
  { name: "Jamahl Mosley", team: "NOP", coachId: "4277988" },
  { name: "Mike Brown", team: "NYK", coachId: "1977" },
  { name: "Mark Daigneault", team: "OKC", coachId: "4277989" },
  { name: "Sean Sweeney", team: "ORL", coachId: "4925350" },
  { name: "Nick Nurse", team: "PHI", coachId: "4062748" },
  { name: "Jordan Ott", team: "PHX", coachId: "4875121" },
  { name: "Micah Nori", team: "POR", coachId: "4925351" },
  { name: "Doug Christie", team: "SAC", playerId: "16" },
  { name: "Mitch Johnson", team: "SAS", coachId: "4872265" },
  { name: "Darko Rajakovic", team: "TOR", coachId: "4431704" },
  { name: "Will Hardy", team: "UTA", coachId: "4431705" },
  { name: "Brian Keefe", team: "WAS", coachId: "4682256" },
];

const toCoach = (seed: CoachSeed): TierPlayer => {
  const team = NBA_TEAMS_BY_ID[seed.team];
  const headshotUrl = seed.playerId
    ? playerShot(seed.playerId)
    : seed.coachId
      ? coachShot(seed.coachId)
      : team?.logoSrc ?? "";
  return {
    id: `coach-${seed.team}`,
    name: seed.name,
    team: seed.team,
    headshotUrl,
    age: 48,
    heightInches: 76,
    displayHeight: "",
    position: "G",
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

export const withCoaches = (players: readonly TierPlayer[]) => [
  ...NBA_COACHES,
  ...players,
];
