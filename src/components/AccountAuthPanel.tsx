import { useEffect, useId, useRef, useState } from "react";
import {
  fetchAccountStatus,
  loginAccount,
  registerAccount,
} from "../lib/accountApi";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "../lib/accountCredentials";
import { restorePlayerIdentityFromLogin } from "../lib/restorePlayerIdentity";

type AccountPanelMode = "closed" | "register" | "login";
type AccountLinkState = "loading" | "unknown" | "linked" | "unlinked";

interface AccountAuthPanelProps {
  playerId: string;
  onViewPrivacy: () => void;
  onViewTerms: () => void;
}

export function AccountAuthPanel({
  playerId,
  onViewPrivacy,
  onViewTerms,
}: AccountAuthPanelProps) {
  const consentId = useId();
  const submitLock = useRef(false);
  const [mode, setMode] = useState<AccountPanelMode>("closed");
  const [linkState, setLinkState] = useState<AccountLinkState>("loading");
  const [linkedUsername, setLinkedUsername] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      return;
    }

    setLinkedUsername(null);
    setLinkState("unlinked");
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
    setPassword("");
    setConfirmPassword("");
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
    setMode("closed");
    setMessage(
      `Account created for @${result.username}. You can use it to restore this GM code later.`,
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
      setMode("closed");
      setMessage(`Signed in as @${result.username}.`);
      return;
    }

    try {
      await restorePlayerIdentityFromLogin(result.playerId);
      window.location.reload();
    } catch {
      setBusy(false);
      submitLock.current = false;
      setError("Signed in, but could not restore local progress. Try again.");
    }
  };

  return (
    <div className="landing-team-form__account">
      <div className="landing-team-form__account-header">
        <span className="landing-team-form__account-label">Account</span>
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
            Optional — save this GM code
          </span>
        )}
      </div>

      <p className="landing-team-form__account-note">
        Playing does not require an account. Create one only if you want to
        restore this GM code after clearing browser data. Passwords are stored
        as secure hashes, never in plain text. There is no password reset.
        Logging in on another device restores online records (like leaderboard
        rows) but resets on-device collection progress for that browser.
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
        </div>
      ) : null}

      {linkState === "linked" && mode === "closed" ? (
        <div className="landing-team-form__account-actions">
          <button
            type="button"
            className="landing-team-form__account-action"
            onClick={() => openMode("login")}
          >
            Switch account
          </button>
        </div>
      ) : null}

      {mode !== "closed" ? (
        <form
          className="landing-team-form__account-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (mode === "register") {
              void handleRegister();
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

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
              disabled={busy}
            />
          </label>

          {mode === "register" ? (
            <>
              <label className="field">
                <span>Confirm password</span>
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
                  linked to this GM identity.
                </label>
              </div>
            </>
          ) : (
            <p className="landing-team-form__account-warning">
              Logging in replaces this browser&apos;s GM identity. Local
              collection, achievements, and device-only progress reset.
              Leaderboard / online records for the account are restored from the
              server when available.
            </p>
          )}

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
