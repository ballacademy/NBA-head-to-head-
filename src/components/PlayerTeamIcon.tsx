import { useMemo } from "react";
import type { CSSProperties } from "react";
import { getPlayerAvatarDataUri } from "../lib/playerAvatar";
import { getTeamColors } from "../lib/teamColors";
import type { Position } from "../lib/types";

interface PlayerTeamIconProps {
  team: string;
  position: Position;
  label?: string;
  playerId?: string;
  playerName?: string;
  showAvatar?: boolean;
}

export function PlayerTeamIcon({
  team,
  position,
  label,
  playerId,
  playerName,
  showAvatar = false,
}: PlayerTeamIconProps) {
  const colors = getTeamColors(team);
  const avatarSeed = playerId ?? playerName ?? `${team}-${position}`;
  const avatarUri = useMemo(
    () => (showAvatar ? getPlayerAvatarDataUri(avatarSeed) : undefined),
    [avatarSeed, showAvatar],
  );

  return (
    <span
      className={`player-team-icon${showAvatar ? " player-team-icon--avatar" : ""}`}
      style={
        {
          "--team-primary": colors.primary,
          "--team-secondary": colors.secondary,
        } as CSSProperties
      }
      aria-label={label ?? `${team} ${position}`}
      title={label ?? `${team} ${position}`}
    >
      {showAvatar && avatarUri ? (
        <img
          className="player-team-icon__image"
          src={avatarUri}
          alt=""
          aria-hidden="true"
        />
      ) : (
        position
      )}
    </span>
  );
}
