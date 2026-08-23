# Beta launch checklist

Use this when shipping Draft Day GM to a small public beta.

## Already handled in code (this PR / recent merges)

- [x] Scoring fairness pass merged (`#214`)
- [x] Support email + feedback/bug mailto links in Account + Beta notes
- [x] Explicit copy: password reset (self-serve email code + support fallback), local collection, All-Time **coming soon** on production (`ALL_TIME_MODE_PLAYABLE = false`; playable on QA)
- [x] In-product **Beta notes** page (Account tab)
- [x] Runtime error toast + React error boundary with email report path
- [x] All-Time legends testing unlock set to **off** for release
- [x] Salary JSON rebuilt (as-of label in Beta notes); roster/stats as-of dates shown

## You must confirm in Cloudflare / production

1. **D1 migrations** — production DB applied through `0034` (account sessions). Deploy workflow applies these; confirm “No migrations to apply” on the latest prod deploy.
2. **Pages binding** — Pages project has D1 binding name **`DB`** for Production.
3. **Resend (password reset email)** — Production secret `RESEND_API_KEY` set; verified sending domain + `RESET_EMAIL_FROM` for real player inboxes (see `PASSWORD-RESET.md`). Without this, Forgot password returns a clear “email isn’t available” error.
4. **Deploy** — latest `main` (or this PR after merge) is live on Pages.
5. **Apex DNS** — `draftdaygm.com` resolves and redirects to `www` (already looked healthy: apex → 301 www).
6. **Mailbox** — you can receive mail at `ballacademyofficial@gmail.com` (spam folder checked).

Quick checks from a terminal:

```bash
curl -I https://www.draftdaygm.com
curl -I https://draftdaygm.com
curl -s https://www.draftdaygm.com/api/account/status
```

## Smoke-test play loops (manual, ~10 minutes)

On a real phone + desktop browser:

1. **Landing** — modes load; logo/nav OK; no blank white flash.
2. **Daily Draft** — start Basic or Advanced, finish once, see results / percentile. Only one scored attempt per mode per day.
3. **Practice (H2H)** — Practice Casual/Pro does not change records, Banners, or badges.
4. **Casual H2H** — queue, draft, results, record updates.
5. **Pro H2H** — same with salary cap.
6. **Weekly Event** — entry available; live queue only; result counts toward event.
7. **Account** — create account on device A; log in on device B; GM code restores; **collection, badges, career W–L, Most Drafted, event badges, tier lists, and Daily streaks** match across devices when signed in. Log out → log in again restores the same cloud progress.
8. **Password reset** — while signed out, Forgot password emails a code (Resend configured). While signed in, Forgot password is not shown.
9. **Collection / Badges / Leaderboards / Stats** — open without crash.
10. **Beta notes** — Account → Beta notes; feedback mailto opens.
11. **Support path** — intentionally note any error toast “Email us” link works.

## Strongly worth doing soon (status)

| Item | Status |
| --- | --- |
| Minimal error visibility | Done in this PR |
| One-page beta notes | Done in this PR |
| Fresh roster/salary pass | Salaries rebuilt + as-of labels; full roster refresh still optional when you have newer ESPN/manual sheets |

## Optional next data pass

When you have fresher sources:

```bash
npm run data:salaries:build
# then commit data/nba-salaries-202627.json and bump SALARIES_DATA_AS_OF_LABEL in src/lib/support.ts
```

Roster team overrides / stats CSV refresh use the existing `data:*` scripts in `package.json`.
