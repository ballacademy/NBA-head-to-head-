# AGENTS.md

## Cursor Cloud specific instructions

This is a frontend-only React 19 + TypeScript single-page app built with Vite. There is no backend, database, or external service — everything runs client-side.

Standard commands are defined in `package.json` scripts (see README):

- `npm run dev` — start the Vite dev server (defaults to http://localhost:5173/). Use `-- --host` to expose on the network.
- `npm test` — run the Vitest suite (`vitest run`).
- `npm run build` — type-check (`tsc -b`) then produce a production build in `dist/`.

Notes:

- There is no lint script; type-checking happens via `tsc -b` as part of `npm run build`.
- The dev server prints the actual URL on startup; check its output rather than assuming the port (Vite increments to 5174+ if 5173 is taken).

### Player roster data

- The roster is exposed via `src/data/players.ts` (`players`). It re-exports `generatedPlayers` from `src/data/players.generated.ts`.
- `src/data/players.generated.ts` is overwritten by `npm run fetch-roster` (script: `scripts/fetch-roster.mjs`), which pulls an authoritative roster + per-game stats from the balldontlie API. The committed version is a fallback that re-exports the hand-curated roster in `src/data/roster.curated.ts`, so the app builds/runs even if the script has never been run.
- To refresh real data: `BALLDONTLIE_API_KEY=xxxxx npm run fetch-roster` (optional `SEASON=2025`, where 2025 means the 2025-26 season). Get a key at https://app.balldontlie.io. Note: balldontlie's `season_averages` endpoint may require a paid tier; the free tier may only expose teams/players. The committed `players.generated.ts` should normally be the curated fallback unless a real fetch has been committed.
- Pure transform helpers shared with the script live in `scripts/roster-transform.mjs` and are unit-tested in `src/lib/roster-transform.test.ts`. The feed's coarse positions ("G"/"F"/"C") are mapped to PG/SG/SF/PF/C primary + secondary positions; `usage` and `defense` are approximated (documented in the script) since the feed doesn't provide them.
- Do NOT add `npm run fetch-roster` to the VM update script — it needs a secret and network access and is a manual/CI step.
