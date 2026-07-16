import type { CSSProperties } from "react";
import { formatJerseyNumber } from "../lib/jerseyNumbers";
import {
  getJerseyNumberFontSize,
  JERSEY_CENTER_X,
  JERSEY_COLLAR_PATH,
  JERSEY_NUMBER_MAX_WIDTH,
  JERSEY_NUMBER_OPTICAL_DX,
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
  const isMultiDigit = numberLabel.replace(/\D/g, "").length >= 2;
  const numberFontSize = getJerseyNumberFontSize(numberLabel);
  const numberX = JERSEY_CENTER_X + JERSEY_NUMBER_OPTICAL_DX;

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
            Single centered text run (not per-digit slots). Bold system fonts
            optically sit right of true center, so apply a small left nudge.
            Multi-digit width is capped with start-anchored textLength.
          */}
          {isMultiDigit ? (
            <text
              className="player-jersey__number player-jersey__number--double"
              x={numberX - JERSEY_NUMBER_MAX_WIDTH / 2}
              y={JERSEY_NUMBER_Y}
              textAnchor="start"
              dominantBaseline="middle"
              fontSize={numberFontSize}
              style={{ fontSize: numberFontSize, letterSpacing: "normal" }}
              textLength={JERSEY_NUMBER_MAX_WIDTH}
              lengthAdjust="spacingAndGlyphs"
            >
              {numberLabel}
            </text>
          ) : (
            <text
              className="player-jersey__number"
              x={numberX}
              y={JERSEY_NUMBER_Y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={numberFontSize}
              style={{ fontSize: numberFontSize, letterSpacing: "normal" }}
            >
              {numberLabel}
            </text>
          )}
        </svg>
      ) : (
        position
      )}
    </span>
  );
}
