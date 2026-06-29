/**
 * Compare projected wins for each team's top-five minutes lineup
 * against 2024-25 regular-season records (injury-adjusted when starters
 * missed significant time).
 *
 * Run: npx tsx scripts/calibrate_projected_records.ts
 */
import { readFileSync } from "node:fs";
import { toPlayer, type RawSeasonPlayer } from "../src/lib/playerPool";
import { calculateLineupScore, projectRecord } from "../src/lib/scoring";
import {
  adjustTeamWinsForStarterAvailability,
  getStarterAvailability,
} from "../src/lib/teamRecordBaseline";
import type { Player } from "../src/lib/types";
import teamSeasonBaselines from "../data/team-season-baselines.json";

const TEAM_WINS = teamSeasonBaselines.winsByTeam as Record<string, number>;

interface RawWithGs extends RawSeasonPlayer {
  gamesStarted: number;
}

const stats = JSON.parse(
  readFileSync(
    new URL("../data/nba-stats/nba-player-stats-202526-regular-season.json", import.meta.url),
    "utf8",
  ),
) as { players: RawSeasonPlayer[] };

const playersByTeam = new Map<string, RawWithGs[]>();

for (const raw of stats.players) {
  if (!raw.team || raw.team === "FA") {
    continue;
  }

  const bucket = playersByTeam.get(raw.team) ?? [];
  bucket.push({ ...raw, gamesStarted: raw.gamesStarted ?? 0 });
  playersByTeam.set(raw.team, bucket);
}

const buildStarterLineup = (team: string): Player[] => {
  const roster = playersByTeam.get(team) ?? [];
  const topFive = [...roster]
    .sort(
      (left, right) =>
        right.minutes - left.minutes ||
        right.gamesStarted - left.gamesStarted ||
        right.points - left.points,
    )
    .slice(0, 5);

  return topFive.map((raw) => toPlayer(raw));
};

interface TeamComparison {
  team: string;
  actualWins: number;
  baselineWins: number;
  projectedWins: number;
  ovrOnlyWins: number;
  ovr: number;
  delta: number;
  starters: string[];
  availability: number;
}

const comparisons: TeamComparison[] = [];

for (const [team, actualWins] of Object.entries(TEAM_WINS)) {
  const lineup = buildStarterLineup(team);

  if (lineup.length < 5) {
    continue;
  }

  const score = calculateLineupScore(lineup);
  const availability = getStarterAvailability(lineup);
  const baselineWins = adjustTeamWinsForStarterAvailability(
    actualWins,
    availability,
  );

  comparisons.push({
    team,
    actualWins,
    baselineWins,
    projectedWins: score.projectedRecord.wins,
    ovrOnlyWins: projectRecord(score.preciseTotal).wins,
    ovr: score.preciseTotal,
    delta: score.projectedRecord.wins - baselineWins,
    starters: lineup.map((player) => player.name),
    availability: Math.round(availability * 100) / 100,
  });
}

comparisons.sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));

const mean = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const mae = mean(comparisons.map((entry) => Math.abs(entry.delta)));
const bias = mean(comparisons.map((entry) => entry.delta));

console.log("Team starter calibration vs 2024-25 records (injury-adjusted baseline)\n");
console.log(
  "team | actual | baseline | projected | ovrOnly | OVR  | delta | avail | starters",
);
for (const entry of comparisons) {
  console.log(
    `${entry.team.padEnd(4)} | ${String(entry.actualWins).padStart(6)} | ${String(entry.baselineWins).padStart(8)} | ${String(entry.projectedWins).padStart(9)} | ${String(entry.ovrOnlyWins).padStart(7)} | ${entry.ovr.toFixed(1).padStart(4)} | ${entry.delta >= 0 ? "+" : ""}${entry.delta.toString().padStart(4)} | ${entry.availability.toFixed(2).padStart(5)} | ${entry.starters.join(", ")}`,
  );
}

console.log(`\nTeams compared: ${comparisons.length}`);
console.log(`Mean absolute error: ${mae.toFixed(1)} wins`);
console.log(`Mean bias (projected - baseline): ${bias >= 0 ? "+" : ""}${bias.toFixed(1)} wins`);

const elite = comparisons.filter((entry) => entry.baselineWins >= 55);
const mid = comparisons.filter(
  (entry) => entry.baselineWins >= 35 && entry.baselineWins < 55,
);
const low = comparisons.filter((entry) => entry.baselineWins < 35);

const summarize = (label: string, bucket: TeamComparison[]) => {
  if (bucket.length === 0) {
    return;
  }

  console.log(
    `${label}: MAE ${mean(bucket.map((entry) => Math.abs(entry.delta))).toFixed(1)}, bias ${mean(bucket.map((entry) => entry.delta)).toFixed(1)} (${bucket.length} teams)`,
  );
};

console.log("");
summarize("Elite (55+ baseline wins)", elite);
summarize("Mid (35-54)", mid);
summarize("Low (<35)", low);
