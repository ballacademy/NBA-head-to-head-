import activeStarBestSeasonsData from "../../data/active-star-best-seasons.json";
import careerActiveAllStarsData from "../../data/all-stars-career-active.json";
import {
  buildDefensiveRatings,
  toDefensiveStatInput,
} from "./defenseRating";
import { lookupJerseyNumber } from "./jerseyNumbers";
import {
  deriveStyles,
  estimateDefense,
  estimateUsage,
  type RawSeasonPlayer,
} from "./playerPool";
import { buildPlayerPositions } from "./positions";
import type { Player } from "./types";

interface ActiveStarBestSeasonRaw {
  bbrPlayerId: string;
  name: string;
  team: string;
  bestSeason: string;
  position?: string;
  positions?: string[] | null;
  age?: number;
  gamesPlayed: number;
  gamesStarted?: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalsAttempted?: number;
  threePointersAttempted?: number;
  threePointPct?: number;
  trueShooting?: number | null;
}

const careerActiveAllStarBbrIds = new Set(careerActiveAllStarsData.bbrPlayerIds);

const toRawSeasonPlayer = (raw: ActiveStarBestSeasonRaw): RawSeasonPlayer => ({
  id: `${raw.bbrPlayerId}-${raw.team.toLowerCase()}`,
  bbrPlayerId: raw.bbrPlayerId,
  name: raw.name,
  team: raw.team,
  position: raw.position,
  positions: raw.positions ?? undefined,
  age: raw.age,
  gamesPlayed: raw.gamesPlayed,
  gamesStarted: raw.gamesStarted,
  minutes: raw.minutes,
  points: raw.points,
  rebounds: raw.rebounds,
  assists: raw.assists,
  steals: raw.steals,
  blocks: raw.blocks,
  turnovers: raw.turnovers,
  fieldGoalsAttempted: raw.fieldGoalsAttempted,
  threePointersAttempted: raw.threePointersAttempted,
  threePointPct: raw.threePointPct,
  trueShooting: raw.trueShooting,
});

const POSITION_HEIGHT_INCHES: Record<Player["position"], number> = {
  PG: 74.5,
  SG: 76.5,
  SF: 79.5,
  PF: 81.5,
  C: 84,
};

const toActiveStarPlayer = (
  raw: ActiveStarBestSeasonRaw,
  rating?: { defense: number; grade: Player["defenseGrade"] },
): Player => {
  const statInput = toRawSeasonPlayer(raw);
  const positions = buildPlayerPositions(statInput);
  const position = positions[0];

  return {
    id: statInput.id,
    bbrPlayerId: raw.bbrPlayerId,
    name: raw.name,
    team: raw.team,
    position,
    positions,
    jerseyNumber: lookupJerseyNumber(raw.bbrPlayerId, statInput.id, raw.team),
    points: raw.points,
    rebounds: raw.rebounds,
    assists: raw.assists,
    steals: raw.steals,
    blocks: raw.blocks,
    turnovers: raw.turnovers,
    trueShooting: raw.trueShooting ?? 0.54,
    threePoint: raw.threePointPct ?? 0,
    threePointersAttempted: raw.threePointersAttempted ?? 0,
    fieldGoalsAttempted: raw.fieldGoalsAttempted ?? 0,
    minutes: raw.minutes,
    heightInches: POSITION_HEIGHT_INCHES[position] ?? 80,
    usage: estimateUsage(statInput),
    defense: rating?.defense ?? estimateDefense(statInput),
    defenseGrade: rating?.grade,
    gamesPlayed: raw.gamesPlayed,
    age: raw.age,
    styles: deriveStyles(statInput, position),
    salary: undefined,
  };
};

const buildActiveStarPlayers = () => {
  const rawPlayers = activeStarBestSeasonsData.players as ActiveStarBestSeasonRaw[];
  const defensiveInputs = rawPlayers.map((raw) => ({
    id: raw.bbrPlayerId,
    bbrPlayerId: raw.bbrPlayerId,
    ...toDefensiveStatInput(toRawSeasonPlayer(raw)),
  }));
  const ratings = buildDefensiveRatings(defensiveInputs);

  return rawPlayers.map((raw) =>
    toActiveStarPlayer(raw, ratings.get(raw.bbrPlayerId)),
  );
};

const activeStarPlayers = buildActiveStarPlayers();
const activeStarIds = new Set(activeStarPlayers.map((player) => player.id));
const activeStarBbrIds = new Set(
  activeStarPlayers
    .map((player) => player.bbrPlayerId)
    .filter((bbrPlayerId): bbrPlayerId is string => Boolean(bbrPlayerId)),
);

export const ACTIVE_STAR_COUNT = activeStarPlayers.length;

export const isCareerActiveAllStar = (player: Pick<Player, "bbrPlayerId">) =>
  Boolean(player.bbrPlayerId && careerActiveAllStarBbrIds.has(player.bbrPlayerId));

export const isActiveStarPlayer = (player: Pick<Player, "id" | "bbrPlayerId">) =>
  activeStarIds.has(player.id) ||
  Boolean(player.bbrPlayerId && activeStarBbrIds.has(player.bbrPlayerId));

export const getActiveStarPlayers = () => [...activeStarPlayers];

export const getActiveStarPlayerIds = () => [...activeStarIds];
