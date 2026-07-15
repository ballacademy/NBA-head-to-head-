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
  const isDoubleDigit = numberLabel.replace(/\D/g, "").length >= 2;
  const numberFontSize = getJerseyNumberFontSize(numberLabel);

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
            Anchor via transform. For double digits, use start anchoring at
            -maxWidth/2 with textLength=maxWidth — text-anchor="middle" +
            textLength is mis-centered in Chromium.
            Avoid CSS letter-spacing on SVG text (also shifts left/right).
          */}
          <g transform={`translate(${JERSEY_CENTER_X} ${JERSEY_NUMBER_Y})`}>
            <text
              className={`player-jersey__number${
                isDoubleDigit ? " player-jersey__number--double" : ""
              }`}
              x={isDoubleDigit ? -JERSEY_NUMBER_MAX_WIDTH / 2 : 0}
              y={0}
              textAnchor={isDoubleDigit ? "start" : "middle"}
              dominantBaseline="middle"
              fontSize={numberFontSize}
              style={{ fontSize: numberFontSize, letterSpacing: "normal" }}
              textLength={isDoubleDigit ? JERSEY_NUMBER_MAX_WIDTH : undefined}
              lengthAdjust={isDoubleDigit ? "spacingAndGlyphs" : undefined}
            >
              {numberLabel}
            </text>
          </g>
        </svg>
      ) : (
        position
      )}
    </span>
  );
}
