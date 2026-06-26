import { getActiveChemistryBonuses } from "../lib/chemistry";
import type { Player } from "../lib/types";

interface LineupChemistryBadgesProps {
  lineup: Player[];
}

export function LineupChemistryBadges({ lineup }: LineupChemistryBadgesProps) {
  const bonuses = getActiveChemistryBonuses(lineup);

  if (bonuses.length === 0) {
    return null;
  }

  return (
    <div className="lineup-chemistry-badges" aria-label="Active chemistry bonuses">
      {bonuses.map((bonus) => (
        <span key={bonus.id} className="lineup-chemistry-badge">
          {bonus.title} <strong>+{bonus.bonus}</strong>
        </span>
      ))}
    </div>
  );
}
