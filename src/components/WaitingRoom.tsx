import type { MatchModeTheme } from "../lib/matchModeTheme";
import { matchModeThemeClass } from "../lib/matchModeTheme";

interface WaitingRoomProps {
  theme: MatchModeTheme;
  opponentName?: string | null;
  opponentAutoDrafted?: boolean;
  onLeave?: () => void;
}

export function WaitingRoom({
  theme,
  opponentName = null,
  opponentAutoDrafted = false,
  onLeave,
}: WaitingRoomProps) {
  return (
    <section
      className={`panel waiting-room ${matchModeThemeClass(theme)}`}
      aria-live="polite"
    >
      <p className="eyebrow">Draft complete</p>
      <h2>
        {opponentAutoDrafted
          ? "Opponent timed out"
          : opponentName
            ? `Waiting for ${opponentName}`
            : "Waiting for your opponent"}
      </h2>
      <p>
        Your lineup is locked in.
        {opponentAutoDrafted
          ? " Their lineup was auto-drafted so the match can be scored."
          : opponentName
            ? ` ${opponentName} is still drafting and will be revealed once both teams are ready.`
            : " Your opponent is still drafting and will be revealed once both teams are ready."}{" "}
        Stay here to see the result — leaving abandons this match screen.
      </p>

      <div className="waiting-indicator">
        <span className="waiting-spinner" aria-hidden="true" />
        <strong>
          {opponentAutoDrafted
            ? "Preparing results…"
            : opponentName
              ? `Waiting on ${opponentName}…`
              : "Searching for opponent lineup…"}
        </strong>
      </div>

      {onLeave ? (
        <button
          type="button"
          className="secondary-button waiting-room__leave"
          onClick={onLeave}
        >
          Leave match
        </button>
      ) : null}
    </section>
  );
}
