# Password reset

Accounts use a **username + email + password**. Email is required for new
signups (stored for recovery).

## Self-serve (preferred)

1. Player opens Account → **Forgot password**, enters their username
2. Taps **Email me a reset code**
3. If that account has an email on file, a one-time 8-character code is stored
   and (when email delivery is configured) sent to that address
4. Player enters the code + a new password on the same form

Codes expire in **1 hour** and can only be used once.

The request endpoint always returns a generic success message so it does not
reveal whether a username exists.

### Enable email delivery (Resend)

In Cloudflare Pages → Settings → Variables and Secrets, set:

| Name | Type | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | From [Resend](https://resend.com) |
| `RESET_EMAIL_FROM` | Variable (optional) | Defaults to `Draft Day GM <onboarding@resend.dev>` |

When `RESEND_API_KEY` is set, `POST /api/account/request-reset` emails the
code. Without it, the token is still stored but no email is sent — use the
support-assisted flow below (or issue a code yourself) until Resend is wired
up.

## Support-assisted (fallback)

1. Player emails `ballacademyofficial@gmail.com` with their username
2. You issue a one-time 8-character code
3. Player opens Account → **Forgot password** → **I already have a code**, then
   enters username + code + new password

## One-time database update (you must run this)

From your project folder (Command Prompt or `npx.cmd` in PowerShell):

```bat
cd "C:\Users\andre\Downloads\NBA-head-to-head-"
git pull
npx wrangler d1 migrations apply draft-day-gm --remote
```

You want migrations through `0014_player_account_email` applied (includes
`0013_password_reset_tokens`). If it says **No migrations to apply**, you’re
already current after this ships.

Also merge/deploy so the live site has Forgot password, self-serve request
reset, and email on signup.

## How you issue a code (after migrate + pull)

```bat
cd "C:\Users\andre\Downloads\NBA-head-to-head-"
npm run account:issue-reset -- their_username
```

Example:

```bat
npm run account:issue-reset -- coach_one
```

The script prints something like:

```text
Reset code for @coach_one: A1B2C3D4
Expires at: ...
```

Reply to the player with that code. Tell them to use **Account → Forgot
password → I already have a code** on the site.

## Optional: issue via API secret

In Cloudflare Pages → Settings → Variables and Secrets, add secret `ACCOUNT_RESET_SECRET`. Then:

```bat
set ACCOUNT_RESET_SECRET=your-secret-here
npm run account:issue-reset -- their_username
```

(That hits the live `/api/account/issue-reset` endpoint instead of wrangler SQL.)
