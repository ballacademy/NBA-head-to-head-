import { CLASSIC_HEAD_TO_HEAD_LABEL } from "../lib/modeLabels";

interface MatchmakingOverlayProps {
  mode: "classic" | "ranked";
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
  const modeLabel = mode === "ranked" ? "Pro" : CLASSIC_HEAD_TO_HEAD_LABEL;
  const isMatched = Boolean(matchedOpponentName);
  const statusLabel = isMatched
    ? `Matched vs ${matchedOpponentName}`
    : elapsedSeconds > 0
      ? `Finding opponent… ${elapsedSeconds}s`
      : "Finding opponent…";

  return (
    <div className="matchmaking-overlay" role="status" aria-live="polite">
      <section className="panel panel--compact matchmaking-overlay__panel">
        <p className="eyebrow">{modeLabel} matchmaking</p>
        <h2>{isMatched ? "Opponent found" : "Searching for an opponent"}</h2>

        <div className="waiting-indicator matchmaking-overlay__indicator">
          <span className="waiting-spinner" aria-hidden="true" />
          <strong>{statusLabel}</strong>
        </div>

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
