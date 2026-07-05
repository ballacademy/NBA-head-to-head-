import type { CSSProperties } from "react";
import { formatJerseyNumber } from "../lib/jerseyNumbers";
import {
  JERSEY_CENTER_X,
  JERSEY_COLLAR_PATH,
  JERSEY_NUMBER_Y,
  JERSEY_SILHOUETTE_PATH,
  JERSEY_VIEWBOX_SIZE,
} from "../lib/jerseySilhouette";
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
          viewBox={`0 0 ${JERSEY_VIEWBOX_SIZE} ${JERSEY_VIEWBOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${team} jersey number ${numberLabel}`}
        >
          <path
            className="player-jersey__outline"
            d={JERSEY_SILHOUETTE_PATH}
            fillRule="evenodd"
          />
          <path className="player-jersey__collar" d={JERSEY_COLLAR_PATH} />
          <text
            className="player-jersey__number"
            x={JERSEY_CENTER_X}
            y={JERSEY_NUMBER_Y}
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
