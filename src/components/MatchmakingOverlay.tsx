import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { GhostMatchmakingMode } from "../lib/ghostMatchmaking";
import { copyToClipboard } from "../lib/copyToClipboard";
import { buildPrivateMatchShareUrl } from "../lib/landingHub";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { getHighBannerSearchWaitMessage } from "../lib/highBannerQueueWait";
import { MODE_COPY } from "../lib/modeCopy";

interface MatchmakingOverlayProps {
  mode: GhostMatchmakingMode;
  elapsedSeconds: number;
  matchedOpponentName?: string | null;
  onCancel?: () => void;
  isCancelling?: boolean;
  /** When set, this is a private friend room (host waiting or guest joining). */
  privateRoomCode?: string | null;
  privateRoomRole?: "host" | "guest" | null;
  /** ISO timestamp when the private room expires (host). */
  privateRoomExpiresAt?: string | null;
  /** Waiting for the same private opponent to also press Rematch. */
  privateRematchWaiting?: boolean;
  /** 1500+ Banners live-only search (no NPC fallback). */
  liveOnlySearch?: boolean;
}

const formatPrivateRoomExpiry = (expiresAt: string, nowMs: number) => {
  const expiresMs = Date.parse(expiresAt);

  if (!Number.isFinite(expiresMs)) {
    return null;
  }

  const remainingMs = expiresMs - nowMs;

  if (remainingMs <= 0) {
    return "Room expired";
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `Expires in ${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export function MatchmakingOverlay({
  mode,
  elapsedSeconds,
  matchedOpponentName = null,
  onCancel,
  isCancelling = false,
  privateRoomCode = null,
  privateRoomRole = null,
  privateRoomExpiresAt = null,
  privateRematchWaiting = false,
  liveOnlySearch = false,
}: MatchmakingOverlayProps) {
  const titleId = useId();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const isPrivateRematch = privateRematchWaiting && !privateRoomCode;
  const isPrivate = Boolean(privateRoomCode) || isPrivateRematch;
  const isPrivateGuest = Boolean(privateRoomCode) && privateRoomRole === "guest";
  const modeCopy =
    mode === "event"
      ? MODE_COPY.weeklyEvent
      : mode === "ranked"
        ? MODE_COPY.proH2h
        : MODE_COPY.classicH2h;
  const modeLabel = modeCopy.title;
  const isMatched = Boolean(matchedOpponentName);
  const canCancelWithEscape = Boolean(onCancel && !isMatched && !isCancelling);
  const handleDialogClose = useCallback(() => {
    if (canCancelWithEscape) {
      onCancel?.();
    }
  }, [canCancelWithEscape, onCancel]);
  const statusLabel = isMatched
    ? `Matched vs ${matchedOpponentName}`
    : isCancelling
      ? "Finalizing…"
      : isPrivateRematch
        ? "Waiting for your opponent to rematch…"
        : isPrivateGuest
          ? "Connecting to your friend’s room…"
          : isPrivate
            ? "Waiting for your friend to join…"
            : elapsedSeconds > 0
              ? `Finding live opponent… ${elapsedSeconds}s`
              : mode === "event"
                ? "Finding live opponent…"
                : "Finding opponent…";
  const expiryLabel =
    isPrivate && privateRoomExpiresAt && !isMatched
      ? formatPrivateRoomExpiry(privateRoomExpiresAt, nowMs)
      : null;

  useEffect(() => {
    if (!privateRoomExpiresAt || isMatched) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isMatched, privateRoomExpiresAt]);

  useDialogA11y({
    onClose: handleDialogClose,
    closeOnEscape: canCancelWithEscape,
    disableClose: !canCancelWithEscape,
    initialFocusRef: onCancel && !isMatched ? cancelButtonRef : undefined,
    containerRef: panelRef as RefObject<HTMLElement | null>,
    lockScroll: true,
  });

  const handleCopyCode = async () => {
    if (!privateRoomCode) {
      return;
    }
    const invite =
      mode === "event"
        ? privateRoomCode
        : buildPrivateMatchShareUrl(
            mode === "ranked" ? "ranked" : "classic",
            privateRoomCode,
          );
    const ok = await copyToClipboard(invite);
    setCopyState(ok ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 2000);
  };

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="matchmaking-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-live="polite"
    >
      <section
        ref={panelRef}
        className="panel panel--compact matchmaking-overlay__panel"
      >
        <p className="eyebrow">
          {isPrivate ? `${modeLabel} private match` : `${modeLabel} matchmaking`}
        </p>
        <h2 id={titleId}>
          {isMatched
            ? "Opponent found"
            : isCancelling
              ? "Cancelling search"
              : isPrivateRematch
                ? "Rematch"
                : isPrivateGuest
                  ? "Joining private room"
                  : isPrivate
                    ? "Share your room code"
                    : mode === "event"
                      ? "Waiting for a live opponent"
                      : "Searching for an opponent"}
        </h2>

        {isPrivate && privateRoomCode && !isMatched ? (
          <div className="matchmaking-overlay__room-block">
            <p className="matchmaking-overlay__room-code" aria-label="Room code">
              {privateRoomCode}
            </p>
            {expiryLabel ? (
              <p className="matchmaking-overlay__expiry">{expiryLabel}</p>
            ) : null}
            {!isPrivateGuest ? (
              <button
                type="button"
                className="secondary-button matchmaking-overlay__copy"
                onClick={() => void handleCopyCode()}
              >
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "failed"
                    ? "Copy failed"
                    : "Copy invite"}
              </button>
            ) : null}
          </div>
        ) : null}

        {isPrivateRematch && expiryLabel && !isMatched ? (
          <p className="matchmaking-overlay__expiry">{expiryLabel}</p>
        ) : null}

        <div className="waiting-indicator matchmaking-overlay__indicator">
          <span className="waiting-spinner" aria-hidden="true" />
          <strong>{statusLabel}</strong>
        </div>

        {isPrivate && !isMatched ? (
          <p className="matchmaking-overlay__note">
            {isPrivateRematch
              ? "Both of you need to press Rematch. Records and Banners still do not change."
              : isPrivateGuest
                ? `Stay on this screen while we connect you. Same mode as your friend (${MODE_COPY.classicH2h.short} or ${MODE_COPY.proH2h.short}).`
                : `Share the invite link or this code. Friend needs an account and the same mode (${MODE_COPY.classicH2h.short} or ${MODE_COPY.proH2h.short}). Records and Banners do not change.`}
          </p>
        ) : null}

        {mode === "event" && !isMatched && !isPrivate ? (
          <p className="matchmaking-overlay__note">
            Event matches are live-only. Keep this open — search continues until
            someone joins.
          </p>
        ) : null}

        {liveOnlySearch && !isMatched && !isPrivate && mode !== "event" ? (
          <p className="matchmaking-overlay__note matchmaking-overlay__note--wait">
            {getHighBannerSearchWaitMessage(elapsedSeconds)}
          </p>
        ) : null}

        {onCancel && !isMatched ? (
          <button
            type="button"
            ref={cancelButtonRef}
            className="secondary-button matchmaking-overlay__cancel"
            onClick={onCancel}
            disabled={isCancelling}
          >
            {isCancelling
              ? "Cancelling…"
              : isPrivateRematch
                ? "Cancel rematch"
                : isPrivateGuest
                  ? "Cancel join"
                  : isPrivate
                    ? "Cancel room"
                    : "Cancel search"}
          </button>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
