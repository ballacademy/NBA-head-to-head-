import type { EraId } from "./eraUnlocks";
import { deriveStyles, estimateDefense, estimateUsage } from "./playerPool";
import { buildPlayerPositions } from "./positions";
import { applyPositionOverride } from "./positionOverrides";
import { lookupJerseyNumber } from "./jerseyNumbers";
import type { Player } from "./types";
import era1970sData from "../../data/era-players-1970s.json";
import era1980sData from "../../data/era-players-1980s.json";
import era1990sData from "../../data/era-players-1990s.json";
import era2000sData from "../../data/era-players-2000s.json";
import era2010sData from "../../data/era-players-2010s.json";

interface EraPlayerRaw {
  id: string;
  bbrPlayerId?: string;
  name: string;
  team: string;
  position?: string;
  age?: number;
  gamesPlayed: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers?: number;
  threePointPct?: number;
  trueShooting?: number;
  salary?: number;
}

interface EraPlayersFile {
  era: EraId;
  players: EraPlayerRaw[];
}

const ERA_FILES = [
  era1970sData,
  era1980sData,
  era1990sData,
  era2000sData,
  era2010sData,
] as EraPlayersFile[];

const POSITION_HEIGHT_INCHES: Record<Player["position"], number> = {
  PG: 74.5,
  SG: 76.5,
  SF: 79.5,
  PF: 81.5,
  C: 84,
};

const toEraPlayer = (raw: EraPlayerRaw, era: EraId): Player => {
  const positions = applyPositionOverride(
    raw.bbrPlayerId,
    buildPlayerPositions({
      position: raw.position,
      positions: raw.position ? [raw.position] : undefined,
      assists: raw.assists,
      rebounds: raw.rebounds,
      blocks: raw.blocks,
    }),
  );
  const position = positions[0];
  const statInput = {
    id: raw.id,
    bbrPlayerId: raw.bbrPlayerId,
    name: raw.name,
    team: raw.team,
    position: raw.position,
    gamesPlayed: raw.gamesPlayed,
    minutes: raw.minutes,
    points: raw.points,
    rebounds: raw.rebounds,
    assists: raw.assists,
    steals: raw.steals,
    blocks: raw.blocks,
    turnovers: raw.turnovers ?? 0,
    threePointPct: raw.threePointPct,
    trueShooting: raw.trueShooting,
    fieldGoalsAttempted: raw.points * 0.8,
    threePointersAttempted: (raw.threePointPct ?? 0) > 0 ? 4 : 0,
    freeThrowsAttempted: raw.points * 0.25,
  };

  return {
    id: raw.id,
    bbrPlayerId: raw.bbrPlayerId,
    name: raw.name,
    team: raw.team,
    position,
    positions,
    jerseyNumber: lookupJerseyNumber(raw.bbrPlayerId, raw.id, raw.team),
    points: raw.points,
    rebounds: raw.rebounds,
    assists: raw.assists,
    steals: raw.steals,
    blocks: raw.blocks,
    turnovers: raw.turnovers ?? 0,
    trueShooting: raw.trueShooting ?? 0.54,
    threePoint: raw.threePointPct ?? 0,
    threePointersAttempted: statInput.threePointersAttempted,
    fieldGoalsAttempted: statInput.fieldGoalsAttempted,
    freeThrowsAttempted: statInput.freeThrowsAttempted,
    freeThrowPct: 0.75,
    personalFouls: Math.max(1, raw.points * 0.08),
    minutes: raw.minutes,
    heightInches: POSITION_HEIGHT_INCHES[position] ?? 80,
    usage: estimateUsage(statInput),
    defense: estimateDefense(statInput),
    gamesPlayed: raw.gamesPlayed,
    age: raw.age,
    styles: deriveStyles(statInput, position),
    era,
    salary: raw.salary,
  };
};

const eraPlayersByEra = new Map<EraId, Player[]>(
  ERA_FILES.map((file) => [
    file.era,
    file.players.map((player) => toEraPlayer(player, file.era)),
  ]),
);

export const getEraPlayers = (era: EraId) => eraPlayersByEra.get(era) ?? [];

export const getEraPlayerPool = (unlockedEras: EraId[]) =>
  unlockedEras.flatMap((era) => getEraPlayers(era));

export const getAllEraPlayers = () =>
  ERA_FILES.flatMap((file) => getEraPlayers(file.era));

export const eraPlayersById = new Map(
  getAllEraPlayers().map((player) => [player.id, player]),
);

export const getLegendPlayerCount = () => getAllEraPlayers().length;

export const getEraPlayerCount = (era: EraId) => getEraPlayers(era).length;
