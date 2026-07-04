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
 * Sleeveless basketball jersey centered in a 32x32 viewBox.
 * Bbox is ~22.5 x 21 units at (16, 16) with equal padding on all sides.
 */
const JERSEY_OUTLINE =
  "M4.75 9Q4.25 6.5 7.5 5.5L11 8.75L16 5.5L21 8.75Q24.25 6.5 27.25 9" +
  "Q28.75 11.25 28 13.75L27.25 26.5L4.75 26.5L4 13.75Q3.25 11.25 4.75 9Z";

const JERSEY_NECK = "M13.25 9Q16 6.75 18.75 9";

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
          <path className="player-jersey__neck" d={JERSEY_NECK} />
          <path className="player-jersey__armhole" d="M7.75 11.25Q8.75 13.25 8.25 14.75" />
          <path
            className="player-jersey__armhole"
            d="M24.25 11.25Q23.25 13.25 23.75 14.75"
          />
          <text
            className="player-jersey__number"
            x="16"
            y="20.5"
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
