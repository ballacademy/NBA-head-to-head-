import { useEffect, useState } from "react";
import {
  fetchAccountStatus,
  loginAccount,
  registerAccount,
} from "../lib/accountApi";
import {
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "../lib/accountCredentials";
import { setPlayerIdentity } from "../lib/playerIdentity";

type AccountPanelMode = "closed" | "register" | "login";

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
  const [mode, setMode] = useState<AccountPanelMode>("closed");
  const [linkedUsername, setLinkedUsername] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      setStatusLoading(true);
      const status = await fetchAccountStatus(playerId);
      if (cancelled) {
        return;
      }

      setLinkedUsername(
        status?.linked && status.username ? status.username : null,
      );
      setStatusLoading(false);
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
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const result = await registerAccount({
      username,
      password,
      playerId,
      acceptedTerms,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setLinkedUsername(result.username);
    setMode("closed");
    setMessage(
      `Account created for @${result.username}. You can use it to restore this GM code later.`,
    );
  };

  const handleLogin = async () => {
    setError(null);
    setMessage(null);
    setBusy(true);

    const result = await loginAccount({ username, password });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (result.playerId === playerId) {
      setLinkedUsername(result.username);
      setMode("closed");
      setMessage(`Signed in as @${result.username}.`);
      return;
    }

    setPlayerIdentity(result.playerId);
    window.location.reload();
  };

  return (
    <div className="landing-team-form__account">
      <div className="landing-team-form__account-header">
        <span className="landing-team-form__account-label">Account</span>
        {statusLoading ? (
          <span className="landing-team-form__account-status">Checking…</span>
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
        as secure hashes, never in plain text. There is no password reset
        without your username and password.
      </p>

      {!linkedUsername && mode === "closed" ? (
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

      {linkedUsername && mode === "closed" ? (
        <div className="landing-team-form__account-actions">
          <button
            type="button"
            className="landing-team-form__account-action"
            onClick={() => openMode("login")}
          >
            Log in on another device
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
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={busy}
                />
              </label>

              <label className="landing-team-form__account-consent">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  disabled={busy}
                />
                <span>
                  I agree to the{" "}
                  <button
                    type="button"
                    className="landing-team-form__account-legal-link"
                    onClick={onViewPrivacy}
                  >
                    Privacy Policy
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    className="landing-team-form__account-legal-link"
                    onClick={onViewTerms}
                  >
                    Terms of Use
                  </button>
                  . I understand my password is stored only as a secure hash
                  linked to this GM identity.
                </span>
              </label>
            </>
          ) : (
            <p className="landing-team-form__account-warning">
              Logging in replaces this browser&apos;s GM identity with your
              saved account. Local collection progress on this device is not
              cloud-synced.
            </p>
          )}

          {error ? <p className="form-error">{error}</p> : null}

          <div className="landing-team-form__account-form-actions">
            <button type="submit" className="primary-button" disabled={busy}>
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
        <p className="landing-team-form__account-success">{message}</p>
      ) : null}
    </div>
  );
}
