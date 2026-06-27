import { readFileSync, writeFileSync } from "node:fs";

interface ManualPoolPlayer {
  bbrPlayerId: string;
  name: string;
  team: string;
  position: string;
  age: number;
  gamesPlayed: number;
  gamesStarted: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  fieldGoalPct: number;
  threePointersMade: number;
  threePointersAttempted: number;
  threePointPct: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  freeThrowPct: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  defensiveWinShares: number;
  defensiveBoxPlusMinus: number;
  defensiveReboundPct: number;
  stealPct: number;
  blockPct: number;
  personalFouls: number;
  effectiveFieldGoalPct: number;
  trueShooting: number;
  salary: number;
  jerseyNumber: number;
  recentAllStar?: boolean;
  careerActiveAllStar?: boolean;
}

const MANUAL_PLAYERS: ManualPoolPlayer[] = [
  {
    bbrPlayerId: "halibty01",
    name: "Tyrese Haliburton",
    team: "IND",
    position: "PG",
    age: 25,
    gamesPlayed: 73,
    gamesStarted: 73,
    minutes: 33.6,
    points: 18.6,
    rebounds: 3.5,
    assists: 9.2,
    steals: 1.4,
    blocks: 0.7,
    turnovers: 1.6,
    fieldGoalsMade: 6.5,
    fieldGoalsAttempted: 13.8,
    fieldGoalPct: 0.473,
    threePointersMade: 3.0,
    threePointersAttempted: 7.7,
    threePointPct: 0.388,
    freeThrowsMade: 2.6,
    freeThrowsAttempted: 3.0,
    freeThrowPct: 0.851,
    offensiveRebounds: 0.6,
    defensiveRebounds: 3.0,
    defensiveWinShares: 2.3,
    defensiveBoxPlusMinus: 0.2,
    defensiveReboundPct: 9.7,
    stealPct: 2.1,
    blockPct: 1.8,
    personalFouls: 1.3,
    effectiveFieldGoalPct: 0.582,
    trueShooting: 0.616,
    salary: 42_176_400,
    jerseyNumber: 0,
    recentAllStar: true,
    careerActiveAllStar: true,
  },
  {
    bbrPlayerId: "irvinky01",
    name: "Kyrie Irving",
    team: "DAL",
    position: "SG",
    age: 33,
    gamesPlayed: 50,
    gamesStarted: 50,
    minutes: 36.1,
    points: 24.7,
    rebounds: 4.8,
    assists: 4.6,
    steals: 1.3,
    blocks: 0.5,
    turnovers: 2.2,
    fieldGoalsMade: 8.9,
    fieldGoalsAttempted: 18.9,
    fieldGoalPct: 0.473,
    threePointersMade: 2.9,
    threePointersAttempted: 7.2,
    threePointPct: 0.401,
    freeThrowsMade: 3.9,
    freeThrowsAttempted: 4.3,
    freeThrowPct: 0.916,
    offensiveRebounds: 1.2,
    defensiveRebounds: 3.6,
    defensiveWinShares: 1.3,
    defensiveBoxPlusMinus: -0.5,
    defensiveReboundPct: 10.6,
    stealPct: 1.8,
    blockPct: 1.1,
    personalFouls: 2.0,
    effectiveFieldGoalPct: 0.549,
    trueShooting: 0.594,
    salary: 41_000_000,
    jerseyNumber: 2,
    recentAllStar: true,
    careerActiveAllStar: true,
  },
  {
    bbrPlayerId: "lillada01",
    name: "Damian Lillard",
    team: "MIL",
    position: "PG",
    age: 35,
    gamesPlayed: 58,
    gamesStarted: 58,
    minutes: 36.1,
    points: 24.9,
    rebounds: 4.7,
    assists: 7.1,
    steals: 1.2,
    blocks: 0.2,
    turnovers: 2.8,
    fieldGoalsMade: 7.7,
    fieldGoalsAttempted: 17.1,
    fieldGoalPct: 0.448,
    threePointersMade: 3.4,
    threePointersAttempted: 9.0,
    threePointPct: 0.376,
    freeThrowsMade: 6.2,
    freeThrowsAttempted: 6.8,
    freeThrowPct: 0.921,
    offensiveRebounds: 0.5,
    defensiveRebounds: 4.2,
    defensiveWinShares: 2.0,
    defensiveBoxPlusMinus: -0.6,
    defensiveReboundPct: 12.1,
    stealPct: 1.6,
    blockPct: 0.4,
    personalFouls: 1.7,
    effectiveFieldGoalPct: 0.547,
    trueShooting: 0.621,
    salary: 48_787_676,
    jerseyNumber: 0,
    recentAllStar: true,
    careerActiveAllStar: true,
  },
  {
    bbrPlayerId: "vanvlfr01",
    name: "Fred VanVleet",
    team: "HOU",
    position: "PG",
    age: 31,
    gamesPlayed: 60,
    gamesStarted: 60,
    minutes: 35.2,
    points: 14.1,
    rebounds: 3.7,
    assists: 5.6,
    steals: 1.6,
    blocks: 0.4,
    turnovers: 1.5,
    fieldGoalsMade: 4.8,
    fieldGoalsAttempted: 12.7,
    fieldGoalPct: 0.378,
    threePointersMade: 2.7,
    threePointersAttempted: 7.7,
    threePointPct: 0.345,
    freeThrowsMade: 1.9,
    freeThrowsAttempted: 2.3,
    freeThrowPct: 0.81,
    offensiveRebounds: 0.5,
    defensiveRebounds: 3.2,
    defensiveWinShares: 2.8,
    defensiveBoxPlusMinus: 1.3,
    defensiveReboundPct: 9.7,
    stealPct: 2.2,
    blockPct: 1.1,
    personalFouls: 2.3,
    effectiveFieldGoalPct: 0.483,
    trueShooting: 0.515,
    salary: 42_846_615,
    jerseyNumber: 5,
    careerActiveAllStar: true,
  },
];

const statsPath = new URL(
  "../data/nba-stats/nba-player-stats-202526-regular-season.json",
  import.meta.url,
);
const salariesPath = new URL("../data/nba-salaries-202627.json", import.meta.url);
const jerseysPath = new URL("../data/nba-jersey-numbers.json", import.meta.url);
const recentAllStarsPath = new URL("../data/all-stars-recent.json", import.meta.url);
const careerActivePath = new URL(
  "../data/all-stars-career-active.json",
  import.meta.url,
);

const toRawPlayer = (player: ManualPoolPlayer) => ({
  id: `${player.bbrPlayerId}-${player.team.toLowerCase()}`,
  bbrPlayerId: player.bbrPlayerId,
  name: player.name,
  team: player.team,
  position: player.position,
  age: player.age,
  gamesPlayed: player.gamesPlayed,
  gamesStarted: player.gamesStarted,
  minutes: player.minutes,
  points: player.points,
  rebounds: player.rebounds,
  assists: player.assists,
  steals: player.steals,
  blocks: player.blocks,
  turnovers: player.turnovers,
  fieldGoalsMade: player.fieldGoalsMade,
  fieldGoalsAttempted: player.fieldGoalsAttempted,
  fieldGoalPct: player.fieldGoalPct,
  threePointersMade: player.threePointersMade,
  threePointersAttempted: player.threePointersAttempted,
  threePointPct: player.threePointPct,
  freeThrowsMade: player.freeThrowsMade,
  freeThrowsAttempted: player.freeThrowsAttempted,
  freeThrowPct: player.freeThrowPct,
  offensiveRebounds: player.offensiveRebounds,
  defensiveRebounds: player.defensiveRebounds,
  defensiveWinShares: player.defensiveWinShares,
  defensiveBoxPlusMinus: player.defensiveBoxPlusMinus,
  defensiveReboundPct: player.defensiveReboundPct,
  stealPct: player.stealPct,
  blockPct: player.blockPct,
  personalFouls: player.personalFouls,
  effectiveFieldGoalPct: player.effectiveFieldGoalPct,
  trueShooting: player.trueShooting,
});

const statsFile = JSON.parse(readFileSync(statsPath, "utf8")) as {
  playerCount: number;
  uniquePlayerCount?: number;
  players: Array<{ bbrPlayerId?: string }>;
  manualPoolAdditions?: string[];
};

const salariesFile = JSON.parse(readFileSync(salariesPath, "utf8")) as {
  playerCount: number;
  salaries: Record<string, number>;
};

const jerseysFile = JSON.parse(readFileSync(jerseysPath, "utf8")) as {
  playerCount: number;
  byPlayerId: Record<string, { jerseyNumber: number; team: string }>;
};

const recentAllStarsFile = JSON.parse(readFileSync(recentAllStarsPath, "utf8")) as {
  bbrPlayerIds: string[];
};

const careerActiveFile = JSON.parse(readFileSync(careerActivePath, "utf8")) as {
  bbrPlayerIds: string[];
};

const added: string[] = [];
const skipped: string[] = [];

for (const player of MANUAL_PLAYERS) {
  const exists = statsFile.players.some(
    (entry) => entry.bbrPlayerId === player.bbrPlayerId,
  );

  if (exists) {
    skipped.push(player.name);
    continue;
  }

  statsFile.players.push(toRawPlayer(player));
  salariesFile.salaries[player.bbrPlayerId] = player.salary;
  jerseysFile.byPlayerId[player.bbrPlayerId] = {
    jerseyNumber: player.jerseyNumber,
    team: player.team,
  };

  if (player.recentAllStar && !recentAllStarsFile.bbrPlayerIds.includes(player.bbrPlayerId)) {
    recentAllStarsFile.bbrPlayerIds.push(player.bbrPlayerId);
  }

  if (
    player.careerActiveAllStar &&
    !careerActiveFile.bbrPlayerIds.includes(player.bbrPlayerId)
  ) {
    careerActiveFile.bbrPlayerIds.push(player.bbrPlayerId);
  }

  added.push(player.name);
}

recentAllStarsFile.bbrPlayerIds = recentAllStarsFile.bbrPlayerIds
  .map((id) => (id === "irvingky01" ? "irvinky01" : id))
  .filter((id, index, ids) => ids.indexOf(id) === index)
  .sort();

careerActiveFile.bbrPlayerIds = careerActiveFile.bbrPlayerIds
  .map((id) => (id === "irvingky01" ? "irvinky01" : id))
  .filter((id, index, ids) => ids.indexOf(id) === index)
  .sort();

statsFile.players.sort(
  (left, right) =>
    (right as { points: number }).points - (left as { points: number }).points ||
    String((left as { name: string }).name).localeCompare(
      String((right as { name: string }).name),
    ),
);

statsFile.playerCount = statsFile.players.length;
statsFile.uniquePlayerCount = statsFile.players.length;
statsFile.manualPoolAdditions = [
  ...new Set([...(statsFile.manualPoolAdditions ?? []), ...added]),
];

salariesFile.playerCount = Object.keys(salariesFile.salaries).length;
jerseysFile.playerCount = Object.keys(jerseysFile.byPlayerId).length;

writeFileSync(statsPath, `${JSON.stringify(statsFile, null, 2)}\n`);
writeFileSync(salariesPath, `${JSON.stringify(salariesFile, null, 2)}\n`);
writeFileSync(jerseysPath, `${JSON.stringify(jerseysFile, null, 2)}\n`);
writeFileSync(recentAllStarsPath, `${JSON.stringify(recentAllStarsFile, null, 2)}\n`);
writeFileSync(careerActivePath, `${JSON.stringify(careerActiveFile, null, 2)}\n`);

console.log(`Added ${added.length} players: ${added.join(", ") || "(none)"}`);
if (skipped.length) {
  console.log(`Skipped existing players: ${skipped.join(", ")}`);
}
