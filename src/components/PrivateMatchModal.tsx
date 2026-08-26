import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ACCOUNT_REQUIRED_PRIVATE_MATCH_MESSAGE,
  isPlayerAccountLinked,
  peekCachedAccountLinked,
  resolveAccountRequiredMessage,
  subscribeAccountLinkChanged,
} from "../lib/accountGate";
import { getOrCreatePlayerId } from "../lib/playerIdentity";
import {
  CLASSIC_HEAD_TO_HEAD_LABEL,
  PRO_HEAD_TO_HEAD_LABEL,
} from "../lib/modeLabels";
import type { StartDraftOptions, StartMatchResult } from "../lib/match";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { AccountRequiredNote } from "./AccountRequiredNote";
import type { RefObject } from "react";

interface PrivateMatchModalProps {
  salaryCapMode: boolean;
  startMatchError?: string | null;
  /** When the host room is ready, parent shows MatchmakingOverlay with this code. */
  privateRoomCode?: string | null;
  /** Host-only: dismiss this modal once the waiting room code is ready. */
  privateRoomRole?: "host" | "guest" | null;
  initialJoinCode?: string | null;
  /** Challenge: host room that only this GM can join. */
  invitedPlayerId?: string | null;
  /** Close / cancel control label (e.g. Back to results from matchup). */
  closeLabel?: string;
  onClose: () => void;
  /** Abort an in-flight create/join so Close never freezes the hub. */
  onCancelInFlight?: () => void;
  onStart: (options: StartDraftOptions) => Promise<StartMatchResult | void>;
}

type BusyAction = "host" | "guest" | null;

export function PrivateMatchModal({
  salaryCapMode,
  startMatchError = null,
  privateRoomCode = null,
  privateRoomRole = null,
  initialJoinCode = null,
  invitedPlayerId = null,
  closeLabel = "Close",
  onClose,
  onCancelInFlight,
  onStart,
}: PrivateMatchModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const modeLabel = salaryCapMode
    ? PRO_HEAD_TO_HEAD_LABEL
    : CLASSIC_HEAD_TO_HEAD_LABEL;
  const [joinCode, setJoinCode] = useState(
    () => (initialJoinCode ?? "").trim().toUpperCase(),
  );
  const [error, setError] = useState<string | null>(null);
  const [accountLinked, setAccountLinked] = useState<boolean | null>(() =>
    peekCachedAccountLinked(getOrCreatePlayerId()),
  );
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

  useEffect(() => {
    if (!initialJoinCode) {
      return;
    }
    setJoinCode(initialJoinCode.trim().toUpperCase());
  }, [initialJoinCode]);

  // Host path: App sets the room code once create succeeds, then waits for a
  // guest under MatchmakingOverlay. Dismiss this modal so the code is visible.
  // Guest joins stay on this modal so invalid codes can show an in-dialog error.
  useEffect(() => {
    if (privateRoomCode && privateRoomRole === "host") {
      onClose();
    }
  }, [privateRoomCode, privateRoomRole, onClose]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const requestClose = useCallback(() => {
    if (busyAction != null) {
      // Abort/cancel the in-flight create or join, but keep this modal open
      // until onStart settles — otherwise the hub stays blocked with no Cancel UI.
      onCancelInFlight?.();
      return;
    }
    onClose();
  }, [busyAction, onCancelInFlight, onClose]);

  useDialogA11y({
    onClose: requestClose,
    disableClose: false,
    initialFocusRef: closeRef,
    containerRef: panelRef as RefObject<HTMLElement | null>,
    lockScroll: true,
  });

  const startHost = async () => {
    setError(null);
    if (accountBlocked) {
      setError(
        resolveAccountRequiredMessage(
          getOrCreatePlayerId(),
          ACCOUNT_REQUIRED_PRIVATE_MATCH_MESSAGE,
        ),
      );
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
        privateRoom: {
          role: "host",
          ...(invitedPlayerId ? { invitedPlayerId } : {}),
        },
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
      setError(
        resolveAccountRequiredMessage(
          getOrCreatePlayerId(),
          ACCOUNT_REQUIRED_PRIVATE_MATCH_MESSAGE,
        ),
      );
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
        // Prefer App's startMatchError when it arrives; keep a modal fallback.
        setError(
          "Couldn't join that room. Check the code and try again.",
        );
      }
    } finally {
      if (mountedRef.current) {
        setBusyAction(null);
      }
    }
  };

  const handleBackdropClose = () => {
    requestClose();
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
        ref={panelRef}
        className="unlock-modal__panel panel unlock-modal__panel--compact private-match-modal__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">{modeLabel}</p>
        <h2 id={titleId}>
          {invitedPlayerId ? "Challenge" : "Private match"}
        </h2>
        <p className="unlock-modal__copy">
          {invitedPlayerId
            ? "Creating a private room for that GM. Share the code or link so they can join. Same draft rules as "
            : "Play a friend head-to-head with a room code. Same draft rules as "}
          {modeLabel}
          {invitedPlayerId
            ? ". Requires an account. Does not change records, Banners, badges, or board placement. Room codes expire after "
            : ". Requires an account. Does not change records, Banners, badges, or board placement. Room codes expire after "}
          <strong>10 minutes</strong> — join before then.
        </p>

        {accountBlocked ? (
          <AccountRequiredNote>
            {resolveAccountRequiredMessage(
              getOrCreatePlayerId(),
              ACCOUNT_REQUIRED_PRIVATE_MATCH_MESSAGE,
            )}
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
              : invitedPlayerId
                ? "Create challenge room"
                : "Create room"}
        </button>

        {!invitedPlayerId ? (
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
        ) : null}

        <button
          ref={closeRef}
          type="button"
          className="secondary-button private-match-modal__close"
          onClick={handleBackdropClose}
        >
          {busy ? "Cancel" : closeLabel}
        </button>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
