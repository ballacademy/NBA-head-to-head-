import { useState, type CSSProperties } from "react";
import { formatJerseyNumber } from "../lib/jerseyNumbers";
import {
  getJerseyNumberFontSize,
  JERSEY_COLLAR_PATH,
  JERSEY_NUMBER_ZONE,
  JERSEY_SILHOUETTE_PATH,
  JERSEY_VIEWBOX_SIZE,
} from "../lib/jerseySilhouette";
import {
  arePlayerHeadshotsEnabled,
  getPlayerHeadshotUrl,
} from "../lib/playerHeadshots";
import { getTeamColors } from "../lib/teamColors";
import type { Position } from "../lib/types";

interface PlayerTeamIconProps {
  team: string;
  position: Position;
  jerseyNumber?: number;
  label?: string;
  showJersey?: boolean;
  /** Basketball-Reference id — used to resolve ESPN headshots when enabled. */
  bbrPlayerId?: string;
  /** Override host-based headshot gating (tests / forced previews). */
  preferHeadshot?: boolean;
}

/**
 * Jersey badge by default. On QA (and local), prefers ESPN headshots when a
 * mapping exists, falling back to the jersey if the image fails to load.
 */
export function PlayerTeamIcon({
  team,
  position,
  jerseyNumber,
  label,
  showJersey = false,
  bbrPlayerId,
  preferHeadshot,
}: PlayerTeamIconProps) {
  const colors = getTeamColors(team);
  const numberLabel =
    jerseyNumber === undefined ? "?" : formatJerseyNumber(jerseyNumber);
  const numberFontSize = getJerseyNumberFontSize(numberLabel);
  const headshotsOn =
    preferHeadshot ?? arePlayerHeadshotsEnabled();
  const headshotUrl = headshotsOn ? getPlayerHeadshotUrl(bbrPlayerId) : null;
  const [headshotFailed, setHeadshotFailed] = useState(false);
  const showHeadshot = Boolean(headshotUrl) && !headshotFailed;

  return (
    <span
      className={`player-team-icon${
        showHeadshot
          ? " player-team-icon--avatar"
          : showJersey
            ? " player-team-icon--jersey"
            : ""
      }`}
      style={
        {
          "--team-primary": colors.primary,
          "--team-secondary": colors.secondary,
        } as CSSProperties
      }
      aria-label={label ?? `${team} ${position}`}
      title={label ?? `${team} ${position}`}
    >
      {showHeadshot && headshotUrl ? (
        <img
          className="player-team-icon__image"
          src={headshotUrl}
          alt=""
          loading="lazy"
          decoding="async"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onError={() => setHeadshotFailed(true)}
        />
      ) : showJersey ? (
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
            x={JERSEY_NUMBER_ZONE.centerX}
            y={JERSEY_NUMBER_ZONE.centerY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={numberFontSize}
            style={{ fontSize: numberFontSize, letterSpacing: "normal" }}
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
