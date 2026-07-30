# Password reset (support-assisted)

Accounts use a **username + email + password**. Email is required for new
signups (stored for recovery). During beta, resets still work like this:

1. Player emails `ballacademyofficial@gmail.com` with their username
2. You issue a one-time 8-character code
3. Player opens Account → **Forgot password**, enters username + code + new password

Codes expire in **1 hour** and can only be used once.

Automated “email me a reset link” can come later now that email is on file.

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

Also merge/deploy the password-reset PR so the live site has the Forgot
password form and email field on signup.

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

Reply to the player with that code. Tell them to use **Account → Forgot password** on the site.

## Optional later: issue via API secret

In Cloudflare Pages → Settings → Variables and Secrets, add secret `ACCOUNT_RESET_SECRET`. Then:

```bat
set ACCOUNT_RESET_SECRET=your-secret-here
npm run account:issue-reset -- their_username
```

(That hits the live `/api/account/issue-reset` endpoint instead of wrangler SQL.)
