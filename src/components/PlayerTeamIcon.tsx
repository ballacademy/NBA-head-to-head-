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
          viewBox="0 0 48 48"
          role="img"
          aria-label={`${team} jersey number ${numberLabel}`}
        >
          <path
            className="player-jersey__outline"
            d="M11 9 17 5 24 11 31 5 37 9 41 19 41 43 7 43 7 19Z"
          />
          <path
            className="player-jersey__neck"
            d="M20 11c0-2 1.6-3.5 4-3.5s4 1.5 4 3.5"
          />
          <text
            className="player-jersey__number"
            x="24"
            y="33"
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
