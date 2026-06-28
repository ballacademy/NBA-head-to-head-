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
      <section className="panel matchmaking-overlay__panel">
        <p className="eyebrow">{modeLabel} matchmaking</p>
        <h2>Searching for an opponent</h2>
        <p>
          Checking the live queue first, then saved human lineups if no one is
          available right now.
        </p>

        <div className="waiting-indicator">
          <span className="waiting-spinner" aria-hidden="true" />
          <strong>{statusLabel}</strong>
        </div>
      </section>
    </div>
  );
}
