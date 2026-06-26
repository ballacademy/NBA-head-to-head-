import type { CSSProperties } from "react";
import type { Drafter, LineupScore, Player } from "../lib/types";

interface LineupStoryCardProps {
  drafter: Drafter;
  lineup: Player[];
  score: LineupScore;
  onShare: () => void;
}

export function LineupStoryCard({
  drafter,
  lineup,
  score,
  onShare,
}: LineupStoryCardProps) {
  return (
    <section
      className="story-card"
      style={{ "--accent": drafter.accent } as CSSProperties}
      aria-labelledby="story-heading"
    >
      <div className="story-card__top">
        <div>
          <p className="eyebrow">Story graphic</p>
          <h2 id="story-heading">Your five</h2>
          <p>Your lineup</p>
        </div>
        <div className="score-orb">
          <span>{score.total}</span>
          <small>OVR</small>
        </div>
      </div>

      <p className="projected-record">{score.projectedRecord.formatted}</p>

      <ol className="story-lineup">
        {lineup.map((player, index) => (
          <li key={player.id}>
            <span className="pick-number">{index + 1}</span>
            <div>
              <strong>{player.name}</strong>
              <span>
                {player.position} - {player.team} -{" "}
                {(player.trueShooting * 100).toFixed(1)}% TS
              </span>
            </div>
          </li>
        ))}
      </ol>

      <div className="story-footer">
        <span>#DraftDayGM</span>
        <button type="button" onClick={onShare}>
          Share lineup
        </button>
      </div>
    </section>
  );
}
