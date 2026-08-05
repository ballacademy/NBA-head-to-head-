import { useState } from "react";
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
  /** When set, this is a private friend room wait (show code). */
  privateRoomCode?: string | null;
}

export function MatchmakingOverlay({
  mode,
  elapsedSeconds,
  matchedOpponentName = null,
  onCancel,
  isCancelling = false,
  privateRoomCode = null,
}: MatchmakingOverlayProps) {
  const [copied, setCopied] = useState(false);
  const isPrivate = Boolean(privateRoomCode);
  const modeLabel =
    mode === "event"
      ? "Weekly Event"
      : mode === "ranked"
        ? PRO_HEAD_TO_HEAD_LABEL
        : CLASSIC_HEAD_TO_HEAD_LABEL;
  const isMatched = Boolean(matchedOpponentName);
  const statusLabel = isMatched
    ? `Matched vs ${matchedOpponentName}`
    : isPrivate
      ? "Waiting for your friend to join…"
      : elapsedSeconds > 0
        ? `Finding live opponent… ${elapsedSeconds}s`
        : mode === "event"
          ? "Finding live opponent…"
          : "Finding opponent…";

  const handleCopyCode = async () => {
    if (!privateRoomCode) {
      return;
    }
    const ok = await copyToClipboard(privateRoomCode);
    if (!ok) {
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="matchmaking-overlay" role="status" aria-live="polite">
      <section className="panel panel--compact matchmaking-overlay__panel">
        <p className="eyebrow">
          {isPrivate ? `${modeLabel} private match` : `${modeLabel} matchmaking`}
        </p>
        <h2>
          {isMatched
            ? "Opponent found"
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
            <button
              type="button"
              className="secondary-button matchmaking-overlay__copy"
              onClick={() => void handleCopyCode()}
            >
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
        ) : null}

        <div className="waiting-indicator matchmaking-overlay__indicator">
          <span className="waiting-spinner" aria-hidden="true" />
          <strong>{statusLabel}</strong>
        </div>

        {isPrivate && !isMatched ? (
          <p className="matchmaking-overlay__note">
            Friend needs an account. They join with this code under the same
            mode (Classic or Pro). Records and Banners do not change.
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
              : isPrivate
                ? "Cancel room"
                : "Cancel search"}
          </button>
        ) : null}
      </section>
    </div>
  );
}
