# Human lineup matchmaking backend

Classic and Pro Head to Head now try to match you against a **stored lineup from another real player** before falling back to queue-only mode.

## Architecture

- **Frontend**: Cloudflare Pages (`dist/`)
- **API**: Cloudflare Pages Functions in `functions/api/`
- **Database**: Cloudflare D1 (`draft-day-gm`)

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/opponent?mode=classic\|ranked&playerId=...&elo=...` | Fetch a recent human lineup near your Elo |
| `POST` | `/api/lineups` | Store your completed lineup for future opponents |

## Flow

1. Player starts Classic or Pro H2H.
2. Client calls `/api/opponent`.
3. If a lineup exists: you draft live against that ghost opponent's five.
4. If none exists: you draft anyway and your lineup is posted for the next GM.
5. After every completed H2H match, your lineup is saved to the pool.

All-Time mode still uses the local opponent simulator. Daily Draft is unchanged.

## One-time Cloudflare setup

1. Create a D1 database:
   ```bash
   npx wrangler d1 create draft-day-gm
   ```
2. Copy the `database_id` into `wrangler.toml` (`REPLACE_WITH_D1_DATABASE_ID`).
3. Apply the migration:
   ```bash
   npx wrangler d1 migrations apply draft-day-gm --remote
   ```
4. In the Cloudflare dashboard, bind the D1 database to your Pages project as **`DB`**.
5. Redeploy Pages from `main`.

Local API testing:
```bash
npx wrangler pages dev dist --d1 DB=draft-day-gm
```

## Notes

- Opponents are drawn from the last 14 days, preferring ±250 Elo.
- Your own lineups are excluded from matchmaking.
- Until D1 is bound in production, the app gracefully falls back to queue-only mode.
