import type { CSSProperties } from "react";
import { formatJerseyNumber } from "../lib/jerseyNumbers";
import {
  getJerseyNumberFontSize,
  JERSEY_CENTER_X,
  JERSEY_COLLAR_PATH,
  JERSEY_NUMBER_MAX_WIDTH,
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
  const digits = Array.from(numberLabel);
  const isMultiDigit = digits.length >= 2;
  const numberFontSize = getJerseyNumberFontSize(numberLabel);
  const digitSlot = isMultiDigit
    ? JERSEY_NUMBER_MAX_WIDTH / digits.length
    : 0;

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
          {/*
            Numbers sit on the vertical centerline. Multi-digit labels use
            equal mirrored slots so the group stays left/right balanced.
          */}
          <g transform={`translate(${JERSEY_CENTER_X} ${JERSEY_NUMBER_Y})`}>
            {isMultiDigit ? (
              digits.map((digit, index) => (
                <text
                  key={`${digit}-${index}`}
                  className="player-jersey__number player-jersey__number--double"
                  x={-JERSEY_NUMBER_MAX_WIDTH / 2 + digitSlot * (index + 0.5)}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={numberFontSize}
                  style={{ fontSize: numberFontSize, letterSpacing: "normal" }}
                >
                  {digit}
                </text>
              ))
            ) : (
              <text
                className="player-jersey__number"
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={numberFontSize}
                style={{ fontSize: numberFontSize, letterSpacing: "normal" }}
              >
                {numberLabel}
              </text>
            )}
          </g>
        </svg>
      ) : (
        position
      )}
    </span>
  );
}
