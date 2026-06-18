import type { CSSProperties } from "react";
import type { DraftLetterGrade } from "../lib/draftGrade";
import { getTeamColors } from "../lib/teamColors";
import type { Player } from "../lib/types";

interface RoastShareCardProps {
  teamCity: string;
  teamName: string;
  accent: string;
  grade: DraftLetterGrade;
  roast: string;
  ovr: number;
  projectedRecord: string;
  lineup: Player[];
  onShareImage: () => void;
  onCopyText: () => void;
  dailyShareText?: string;
  onCopyDailyShare?: () => void;
}

export function RoastShareCard({
  teamCity,
  teamName,
  accent,
  grade,
  roast,
  ovr,
  projectedRecord,
  lineup,
  onShareImage,
  onCopyText,
  dailyShareText,
  onCopyDailyShare,
}: RoastShareCardProps) {
  return (
    <section
      className="roast-share-card panel"
      style={{ "--accent": accent } as CSSProperties}
      aria-labelledby="roast-share-heading"
    >
      <div className="roast-share-card__header">
        <div>
          <p className="eyebrow">Roast My Lineup</p>
          <h2 id="roast-share-heading">Draft report card</h2>
          <p className="roast-share-card__team">
            {teamCity} {teamName}
          </p>
        </div>
        <div className="roast-share-card__grade" aria-label={`Draft grade ${grade}`}>
          {grade}
        </div>
      </div>

      <p className="roast-share-card__meta">
        OVR {ovr} • {projectedRecord}
      </p>
      <blockquote className="roast-share-card__roast">"{roast}"</blockquote>

      <ol className="roast-share-card__lineup">
        {lineup.map((player, index) => {
          const colors = getTeamColors(player.team);

          return (
            <li key={player.id} className="roast-share-card__player">
              <span
                className="roast-share-card__jersey"
                style={{
                  background: colors.primary,
                  color: colors.secondary,
                }}
              >
                {player.jerseyNumber || index + 1}
              </span>
              <div>
                <strong>{player.name}</strong>
                <span>
                  {player.position} • {player.team} •{" "}
                  {(player.threePoint * 100).toFixed(1)}% 3P
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="roast-share-card__actions">
        <button type="button" className="landing__primary-button" onClick={onShareImage}>
          Share card image
        </button>
        <button type="button" className="secondary-button" onClick={onCopyText}>
          Copy roast text
        </button>
        {dailyShareText && onCopyDailyShare ? (
          <button type="button" className="ghost-link" onClick={onCopyDailyShare}>
            Copy daily emoji grid
          </button>
        ) : null}
      </div>
    </section>
  );
}
