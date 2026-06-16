import type { CSSProperties } from "react";
import { getTeamColors } from "../lib/teamColors";
import type { Position } from "../lib/types";

interface PlayerTeamIconProps {
  team: string;
  position: Position;
  label?: string;
}

export function PlayerTeamIcon({
  team,
  position,
  label,
}: PlayerTeamIconProps) {
  const colors = getTeamColors(team);

  return (
    <span
      className="player-team-icon"
      style={
        {
          "--team-primary": colors.primary,
          "--team-secondary": colors.secondary,
        } as CSSProperties
      }
      aria-label={label ?? `${team} ${position}`}
      title={label ?? `${team} ${position}`}
    >
      {position}
    </span>
  );
}
