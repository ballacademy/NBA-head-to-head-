import type { MatchModeTheme } from "../lib/matchModeTheme";
import { matchModeThemeClass } from "../lib/matchModeTheme";

interface WaitingRoomProps {
  theme: MatchModeTheme;
  opponentName?: string | null;
}

export function WaitingRoom({
  theme,
  opponentName = null,
}: WaitingRoomProps) {
  return (
    <section
      className={`panel waiting-room ${matchModeThemeClass(theme)}`}
      aria-live="polite"
    >
      <p className="eyebrow">Draft complete</p>
      <h2>
        {opponentName
          ? `Waiting for ${opponentName}`
          : "Waiting for your opponent"}
      </h2>
      <p>
        Your lineup is locked in.
        {opponentName
          ? ` ${opponentName} is still drafting and will be revealed once both teams are ready.`
          : " Your opponent is still drafting and will be revealed once both teams are ready."}
      </p>

      <div className="waiting-indicator">
        <span className="waiting-spinner" aria-hidden="true" />
        <strong>
          {opponentName
            ? `Waiting on ${opponentName}…`
            : "Searching for opponent lineup…"}
        </strong>
      </div>
    </section>
  );
}
