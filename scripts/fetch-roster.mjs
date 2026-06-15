#!/usr/bin/env node
/**
 * Fetches an authoritative NBA roster + per-game stats from the balldontlie API
 * (https://docs.balldontlie.io) and writes src/data/players.generated.ts.
 *
 * Usage:
 *   BALLDONTLIE_API_KEY=xxxxx npm run fetch-roster
 *   # optional: SEASON=2025 (season=2025 == the 2025-26 season)
 *
 * Notes:
 *   - balldontlie positions are coarse ("G", "F", "C", "G-F", "F-C"). They are
 *     mapped to our PG/SG/SF/PF/C model as a primary + secondary positions.
 *   - `usage` and `defense` are not provided by the feed, so they are derived
 *     with documented approximations. Box-score and shooting stats come
 *     directly from the source.
 *   - Players who were active but logged 0 games in the target season (e.g. a
 *     full-season injury) fall back to the previous season and are flagged
 *     priorSeason.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  deriveStyles,
  mapPositions,
  slug,
  statsFromAverage,
} from "./roster-transform.mjs";

const API_KEY = process.env.BALLDONTLIE_API_KEY;
const SEASON = Number(process.env.SEASON ?? 2025); // 2025 => 2025-26 season
const BASE = "https://api.balldontlie.io/v1";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE =
  process.env.ROSTER_OUT ?? resolve(__dirname, "../src/data/players.generated.ts");

// 30 current NBA team abbreviations (matches src/lib/teams.ts).
const TEAM_ABBRS = new Set([
  "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
]);

const sleep = (milliseconds) => new Promise((r) => setTimeout(r, milliseconds));

async function api(path, { retries = 4 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: API_KEY },
    });
    if (res.status === 429) {
      const wait = 2 ** attempt * 1000;
      console.warn(`Rate limited; waiting ${wait}ms…`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`);
    }
    return res.json();
  }
  throw new Error(`GET ${path} failed after ${retries} retries`);
}

async function fetchActivePlayers() {
  const players = [];
  let cursor = null;
  do {
    const q = new URLSearchParams({ per_page: "100" });
    if (cursor) q.set("cursor", String(cursor));
    const json = await api(`/players/active?${q}`);
    for (const p of json.data ?? []) {
      const abbr = p.team?.abbreviation;
      if (abbr && TEAM_ABBRS.has(abbr)) players.push(p);
    }
    cursor = json.meta?.next_cursor ?? null;
    await sleep(250);
  } while (cursor);
  return players;
}

// season_averages accepts up to 100 player ids per request.
async function fetchSeasonAverages(season, ids) {
  const byId = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const q = new URLSearchParams({ season: String(season) });
    for (const id of chunk) q.append("player_ids[]", String(id));
    const json = await api(`/season_averages?${q}`);
    for (const row of json.data ?? []) byId.set(row.player_id, row);
    await sleep(300);
  }
  return byId;
}

export async function main() {
  if (!API_KEY) {
    console.error(
      "Missing BALLDONTLIE_API_KEY. Get a free key at https://app.balldontlie.io and re-run:\n" +
        "  BALLDONTLIE_API_KEY=xxxxx npm run fetch-roster",
    );
    process.exit(1);
  }

  console.log(`Fetching active players for season ${SEASON} (${SEASON}-${SEASON + 1})…`);
  const active = await fetchActivePlayers();
  console.log(`Active players on current NBA teams: ${active.length}`);

  const ids = active.map((p) => p.id);
  const current = await fetchSeasonAverages(SEASON, ids);

  // Players who didn't log the target season -> try previous season.
  const missing = active.filter((p) => !current.has(p.id)).map((p) => p.id);
  const prior = missing.length
    ? await fetchSeasonAverages(SEASON - 1, missing)
    : new Map();

  const players = [];
  for (const p of active) {
    const [position, secondary] = mapPositions(p.position);
    if (!position) continue;

    const usingPrior = !current.has(p.id);
    const avg = current.get(p.id) ?? prior.get(p.id);
    if (!avg || (avg.games_played ?? 0) === 0) continue;

    const name = `${p.first_name} ${p.last_name}`.trim();
    const stats = statsFromAverage(avg, position);
    const player = {
      id: slug(name),
      name,
      team: p.team.abbreviation,
      position,
      ...(secondary.length ? { secondaryPositions: secondary } : {}),
      styles: deriveStyles(stats, position),
      ...stats,
      ...(usingPrior ? { priorSeason: true } : {}),
    };
    players.push(player);
  }

  // De-dupe ids (rare name collisions get a numeric suffix).
  const seen = new Map();
  for (const player of players) {
    const count = seen.get(player.id) ?? 0;
    if (count > 0) player.id = `${player.id}-${count + 1}`;
    seen.set(player.id, count + 1);
  }

  players.sort((a, b) => a.name.localeCompare(b.name));

  const header =
    "// AUTO-GENERATED by scripts/fetch-roster.mjs. Do not edit by hand.\n" +
    `// Source: balldontlie API. Season: ${SEASON}-${SEASON + 1}.\n` +
    'import type { Player } from "../lib/types";\n\n';
  const body =
    `export const generatedPlayers: Player[] = ${JSON.stringify(players, null, 2)};\n\n` +
    `export const rosterSource = "balldontlie";\n` +
    `export const rosterUpdatedAt = ${JSON.stringify(new Date().toISOString())};\n`;

  writeFileSync(OUT_FILE, header + body);
  console.log(`Wrote ${players.length} players to ${OUT_FILE}`);
}

// Only auto-run when invoked directly (so the module can be imported in tests).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
