import { useRef } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { closeComposerScrim } from "../instagramComposer/closeComposerScrim";
import type { LastGame } from "./lastGame";

interface GamePickerProps {
  playerName: string;
  games: LastGame[];
  onPick: (game: LastGame) => void;
  onClose: () => void;
}

export function GamePicker({
  playerName,
  games,
  onPick,
  onClose,
}: GamePickerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y({
    open: true,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: dialogRef,
    lockScroll: true,
  });

  return (
    <div
      className="sc-picker-scrim"
      onClick={(event) => closeComposerScrim(event, onClose)}
    >
      <div
        ref={dialogRef}
        className="sc-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sc-game-picker-title"
        tabIndex={-1}
      >
        <div className="sc-picker__top">
          <div>
            <h2 id="sc-game-picker-title">Pick a game</h2>
            <p>Recent box scores for {playerName}. Date on the graphic matches this game.</p>
          </div>
          <button type="button" className="sc-picker__close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sc-picker__grid">
          {games.map((game) => (
            <button
              key={game.eventId}
              type="button"
              className="sc-team"
              onClick={() => onPick(game)}
            >
              <span className="sc-team__name">
                {game.dateLabel} · {game.resultLine}
              </span>
              <span className="sc-team__meta">
                {game.stats.pts} PTS · {game.stats.reb} REB · {game.stats.ast} AST
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
