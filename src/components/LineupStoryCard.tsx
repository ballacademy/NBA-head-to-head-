import type { CSSProperties } from "react";
import { avatarFor } from "../lib/avatars";
import type { Drafter, LineupScore, ResolvedPlayer } from "../lib/types";

interface LineupStoryCardProps {
  drafter: Drafter;
  lineup: ResolvedPlayer[];
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
          <h2 id="story-heading">{drafter.name}'s five</h2>
          <p>{drafter.city} challenger</p>
        </div>
        <div className="score-orb">
          <span>{score.total}</span>
          <small>OVR</small>
        </div>
      </div>

      <ol className="story-lineup">
        {lineup.map((player) => (
          <li key={player.id}>
            <div className="player-portrait">
              <img
                className="player-avatar"
                src={avatarFor(player.id)}
                alt=""
                aria-hidden="true"
                width={52}
                height={52}
              />
            </div>
            <div>
              <strong>{player.name}</strong>
              <span>
                {player.position} - {player.team} -{" "}
                {(player.trueShooting * 100).toFixed(1)}% TS
                {player.priorSeason ? (
                  <em className="prior-season" title="Out injured for 2025-26; previous season stats shown">
                    {" "}
                    ’24-25
                  </em>
                ) : null}
              </span>
            </div>
          </li>
        ))}
      </ol>

      <div className="story-footer">
        <span>#NBAHeadToHead</span>
        <button type="button" onClick={onShare}>
          Share lineup
        </button>
      </div>
      <p className="blend-note">
        Stats blend 75% regular season / 25% postseason for players with 2025-26
        playoff games; others use the regular season only.
      </p>
    </section>
  );
}
