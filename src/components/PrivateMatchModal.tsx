import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ACCOUNT_REQUIRED_PRIVATE_MATCH_MESSAGE,
  isPlayerAccountLinked,
  peekCachedAccountLinked,
  subscribeAccountLinkChanged,
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
  startMatchError?: string | null;
  /** When the host room is ready, parent shows MatchmakingOverlay with this code. */
  privateRoomCode?: string | null;
  onClose: () => void;
  onStart: (options: StartDraftOptions) => Promise<StartMatchResult | void>;
}

type BusyAction = "host" | "guest" | null;

export function PrivateMatchModal({
  salaryCapMode,
  startMatchError = null,
  privateRoomCode = null,
  onClose,
  onStart,
}: PrivateMatchModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const modeLabel = salaryCapMode
    ? PRO_HEAD_TO_HEAD_LABEL
    : CLASSIC_HEAD_TO_HEAD_LABEL;
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [accountLinked, setAccountLinked] = useState<boolean | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const mountedRef = useRef(true);
  const accountReady = accountLinked === true;
  const accountBlocked = accountLinked === false;
  const busy = busyAction != null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      const playerId = getOrCreatePlayerId();
      const cached = peekCachedAccountLinked(playerId);
      if (cached != null) {
        setAccountLinked(cached);
      }

      void isPlayerAccountLinked(playerId).then((linked) => {
        if (!cancelled) {
          setAccountLinked(linked);
        }
      });
    };

    refresh();
    const unsubscribe = subscribeAccountLinkChanged(refresh);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (startMatchError) {
      setError(null);
    }
  }, [startMatchError]);

  // Host path: App sets the room code once create succeeds, then waits for a
  // guest under MatchmakingOverlay. Dismiss this modal so the code is visible.
  useEffect(() => {
    if (privateRoomCode) {
      onClose();
    }
  }, [privateRoomCode, onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  const startHost = async () => {
    setError(null);
    if (accountBlocked) {
      setError(ACCOUNT_REQUIRED_PRIVATE_MATCH_MESSAGE);
      return;
    }
    if (!accountReady || busy) {
      return;
    }

    setBusyAction("host");
    try {
      const result = await onStart({
        privateMatch: true,
        salaryCapMode,
        privateRoom: { role: "host" },
      });
      if (!mountedRef.current) {
        return;
      }
      if (result === "started" || result === "cancelled") {
        onClose();
      } else if (result === "failed") {
        // Prefer App's startMatchError (shown via prop); keep a local fallback.
        setError("Could not create private room. Try again.");
      }
    } finally {
      if (mountedRef.current) {
        setBusyAction(null);
      }
    }
  };

  const startGuest = async () => {
    setError(null);
    if (accountBlocked) {
      setError(ACCOUNT_REQUIRED_PRIVATE_MATCH_MESSAGE);
      return;
    }
    if (!accountReady || busy) {
      return;
    }

    const roomCode = joinCode.trim().toUpperCase();
    if (roomCode.length < 6) {
      setError("Enter the 6-character room code from your friend.");
      return;
    }

    setBusyAction("guest");
    try {
      const result = await onStart({
        privateMatch: true,
        salaryCapMode,
        privateRoom: { role: "guest", roomCode },
      });
      if (!mountedRef.current) {
        return;
      }
      if (result === "started" || result === "cancelled") {
        onClose();
      } else if (result === "failed") {
        setError("Could not join that room. Check the code and try again.");
      }
    } finally {
      if (mountedRef.current) {
        setBusyAction(null);
      }
    }
  };

  const handleBackdropClose = () => {
    if (busy) {
      return;
    }
    onClose();
  };

  const modal = (
    <div
      className="unlock-modal unlock-modal--compact private-match-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleBackdropClose}
    >
      <div
        className="unlock-modal__panel panel unlock-modal__panel--compact private-match-modal__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">{modeLabel}</p>
        <h2 id={titleId}>Private match</h2>
        <p className="unlock-modal__copy">
          Play a friend head-to-head with a room code. Same draft rules as{" "}
          {modeLabel}. Requires an account. Does not affect records or Banners.
        </p>

        {accountBlocked ? (
          <AccountRequiredNote>
            {ACCOUNT_REQUIRED_PRIVATE_MATCH_MESSAGE}
          </AccountRequiredNote>
        ) : null}

        {error || startMatchError ? (
          <p className="form-error" role="alert">
            {startMatchError || error}
          </p>
        ) : null}

        <button
          type="button"
          className="landing__primary-button"
          disabled={busy || !accountReady}
          onClick={() => void startHost()}
        >
          {busyAction === "host"
            ? "Creating room…"
            : accountLinked === null
              ? "Checking account…"
              : "Create room"}
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
              disabled={busy || !accountReady}
            />
            <button
              type="button"
              className="secondary-button"
              disabled={busy || !accountReady}
              onClick={() => void startGuest()}
            >
              {busyAction === "guest" ? "Joining…" : "Join"}
            </button>
          </div>
        </div>

        <button
          ref={closeRef}
          type="button"
          className="secondary-button private-match-modal__close"
          onClick={handleBackdropClose}
          disabled={busy}
        >
          Close
        </button>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
