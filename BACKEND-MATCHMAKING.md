# Human lineup matchmaking backend

Classic and Pro Head to Head search for a stored human lineup for up to **20 seconds**, then fall back based on your Banner rating.

## Architecture

- **Frontend**: Cloudflare Pages (`dist/`)
- **API**: Cloudflare Pages Functions in `functions/api/`
- **Database**: Cloudflare D1 (`draft-day-gm`)

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/opponent?mode=classic\|ranked&playerId=...&elo=...` | Fetch a recent unconsumed human lineup near your Banners |
| `POST` | `/api/lineups` | Store your completed lineup for future opponents |
| `GET` | `/api/pending?mode=...&playerId=...` | Check queued lineup lock / pending owner results |
| `POST` | `/api/pending` | Acknowledge a delivered owner result |
| `POST` | `/api/match-results` | Score a ghost-owner when someone beats their saved lineup |

## Flow

1. Player starts Classic or Pro H2H.
2. Client polls `/api/opponent` for up to 20 seconds.
3. If a lineup exists: draft live against that ghost opponent, then full results.
4. If none exists and the player is **below 1500 Banners**: fall back to an NPC opponent and full results.
5. If none exists and the player is **1500+ Banners**: draft once, queue the lineup, and block new drafts until that lineup receives a score from a live opponent.
6. When a challenger beats a saved ghost lineup, `/api/match-results` records the owner’s win/loss and Banner change for delivery on next visit.

All-Time mode still uses the local opponent simulator. Daily Draft is unchanged.

## One-time Cloudflare setup

1. Create a D1 database:
   ```bash
   npx wrangler d1 create draft-day-gm
   ```
2. Copy the `database_id` into `wrangler.toml`.
3. Apply migrations:
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

- Opponents are drawn from the last 14 days, preferring ±250 Banners.
- Your own lineups are excluded from matchmaking.
- Consumed ghost lineups are no longer offered to other players.
