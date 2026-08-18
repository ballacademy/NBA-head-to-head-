import { useEffect, useId, useRef, useState } from "react";
import {
  fetchAccountStatus,
  loginAccount,
  registerAccount,
  requestPasswordReset,
  resetAccountPassword,
} from "../lib/accountApi";
import { markPlayerAccountLinked } from "../lib/accountGate";
import { trackProductEvent } from "../lib/productAnalytics";
import {
  pullAndMergeCollection,
  pushCollectionIfLinked,
} from "../lib/collectionRemote";
import {
  pullAndMergeAchievements,
  pushAchievementsIfLinked,
} from "../lib/achievementsRemote";
import {
  pullAndMergeCareerStats,
  pushCareerStatsIfLinked,
} from "../lib/careerStatsRemote";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "../lib/accountCredentials";
import {
  FOUNDING_GM_ACHIEVEMENT_ID,
  syncFoundingGmAchievement,
} from "../lib/foundingGm";
import type { PlayerCollection } from "../lib/playerCollection";
import { restorePlayerIdentityFromLogin, logoutToAnonymousIdentity } from "../lib/restorePlayerIdentity";
import {
  SUPPORT_EMAIL,
  buildPasswordResetMailto,
  buildSupportMailto,
} from "../lib/support";

type AccountPanelMode = "closed" | "register" | "login" | "reset";
type ResetStep = "request" | "enter-code";
type AccountLinkState = "loading" | "unknown" | "linked" | "unlinked";

interface AccountAuthPanelProps {
  playerId: string;
  onViewPrivacy: () => void;
  onViewTerms: () => void;
  onCollectionChange?: (collection: PlayerCollection) => void;
  onCareerSynced?: () => void;
}

export function AccountAuthPanel({
  playerId,
  onViewPrivacy,
  onViewTerms,
  onCollectionChange,
  onCareerSynced,
}: AccountAuthPanelProps) {
  const consentId = useId();
  const submitLock = useRef(false);
  const [mode, setMode] = useState<AccountPanelMode>("closed");
  const [linkState, setLinkState] = useState<AccountLinkState>("loading");
  const [linkedUsername, setLinkedUsername] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetStep, setResetStep] = useState<ResetStep>("request");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const applyStatusResult = (
    result: Awaited<ReturnType<typeof fetchAccountStatus>>,
  ) => {
    if (!result.ok) {
      setLinkedUsername(null);
      setLinkState("unknown");
      setStatusError(result.error);
      return;
    }

    setStatusError(null);

    if (result.status.linked && result.status.username) {
      setLinkedUsername(result.status.username);
      setLinkState("linked");
      markPlayerAccountLinked(playerId, result.status.username);
      syncFoundingGmAchievement(Boolean(result.status.foundingGm));
      return;
    }

    setLinkedUsername(null);
    setLinkState("unlinked");
    markPlayerAccountLinked(playerId, null);
  };

  const refreshStatus = async () => {
    setLinkState("loading");
    setStatusError(null);
    applyStatusResult(await fetchAccountStatus(playerId));
  };

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      const result = await fetchAccountStatus(playerId);
      if (cancelled) {
        return;
      }

      applyStatusResult(result);
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setResetCode("");
    setResetStep("request");
    setAcceptedTerms(false);
    setError(null);
    setMessage(null);
  };

  const openMode = (next: AccountPanelMode) => {
    resetForm();
    setMode(next);
  };

  const handleRegister = async () => {
    if (submitLock.current) {
      return;
    }

    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    submitLock.current = true;
    setBusy(true);
    const result = await registerAccount({
      username,
      email,
      password,
      playerId,
      acceptedTerms,
    });
    setBusy(false);
    submitLock.current = false;

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setLinkedUsername(result.username);
    setLinkState("linked");
    markPlayerAccountLinked(playerId, result.username);
    setMode("closed");
    trackProductEvent("account_create", {
      foundingGm: Boolean(result.foundingGm),
    });
    void pushCollectionIfLinked(undefined, playerId, { force: true });
    void pushAchievementsIfLinked(undefined, playerId, { force: true });
    void pushCareerStatsIfLinked(playerId, { force: true });
    const { newlyUnlocked } = syncFoundingGmAchievement(
      Boolean(result.foundingGm),
    );
    setMessage(
      newlyUnlocked.includes(FOUNDING_GM_ACHIEVEMENT_ID)
        ? `Account created for @${result.username}. Founding GM badge unlocked — one of the first 500 accounts.`
        : `Account created for @${result.username}. You can use it to restore this GM code later.`,
    );
  };

  const handleLogin = async () => {
    if (submitLock.current) {
      return;
    }

    setError(null);
    setMessage(null);
    submitLock.current = true;
    setBusy(true);

    const result = await loginAccount({ username, password });

    if (!result.ok) {
      setBusy(false);
      submitLock.current = false;
      setError(result.error);
      return;
    }

    if (result.playerId === playerId) {
      setBusy(false);
      submitLock.current = false;
      setLinkedUsername(result.username);
      setLinkState("linked");
      markPlayerAccountLinked(playerId, result.username);
      setMode("closed");
      const mergedCollection = await pullAndMergeCollection(playerId);
      if (mergedCollection) {
        onCollectionChange?.(mergedCollection);
      }
      await pullAndMergeAchievements(playerId);
      await pullAndMergeCareerStats(playerId);
      onCareerSynced?.();
      const { newlyUnlocked } = syncFoundingGmAchievement(
        Boolean(result.foundingGm),
      );
      setMessage(
        newlyUnlocked.includes(FOUNDING_GM_ACHIEVEMENT_ID)
          ? `Signed in as @${result.username}. Founding GM badge unlocked.`
          : `Signed in as @${result.username}. Collection, badges, and career records synced.`,
      );
      return;
    }

    try {
      markPlayerAccountLinked(result.playerId, result.username);
      await restorePlayerIdentityFromLogin(result.playerId);
      syncFoundingGmAchievement(Boolean(result.foundingGm));
      window.location.reload();
    } catch {
      setBusy(false);
      submitLock.current = false;
      setError("Signed in, but could not restore local progress. Try again.");
    }
  };

  const handleLogout = () => {
    if (submitLock.current || busy) {
      return;
    }

    submitLock.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      logoutToAnonymousIdentity();
      window.location.reload();
    } catch {
      submitLock.current = false;
      setBusy(false);
      setError("Could not log out. Refresh the page and try again.");
    }
  };

  const handleRequestResetEmail = async () => {
    if (submitLock.current) {
      return;
    }

    setError(null);
    setMessage(null);
    submitLock.current = true;
    setBusy(true);
    const result = await requestPasswordReset(username);
    setBusy(false);
    submitLock.current = false;

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setResetStep("enter-code");
    setMessage(result.message);
  };

  const handleReset = async () => {
    if (submitLock.current) {
      return;
    }

    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    submitLock.current = true;
    setBusy(true);
    const result = await resetAccountPassword({
      username,
      resetCode,
      password,
    });
    setBusy(false);
    submitLock.current = false;

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMode("login");
    setPassword("");
    setConfirmPassword("");
    setResetCode("");
    setResetStep("request");
    setMessage(
      `Password updated for @${result.username}. Log in with your new password.`,
    );
  };

  return (
    <div className="landing-team-form__account">
      <div className="landing-team-form__account-header">
        <span className="landing-team-form__account-label">Sign in</span>
        {linkState === "loading" ? (
          <span className="landing-team-form__account-status">Checking…</span>
        ) : linkState === "unknown" ? (
          <span className="landing-team-form__account-status">
            {statusError ?? "Could not check account status."}{" "}
            <button
              type="button"
              className="landing-team-form__account-action"
              onClick={() => void refreshStatus()}
            >
              Retry
            </button>
          </span>
        ) : linkedUsername ? (
          <span className="landing-team-form__account-status">
            Linked as <strong>@{linkedUsername}</strong>
          </span>
        ) : (
          <span className="landing-team-form__account-status">
            Needed for leaderboards, private matches &amp; public tier lists
          </span>
        )}
      </div>

      <p className="landing-team-form__account-note">
        You can play without an account. Create one to appear on leaderboards,
        host or join private matches, publish tier lists, and restore this GM
        code on another device. Signing in syncs collection and badge progress.
      </p>

      <p className="landing-team-form__account-note landing-team-form__account-note--support">
        Questions or feedback?{" "}
        <a href={buildSupportMailto({ subject: "Draft Day GM beta feedback" })}>
          Email support
        </a>
        .
      </p>

      {(linkState === "unlinked" || linkState === "unknown") &&
      mode === "closed" ? (
        <div className="landing-team-form__account-actions">
          <button
            type="button"
            className="landing-team-form__account-action"
            onClick={() => openMode("register")}
          >
            Create account
          </button>
          <span className="landing-team-form__account-sep" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            className="landing-team-form__account-action"
            onClick={() => openMode("login")}
          >
            Log in
          </button>
          <span className="landing-team-form__account-sep" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            className="landing-team-form__account-action"
            onClick={() => openMode("reset")}
          >
            Forgot password
          </button>
        </div>
      ) : null}

      {linkState === "linked" && mode === "closed" ? (
        <div className="landing-team-form__account-actions">
          <button
            type="button"
            className="landing-team-form__account-action"
            onClick={() => openMode("login")}
            disabled={busy}
          >
            Switch account
          </button>
          <span className="landing-team-form__account-sep" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            className="landing-team-form__account-action"
            onClick={handleLogout}
            disabled={busy}
          >
            Log out
          </button>
          <span className="landing-team-form__account-sep" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            className="landing-team-form__account-action"
            onClick={() => openMode("reset")}
            disabled={busy}
          >
            Forgot password
          </button>
        </div>
      ) : null}

      {linkState === "linked" && mode === "closed" ? (
        <p className="landing-team-form__account-note">
          Log out starts a fresh anonymous GM on this device. Your account stays
          active — use Log in anytime to restore it.
        </p>
      ) : null}

      {mode !== "closed" ? (
        <form
          className="landing-team-form__account-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (mode === "register") {
              void handleRegister();
            } else if (mode === "reset") {
              if (resetStep === "request") {
                void handleRequestResetEmail();
              } else {
                void handleReset();
              }
            } else {
              void handleLogin();
            }
          }}
        >
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              spellCheck={false}
              required
              minLength={USERNAME_MIN_LENGTH}
              maxLength={USERNAME_MAX_LENGTH}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={`${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters`}
              disabled={busy}
            />
          </label>

          {mode === "register" ? (
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                disabled={busy}
              />
            </label>
          ) : null}

          {mode === "reset" && resetStep === "enter-code" ? (
            <label className="field">
              <span>Reset code</span>
              <input
                type="text"
                autoComplete="one-time-code"
                spellCheck={false}
                required
                minLength={8}
                maxLength={12}
                value={resetCode}
                onChange={(event) => setResetCode(event.target.value)}
                placeholder="8-character code from email or support"
                disabled={busy}
              />
            </label>
          ) : null}

          {mode !== "reset" || resetStep === "enter-code" ? (
            <label className="field">
              <span>{mode === "reset" ? "New password" : "Password"}</span>
              <input
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
                minLength={
                  mode === "login" ? undefined : PASSWORD_MIN_LENGTH
                }
                maxLength={PASSWORD_MAX_LENGTH}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  mode === "login"
                    ? undefined
                    : `At least ${PASSWORD_MIN_LENGTH} characters`
                }
                disabled={busy}
              />
            </label>
          ) : null}

          {(mode === "register" ||
            (mode === "reset" && resetStep === "enter-code")) ? (
            <label className="field">
              <span>Confirm {mode === "reset" ? "new password" : "password"}</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={busy}
              />
            </label>
          ) : null}

          {mode === "register" ? (
            <div className="landing-team-form__account-consent">
              <input
                id={consentId}
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                disabled={busy}
                required
              />
              <label htmlFor={consentId}>
                I agree to the{" "}
                <button
                  type="button"
                  className="landing-team-form__account-legal-link"
                  onClick={(event) => {
                    event.preventDefault();
                    onViewPrivacy();
                  }}
                >
                  Privacy Policy
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  className="landing-team-form__account-legal-link"
                  onClick={(event) => {
                    event.preventDefault();
                    onViewTerms();
                  }}
                >
                  Terms of Use
                </button>
                . I understand my password is stored only as a secure hash
                linked to this GM identity, and that my email may be used for
                account recovery (including password reset codes).
              </label>
            </div>
          ) : null}

          {mode === "login" ? (
            <>
              <p className="landing-team-form__account-warning">
                Logging in replaces this browser&apos;s GM identity. Device-only
                progress resets. Your collection and badges sync from the
                account when signed in. Leaderboard / online records are restored
                from the server when available.
              </p>
              <p className="landing-team-form__account-note">
                <button
                  type="button"
                  className="landing-team-form__account-action"
                  onClick={() => openMode("reset")}
                >
                  Forgot password?
                </button>
              </p>
            </>
          ) : null}

          {mode === "reset" && resetStep === "request" ? (
            <>
              <p className="landing-team-form__account-note">
                We&apos;ll email a one-time code if this username has an email
                on file. Codes expire in 1 hour.
              </p>
              <p className="landing-team-form__account-note">
                Already have a code from support?{" "}
                <button
                  type="button"
                  className="landing-team-form__account-action"
                  onClick={() => {
                    setError(null);
                    setMessage(null);
                    setResetStep("enter-code");
                  }}
                  disabled={busy}
                >
                  Enter it here
                </button>
                .
              </p>
            </>
          ) : null}

          {mode === "reset" && resetStep === "enter-code" ? (
            <p className="landing-team-form__account-note">
              Enter the 8-character code from your email (or from support). Need
              a code emailed?{" "}
              <button
                type="button"
                className="landing-team-form__account-action"
                onClick={() => {
                  setError(null);
                  setMessage(null);
                  setResetCode("");
                  setPassword("");
                  setConfirmPassword("");
                  setResetStep("request");
                }}
                disabled={busy}
              >
                Email me a reset code
              </button>
              . Still stuck? Email{" "}
              <a href={buildPasswordResetMailto(username)}>
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          ) : null}

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="landing-team-form__account-form-actions">
            <button
              type="submit"
              className="landing__primary-button"
              disabled={busy}
              aria-busy={busy}
            >
              {busy
                ? "Please wait…"
                : mode === "register"
                  ? "Create account"
                  : mode === "reset"
                    ? resetStep === "request"
                      ? "Email me a reset code"
                      : "Set new password"
                    : "Log in"}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => openMode("closed")}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {message ? (
        <p className="landing-team-form__account-success" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
