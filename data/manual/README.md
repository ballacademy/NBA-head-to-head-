# Manual data workflow

Use these files when you want to refresh Draft Day GM data **without scraping**
Basketball Reference or Spotrac.

The game itself only reads committed JSON under `data/`. These scripts are
maintainer tools that turn editable CSV files into those JSON files.

## Player stats

### Option A: Curated CSV (recommended for compliance)

1. Copy `player-stats-template.csv` or edit rows in a spreadsheet.
2. Fill one row per player using snake_case or camelCase column names.
3. Build the app stats JSON:

```bash
python3 scripts/csv_to_stats_json.py \
  --input data/manual/player-stats.csv \
  --season 2025-26 \
  --output data/nba-stats/nba-player-stats-202526-regular-season.json
```

Required columns per row:

- `bbr_player_id` (or `bbrPlayerId`)
- `name`
- `team`
- `position`
- `games_played`
- `minutes`
- `points`, `rebounds`, `assists`, `steals`, `blocks`

Optional columns include shooting splits, advanced defense rates, and
`true_shooting`.

See `fixtures/player-stats-mini.csv` for a two-player example.

### Option B: Existing per-game CSV export (no live scraping)

If you already have Basketball Reference-style CSV exports in `data/nba-stats/`,
you can rebuild JSON locally without hitting their website:

```bash
python3 scripts/csv_to_stats_json.py \
  --input data/nba-stats/nba-player-stats-202526-regular-season-per-game.csv \
  --advanced-csv data/nba-stats/nba-player-stats-202526-regular-season-advanced.csv \
  --season 2025-26 \
  --output data/nba-stats/nba-player-stats-202526-regular-season.json \
  --source curated-csv-export
```

## Salaries (draft pool only)

Maintain salaries in `nba-salaries.csv` instead of running
`build_player_salaries.py`.

### First-time setup: export the current pool

This creates an editable CSV containing only players who already appear in the
stats pool:

```bash
python3 scripts/csv_to_salaries_json.py \
  --export-csv data/manual/nba-salaries.csv \
  --from-json data/nba-salaries-202627.json \
  --stats-pool data/nba-stats/nba-player-stats-202526-regular-season.json
```

Fill in the `name` and `notes` columns if you want, then edit `salary_usd`.

Recent free-agent signings that are not yet on Basketball Reference can go in
`nba-salary-supplements.csv`. Those rows are merged into the salary JSON only
when the player is missing from the main CSV.

### Batch free-agent signings

When several deals are announced at once, add rows to
`nba-free-agent-signings.csv` and run:

```bash
npm run data:signings:apply
```

That script updates salaries (main CSV when the player already has a row,
otherwise supplements), syncs team overrides and stats teams, refreshes jersey
tags, and rebuilds `nba-salaries-202627.json`.

Tracker columns: `bbr_player_id`, `name`, `team`, `salary_usd`, `announced_at`,
`source`, `notes`.

Roster moves without a new contract can still be refreshed with
`python3 scripts/sync_espn_roster_teams.py`.

Full salary automation is not possible without a licensed contract feed — BBR
only covers players with published `y2` rows, and ESPN does not expose deal
terms. The signing tracker plus `apply_free_agent_signings.py` is the
maintainer workflow until BBR catches up.

### Rebuild the salary JSON

```bash
python3 scripts/csv_to_salaries_json.py \
  --input data/manual/nba-salaries.csv \
  --output data/nba-salaries-202627.json \
  --season 2026-27 \
  --stats-pool data/nba-stats/nba-player-stats-202526-regular-season.json \
  --warn-missing-pool
```

Flags:

- `--stats-pool` keeps only salaries for players in the stats JSON (recommended).
- `--warn-missing-pool` prints players with enough games played who still lack a
  salary row.

Template header: `nba-salaries-template.csv`  
Example rows: `fixtures/nba-salaries-mini.csv`

## npm shortcuts

```bash
npm run data:stats:csv -- --input data/manual/player-stats.csv
npm run data:salaries:export-pool
npm run data:salaries:build
npm run data:manual:test
```

## Suggested refresh checklist

1. Update `data/manual/player-stats.csv` or per-game CSV exports.
2. Run `csv_to_stats_json.py`.
3. Update `data/manual/nba-salaries.csv`.
4. Run `csv_to_salaries_json.py --warn-missing-pool`.
5. Run `npm run build` and `npm test`.

## Do not use in production refresh

- `scripts/fetch_nba_player_stats.py` (scrapes Basketball Reference)
- `scripts/build_player_salaries.py` (scrapes BBR contracts and Spotrac options)

Use licensed APIs or these manual CSV workflows instead.
