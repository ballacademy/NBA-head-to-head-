import { formatPlayerDraftStats } from "../lib/defenseGrade";
import type { Player } from "../lib/types";

interface PlayerDraftStatsProps {
  player: Pick<
    Player,
    | "points"
    | "rebounds"
    | "blocks"
    | "steals"
    | "threePoint"
    | "trueShooting"
    | "turnovers"
    | "defense"
    | "defenseGrade"
  >;
  variant?: "pills" | "inline";
}

export function PlayerDraftStats({
  player,
  variant = "pills",
}: PlayerDraftStatsProps) {
  const stats = formatPlayerDraftStats(player);

  if (variant === "inline") {
    return (
      <span className="player-draft-stats player-draft-stats--inline" aria-label={stats.summary}>
        {stats.summary}
      </span>
    );
  }

  return (
    <div className="player-draft-stats" aria-label={stats.summary}>
      {stats.parts.map((part) => (
        <span className="player-draft-stats__item" key={part}>
          {part}
        </span>
      ))}
    </div>
  );
}
