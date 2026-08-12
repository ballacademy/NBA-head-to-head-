import { useEffect, useId, useState } from "react";
import type { GhostMatchmakingMode } from "../lib/ghostMatchmaking";
import { copyToClipboard } from "../lib/copyToClipboard";
import {
  CLASSIC_HEAD_TO_HEAD_LABEL,
  PRO_HEAD_TO_HEAD_LABEL,
} from "../lib/modeLabels";

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
}: MatchmakingOverlayProps) {
  const titleId = useId();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const isPrivate = Boolean(privateRoomCode);
  const isPrivateGuest = isPrivate && privateRoomRole === "guest";
  const modeLabel =
    mode === "event"
      ? "Weekly Event"
      : mode === "ranked"
        ? PRO_HEAD_TO_HEAD_LABEL
        : CLASSIC_HEAD_TO_HEAD_LABEL;
  const isMatched = Boolean(matchedOpponentName);
  const statusLabel = isMatched
    ? `Matched vs ${matchedOpponentName}`
    : isCancelling
      ? "Finalizing…"
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

  useEffect(() => {
    if (!onCancel || isMatched || isCancelling) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCancelling, isMatched, onCancel]);

  const handleCopyCode = async () => {
    if (!privateRoomCode) {
      return;
    }
    const ok = await copyToClipboard(privateRoomCode);
    setCopyState(ok ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 2000);
  };

  return (
    <div
      className="matchmaking-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-live="polite"
    >
      <section className="panel panel--compact matchmaking-overlay__panel">
        <p className="eyebrow">
          {isPrivate ? `${modeLabel} private match` : `${modeLabel} matchmaking`}
        </p>
        <h2 id={titleId}>
          {isMatched
            ? "Opponent found"
            : isCancelling
              ? "Cancelling search"
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
                    : "Copy code"}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="waiting-indicator matchmaking-overlay__indicator">
          <span className="waiting-spinner" aria-hidden="true" />
          <strong>{statusLabel}</strong>
        </div>

        {isPrivate && !isMatched ? (
          <p className="matchmaking-overlay__note">
            {isPrivateGuest
              ? "Stay on this screen while we connect you. Same mode as your friend (Casual or Pro)."
              : "Friend needs an account. They join with this code under the same mode (Casual or Pro). Records and Banners do not change."}
          </p>
        ) : null}

        {mode === "event" && !isMatched && !isPrivate ? (
          <p className="matchmaking-overlay__note">
            Event matches are live-only. Keep this open — search continues until
            someone joins.
          </p>
        ) : null}

        {onCancel && !isMatched ? (
          <button
            type="button"
            className="secondary-button matchmaking-overlay__cancel"
            onClick={onCancel}
            disabled={isCancelling}
          >
            {isCancelling
              ? "Cancelling…"
              : isPrivateGuest
                ? "Cancel join"
                : isPrivate
                  ? "Cancel room"
                  : "Cancel search"}
          </button>
        ) : null}
      </section>
    </div>
  );
}
