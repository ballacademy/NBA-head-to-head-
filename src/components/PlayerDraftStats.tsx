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
}

export function PlayerDraftStats({ player }: PlayerDraftStatsProps) {
  const stats = formatPlayerDraftStats(player);

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
