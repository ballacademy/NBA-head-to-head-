import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ACCOUNT_REQUIRED_PRIVATE_MATCH_MESSAGE,
  isPlayerAccountLinked,
} from "../lib/accountGate";
import { getOrCreatePlayerId } from "../lib/playerIdentity";
import {
  CLASSIC_HEAD_TO_HEAD_LABEL,
  PRO_HEAD_TO_HEAD_LABEL,
} from "../lib/modeLabels";
import type { StartDraftOptions, StartMatchResult } from "../lib/match";
import { AccountRequiredNote } from "./AccountRequiredNote";

interface PrivateMatchModalProps {
  salaryCapMode: boolean;
  onClose: () => void;
  onStart: (options: StartDraftOptions) => Promise<StartMatchResult | void>;
}

export function PrivateMatchModal({
  salaryCapMode,
  onClose,
  onStart,
}: PrivateMatchModalProps) {
  const modeLabel = salaryCapMode
    ? PRO_HEAD_TO_HEAD_LABEL
    : CLASSIC_HEAD_TO_HEAD_LABEL;
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [accountLinked, setAccountLinked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isPlayerAccountLinked(getOrCreatePlayerId()).then((linked) => {
      if (!cancelled) {
        setAccountLinked(linked);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const startHost = async () => {
    setError(null);
    if (accountLinked === false) {
      setError(ACCOUNT_REQUIRED_PRIVATE_MATCH_MESSAGE);
      return;
    }

    setBusy(true);
    try {
      const result = await onStart({
        privateMatch: true,
        salaryCapMode,
        privateRoom: { role: "host" },
      });
      if (result === "started" || result === "cancelled") {
        onClose();
      } else {
        setError("Could not create private room. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const startGuest = async () => {
    setError(null);
    if (accountLinked === false) {
      setError(ACCOUNT_REQUIRED_PRIVATE_MATCH_MESSAGE);
      return;
    }

    const roomCode = joinCode.trim().toUpperCase();
    if (roomCode.length < 6) {
      setError("Enter the 6-character room code from your friend.");
      return;
    }

    setBusy(true);
    try {
      const result = await onStart({
        privateMatch: true,
        salaryCapMode,
        privateRoom: { role: "guest", roomCode },
      });
      if (result === "started" || result === "cancelled") {
        onClose();
      } else {
        setError("Could not join that room. Check the code and try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const modal = (
    <div
      className="unlock-modal unlock-modal--compact private-match-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="private-match-title"
      onClick={onClose}
    >
      <div
        className="unlock-modal__panel panel unlock-modal__panel--compact private-match-modal__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">{modeLabel}</p>
        <h2 id="private-match-title">Private match</h2>
        <p className="unlock-modal__copy">
          Play a friend head-to-head with a room code. Same draft rules as{" "}
          {modeLabel}. Requires an account. Does not affect records or Banners.
        </p>

        {accountLinked === false ? (
          <AccountRequiredNote>
            {ACCOUNT_REQUIRED_PRIVATE_MATCH_MESSAGE}
          </AccountRequiredNote>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}

        <button
          type="button"
          className="landing__primary-button"
          disabled={busy || accountLinked === false}
          onClick={() => void startHost()}
        >
          {busy ? "Starting…" : "Create room"}
        </button>

        <div className="private-match-modal__join">
          <label
            className="private-match-modal__label"
            htmlFor="private-room-code"
          >
            Join with code
          </label>
          <div className="private-match-modal__join-row">
            <input
              id="private-room-code"
              className="private-match-modal__input"
              value={joinCode}
              onChange={(event) =>
                setJoinCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 6),
                )
              }
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
              disabled={busy || accountLinked === false}
            />
            <button
              type="button"
              className="secondary-button"
              disabled={busy || accountLinked === false}
              onClick={() => void startGuest()}
            >
              Join
            </button>
          </div>
        </div>

        <button
          type="button"
          className="secondary-button private-match-modal__close"
          onClick={onClose}
          disabled={busy}
        >
          Close
        </button>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
