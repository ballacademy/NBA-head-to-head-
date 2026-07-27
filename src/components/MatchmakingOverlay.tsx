import type { GhostMatchmakingMode } from "../lib/ghostMatchmaking";
import { CLASSIC_HEAD_TO_HEAD_LABEL, PRO_HEAD_TO_HEAD_LABEL } from "../lib/modeLabels";

interface MatchmakingOverlayProps {
  mode: GhostMatchmakingMode;
  elapsedSeconds: number;
  matchedOpponentName?: string | null;
  onCancel?: () => void;
  isCancelling?: boolean;
}

export function MatchmakingOverlay({
  mode,
  elapsedSeconds,
  matchedOpponentName = null,
  onCancel,
  isCancelling = false,
}: MatchmakingOverlayProps) {
  const modeLabel =
    mode === "event"
      ? "Weekly Event"
      : mode === "ranked"
        ? PRO_HEAD_TO_HEAD_LABEL
        : CLASSIC_HEAD_TO_HEAD_LABEL;
  const isMatched = Boolean(matchedOpponentName);
  const statusLabel = isMatched
    ? `Matched vs ${matchedOpponentName}`
    : elapsedSeconds > 0
      ? `Finding live opponent… ${elapsedSeconds}s`
      : mode === "event"
        ? "Finding live opponent…"
        : "Finding opponent…";

  return (
    <div className="matchmaking-overlay" role="status" aria-live="polite">
      <section className="panel panel--compact matchmaking-overlay__panel">
        <p className="eyebrow">{modeLabel} matchmaking</p>
        <h2>
          {isMatched
            ? "Opponent found"
            : mode === "event"
              ? "Waiting for a live opponent"
              : "Searching for an opponent"}
        </h2>

        <div className="waiting-indicator matchmaking-overlay__indicator">
          <span className="waiting-spinner" aria-hidden="true" />
          <strong>{statusLabel}</strong>
        </div>

        {mode === "event" && !isMatched ? (
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
            {isCancelling ? "Cancelling…" : "Cancel search"}
          </button>
        ) : null}
      </section>
    </div>
  );
}
