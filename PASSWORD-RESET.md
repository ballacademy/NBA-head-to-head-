# Password reset

Accounts use a **username + email + password**. Email is required for new
signups (stored for recovery).

## Self-serve (preferred)

1. Player opens Account while **signed out** → **Forgot password**, enters their
   username (Forgot password is hidden while already signed in — log out first)
2. Taps **Email me a reset code**
3. If that account has an email on file **and** Resend is configured, a one-time
   8-character code is emailed to that address
4. Player enters the code + a new password on the same form

Codes expire in **1 hour** and can only be used once.

The request endpoint returns a generic success message when a username may or
may not exist (so it does not reveal accounts). If email delivery is **not**
configured, or Resend rejects the send, the API returns a clear error instead of
pretending a code was emailed.

## What you must set up for emails to work

Self-serve reset uses [Resend](https://resend.com). You do **not** connect Gmail
directly to the app — Cloudflare Pages calls Resend’s API with a secret key.

### 1. Create a Resend account and API key

1. Sign up at https://resend.com
2. Create an API key (Permissions: sending access)
3. Copy the key (starts with `re_…`)

### 2. Add secrets on Cloudflare Pages (Production + Preview if you use QA)

Cloudflare Dashboard → **Workers & Pages** → your Pages project → **Settings** →
**Environment variables** (Production):

| Name | Type | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | **Secret** | Required. Paste the Resend API key |
| `RESET_EMAIL_FROM` | Variable (optional) | From header. See domain note below |

Redeploy (or wait for the next deploy) after adding secrets so Functions pick them up.

### 3. Sending domain (important)

Resend’s free default sender `onboarding@resend.dev` **only delivers to the email
address on your Resend account**. It will **not** reliably email arbitrary
players.

For real beta testers you need to:

1. In Resend → **Domains**, add a domain you control (e.g. `yourdomain.com`)
2. Add the DNS records Resend shows (SPF / DKIM)
3. Wait until the domain shows **Verified**
4. Set Cloudflare variable:
   - `RESET_EMAIL_FROM` = `Draft Day GM <noreply@yourdomain.com>`
     (must use an address on the verified domain)

Until a domain is verified, you can still test reset by:

- Using an account whose recovery email is **exactly** your Resend login email, or
- Using the support-assisted flow below (`npm run account:issue-reset`)

### 4. Confirm it works

1. Sign out on the site
2. Account → Forgot password → enter a username that has an email on file
3. Tap **Email me a reset code**
4. You should get success copy and an inbox message (check spam)
5. If you see “Password reset email isn't available…”, `RESEND_API_KEY` is
   missing from that Pages environment
6. If you see “Couldn't send the reset email…”, check Resend logs (bad/missing
   domain, blocked recipient, or invalid API key)

## Support-assisted (fallback)

1. Player emails `ballacademyofficial@gmail.com` with their username
2. You issue a one-time 8-character code
3. Player opens Account → **Forgot password** → **Enter it here**, then
   enters username + code + new password

## Database

Production D1 migrations apply automatically on Pages deploy. You want migrations
through **`0034_account_sessions.sql`** (password reset tables are older:
`0013` / `0014`; sessions are `0034`). If deploy says **No migrations to apply**, you’re current.

Manual apply if needed:

```bat
cd "C:\Users\andre\Downloads\NBA-head-to-head-"
git pull
npx wrangler d1 migrations apply draft-day-gm --remote
```

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
password → Enter it here** on the site (while signed out).

## Optional: issue via API secret

In Cloudflare Pages → Settings → Variables and Secrets, add secret `ACCOUNT_RESET_SECRET`. Then:

```bat
set ACCOUNT_RESET_SECRET=your-secret-here
npm run account:issue-reset -- their_username
```

(That hits the live `/api/account/issue-reset` endpoint instead of wrangler SQL.)
