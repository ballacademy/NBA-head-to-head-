import { CLASSIC_HEAD_TO_HEAD_LABEL } from "../lib/modeLabels";

interface MatchmakingOverlayProps {
  mode: "classic" | "ranked";
  elapsedSeconds: number;
}

export function MatchmakingOverlay({
  mode,
  elapsedSeconds,
}: MatchmakingOverlayProps) {
  const modeLabel = mode === "ranked" ? "Pro" : CLASSIC_HEAD_TO_HEAD_LABEL;
  const statusLabel =
    elapsedSeconds > 0
      ? `Finding opponent… ${elapsedSeconds}s`
      : "Finding opponent…";

  return (
    <div className="matchmaking-overlay" role="status" aria-live="polite">
      <section className="panel panel--compact matchmaking-overlay__panel">
        <p className="eyebrow">{modeLabel} matchmaking</p>
        <h2>Searching for an opponent</h2>

        <div className="waiting-indicator matchmaking-overlay__indicator">
          <span className="waiting-spinner" aria-hidden="true" />
          <strong>{statusLabel}</strong>
        </div>
      </section>
    </div>
  );
}
