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

/** Jersey outline bbox is 25x25 units centered at (16, 16) inside a 32x32 viewBox. */
const JERSEY_OUTLINE =
  "M4.5 9.5 7.5 3.5 12 8.5 16 5 20 8.5 24.5 3.5 27.5 9.5 28.5 15.5 28.5 28.5 3.5 28.5 3.5 15.5Z";

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
          <path className="player-jersey__outline" d={JERSEY_OUTLINE} />
          <path className="player-jersey__neck" d="M14.25 8.75Q16 6 17.75 8.75" />
          <text
            className="player-jersey__number"
            x="16"
            y="22"
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
