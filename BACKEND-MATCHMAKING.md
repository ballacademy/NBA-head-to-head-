# Human lineup matchmaking backend

Casual and Pro Head to Head search for a live opponent for **7–10 seconds**, then fall back to a stored human lineup or an NPC based on your Banner rating.

## Architecture

- **Frontend**: Cloudflare Pages (`dist/`)
- **API**: Cloudflare Pages Functions in `functions/api/`
- **Database**: Cloudflare D1 (`draft-day-gm` in production; `draft-day-gm-qa` for the QA Pages project — see `DEPLOY-CLOUDFLARE.md`)

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/opponent?mode=classic\|ranked&playerId=...&elo=...` | Fetch a recent unconsumed human lineup near your Banners |
| `POST` | `/api/queue` | Join the live matchmaking queue |
| `GET` | `/api/queue?mode=...&playerId=...` | Poll for a live opponent match |
| `DELETE` | `/api/queue?mode=...&playerId=...` | Leave the live matchmaking queue |
| `POST` | `/api/private-room` | Create a private friend room (account required) → room code |
| `GET` | `/api/private-room?code=...&playerId=...` | Host poll until a friend joins |
| `DELETE` | `/api/private-room?code=...&playerId=...` | Host cancel while waiting |
| `POST` | `/api/private-room/join` | Join a private room with a code (account required) |
| `GET` | `/api/live-match?matchId=...&playerId=...` | Poll a live match for opponent lineup status |
| `POST` | `/api/live-match` | Submit your lineup for a live match |
| `POST` | `/api/lineups` | Store your completed lineup for future opponents |
| `GET` | `/api/collection?playerId=...` | Fetch linked-account collection unlocks |
| `PUT` | `/api/collection` | Union-merge and upsert collection unlocks (account required) |
| `GET` | `/api/pending?mode=...&playerId=...` | Check queued lineup lock + unacknowledged owner result |
| `POST` | `/api/pending` | Acknowledge an owner match result (`resultId` + `playerId`) |
| `POST` | `/api/match-results` | Consume a ghost lineup and write the owner's pending result (server-rescored) |
| `DELETE` | `/api/opponent?mode=...&playerId=...` | Release a soft-claimed ghost lineup (cancel search) |
| `GET` | `/api/daily-scores?dateKey=YYYY-MM-DD&goalId=...&playerId=...` | Fetch today's Daily Draft scores (other players' values + your entry) |
| `POST` | `/api/daily-scores` | Submit or update your Daily Draft score for today |
| `GET` | `/api/leaderboards?mode=classic\|ranked&sort=elo\|winStreak\|lossStreak&seasonId=YYYY-MM` | Fetch global leaderboard entries (real players only) |
| `POST` | `/api/leaderboards` | Upsert your Casual or Pro leaderboard row after a match |
| `GET` | `/api/player-profile?playerId=...` | Fetch legacy / current-season profile snippets |
| `POST` | `/api/account/register` | Optional: bind username + password hash to current `playerId` |
| `POST` | `/api/account/login` | Optional: restore a saved `playerId` with username/password |
| `GET` | `/api/account/status?playerId=...` | Whether the current GM identity already has an account |

## Optional accounts

Accounts are optional. Register stores a username and PBKDF2-SHA-256 password hash linked to the browser GM `playerId`. Login returns that `playerId` so the client can restore identity after cleared local storage. Password resets use one-time codes (`0013_password_reset_tokens.sql`) and signup email (`0014_player_account_email.sql`); see `PASSWORD-RESET.md`.

```bash
npx wrangler d1 migrations apply draft-day-gm --remote
```

Production and QA should stay current through **`0034_account_sessions.sql`**. The repo ships migrations in `migrations/` including:

| Migration | Purpose |
|-----------|---------|
| `0001` | Stored ghost lineups |
| `0002` | Owner match results queue |
| `0003` | Daily Draft shared scores |
| `0004` | Global leaderboards |
| `0005` | Live matchmaking queue |
| `0006` | Purge invalid stored lineups |
| `0007` | Player legacy stats |
| `0008` | Daily Draft mode column |
| `0009` | Stored lineup matchmaking meta |
| `0010` | Optional player accounts |
| `0011` | Soft-claim ghost matchmaking |
| `0012` | Account signup index |
| `0013` | Password reset tokens |
| `0014` | Account email for recovery |
| `0015` | Published tier lists |
| `0016` | Purge unlinked leaderboard rows |
| `0017` | Real owner match scores |
| `0018` | Private friend rooms |
| `0019` | Cloud collection sync |
| `0020` | Cloud achievements sync |
| `0021` | Product analytics events |
| `0022` | Community posts |
| `0023` | Post likes + attachments |
| `0024` | Community replies + reports |
| `0025` | Career stats sync |
| `0026`–`0029` | Usage, event profiles, tier library, daily history |
| `0030`–`0033` | Private rematches, tier comments, room invites, reports |
| `0034` | Account sessions (HttpOnly cookie auth) |

## Flow

1. Player starts Casual or Pro H2H.
2. Client joins `/api/queue` and polls for **7–10 seconds** for another active player in the same mode.
3. If a live opponent is found: both players draft simultaneously; the waiting screen appears only until the other player finishes.
4. If no live opponent is found: client instantly checks `/api/opponent` for a stored human lineup.
5. If a stored lineup exists: draft against that ghost using the stored team name, with no waiting screen.
6. If none exists and the player is **below 1500 Banners**: fall back to an NPC opponent and full results.
7. If none exists and the player is **1500+ Banners**: draft once, queue the lineup, and block new drafts until that lineup is matched.
8. When a challenger faces a saved ghost lineup, `/api/match-results` consumes that lineup (server-rescored OVRs), writes `owner_match_results`, and the original owner sees the result on next landing via `/api/pending` (GET + ack).

All-Time mode still uses the local opponent simulator. Daily Draft submissions sync to D1 for shared percentiles (server recomputes the goal value from the lineup). Casual and Pro leaderboards sync to D1 after each match.

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
   Applies every file in `migrations/` through **`0034_account_sessions.sql`** (see the migration table under **Optional accounts** above).
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
