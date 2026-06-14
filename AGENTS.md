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
