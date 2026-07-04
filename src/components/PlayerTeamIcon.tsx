import type { CSSProperties } from "react";
import { formatJerseyNumber } from "../lib/jerseyNumbers";
import { getTeamColors } from "../lib/teamColors";
import type { Position } from "../lib/types";

interface PlayerTeamIconProps {
  team: string;
  position: Position;
  jerseyNumber?: number;
  label?: string;
  showJersey?: boolean;
}

/**
 * Symmetric sleeveless NBA jersey silhouette in a 32x32 viewBox.
 * Every coordinate mirrors across x=16; bbox is 18x22 centered at (16, 16).
 */
const JERSEY_SILHOUETTE =
  "M7 10.5L8 5L13.5 9.5L16 6.5L18.5 9.5L24 5L25 10.5" +
  "C26.5 12.25 25.5 13.75 22.5 14.5L22 27L10 27L9.5 14.5" +
  "C6.5 13.75 5.5 12.25 7 10.5Z" +
  "M12.75 9.75Q16 12 19.25 9.75Q16 8.25 12.75 9.75Z";

export function PlayerTeamIcon({
  team,
  position,
  jerseyNumber,
  label,
  showJersey = false,
}: PlayerTeamIconProps) {
  const colors = getTeamColors(team);
  const numberLabel =
    jerseyNumber === undefined ? "?" : formatJerseyNumber(jerseyNumber);

  return (
    <span
      className={`player-team-icon${showJersey ? " player-team-icon--jersey" : ""}`}
      style={
        {
          "--team-primary": colors.primary,
          "--team-secondary": colors.secondary,
        } as CSSProperties
      }
      aria-label={label ?? `${team} ${position}`}
      title={label ?? `${team} ${position}`}
    >
      {showJersey ? (
        <svg
          className="player-jersey"
          viewBox="0 0 32 32"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${team} jersey number ${numberLabel}`}
        >
          <path
            className="player-jersey__outline"
            d={JERSEY_SILHOUETTE}
            fillRule="evenodd"
          />
          <text
            className="player-jersey__number"
            x="16"
            y="21"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {numberLabel}
          </text>
        </svg>
      ) : (
        position
      )}
    </span>
  );
}
