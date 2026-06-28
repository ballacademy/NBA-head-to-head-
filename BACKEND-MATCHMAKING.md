# Human lineup matchmaking backend

Classic and Pro Head to Head search for a live opponent for **7–10 seconds**, then fall back to a stored human lineup or an NPC based on your Banner rating.

## Architecture

- **Frontend**: Cloudflare Pages (`dist/`)
- **API**: Cloudflare Pages Functions in `functions/api/`
- **Database**: Cloudflare D1 (`draft-day-gm`)

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/opponent?mode=classic\|ranked&playerId=...&elo=...` | Fetch a recent unconsumed human lineup near your Banners |
| `POST` | `/api/queue` | Join the live matchmaking queue |
| `GET` | `/api/queue?mode=...&playerId=...` | Poll for a live opponent match |
| `DELETE` | `/api/queue?mode=...&playerId=...` | Leave the live matchmaking queue |
| `GET` | `/api/live-match?matchId=...&playerId=...` | Poll a live match for opponent lineup status |
| `POST` | `/api/live-match` | Submit your lineup for a live match |
| `POST` | `/api/lineups` | Store your completed lineup for future opponents |
| `GET` | `/api/pending?mode=...&playerId=...` | Check queued lineup lock |
| `POST` | `/api/match-results` | Mark a stored ghost lineup as consumed after a challenger faces it |
| `GET` | `/api/daily-scores?dateKey=YYYY-MM-DD&goalId=...&playerId=...` | Fetch today's Daily Draft scores (other players' values + your entry) |
| `POST` | `/api/daily-scores` | Submit or update your Daily Draft score for today |
| `GET` | `/api/leaderboards?mode=classic\|ranked&sort=elo\|winStreak\|lossStreak&seasonId=YYYY-MM` | Fetch global leaderboard entries (real players only) |
| `POST` | `/api/leaderboards` | Upsert your Classic or Pro leaderboard row after a match |

## Flow

1. Player starts Classic or Pro H2H.
2. Client joins `/api/queue` and polls for **7–10 seconds** for another active player in the same mode.
3. If a live opponent is found: both players draft simultaneously; the waiting screen appears only until the other player finishes.
4. If no live opponent is found: client instantly checks `/api/opponent` for a stored human lineup.
5. If a stored lineup exists: draft against that ghost using the stored team name, with no waiting screen.
6. If none exists and the player is **below 1500 Banners**: fall back to an NPC opponent and full results.
7. If none exists and the player is **1500+ Banners**: draft once, queue the lineup, and block new drafts until that lineup is matched.
8. When a challenger faces a saved ghost lineup, `/api/match-results` marks that stored lineup consumed. The original drafter only sees results from their own initial matchup, not future challengers.

All-Time mode still uses the local opponent simulator. Daily Draft submissions sync to D1 for shared percentiles. Classic and Pro leaderboards sync to D1 after each match.

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
   Includes `0003_daily_draft_scores.sql` for shared Daily Draft percentiles, `0004_leaderboard_entries.sql` for global leaderboards, `0005_live_matchmaking.sql` for live opponent pairing, and `0006_purge_invalid_stored_lineups.sql` to remove pre-fix ghost lineups with fewer than five player ids.
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
- Stored ghost lineups must contain exactly five unique non-empty player ids. Invalid rows are skipped and marked consumed; migration `0006` deletes lineups saved before the 2026-06-28 salary-cap draft fix.
