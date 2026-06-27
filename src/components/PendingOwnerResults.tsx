import { sortLineupByPosition } from "../lib/lineupOrder";
import { getPlayersByIdFromActivePool } from "../lib/activePlayerPool";
import { formatRatingDelta, formatRatingPoints, RATING_LABEL } from "../lib/rankedElo";
import { RankedTierBadge } from "./RankedTierBadge";
import { PlayerStatLine } from "./PlayerStatLine";
import { matchModeThemeClass } from "../lib/matchModeTheme";
import type { DeliveredOwnerResult } from "../lib/pendingOwnerResults";
import type { ModePlayerRecords } from "../lib/playerRecord";

interface PendingOwnerResultsProps {
  delivery: DeliveredOwnerResult;
  modeRecords: ModePlayerRecords;
  onDone: () => void;
}

export function PendingOwnerResults({
  delivery,
  modeRecords,
  onDone,
}: PendingOwnerResultsProps) {
  const { result, mode, classic, ranked } = delivery;
  const allTimeRecord = modeRecords.allTime;
  const lineup = getPlayersByIdFromActivePool(
    result.ownerLineup,
    allTimeRecord,
    { allTimeMode: false },
  );
  const orderedLineup = sortLineupByPosition(lineup);
  const ownerWon = result.ownerResult === "win";
  const ownerLost = result.ownerResult === "loss";
  const outcome = mode === "ranked" ? ranked : classic;

  return (
    <section
      className={`match-results daily-draft-results match-results--compact ${matchModeThemeClass(
        mode === "ranked" ? "ranked" : "head-to-head",
      )}`}
    >
      <div className="panel panel--compact daily-draft-results__header">
        <p className="eyebrow">Queued lineup result</p>
        <h2>
          {ownerWon
            ? "Your queued lineup won"
            : ownerLost
              ? "Your queued lineup lost"
              : "Your queued lineup tied"}
        </h2>
        <p>
          {result.opponentTeamName} drafted against your saved five while you were
          away.
        </p>
        <p>
          Margin {Math.abs(result.ownerScore - result.opponentScore)} • OVR{" "}
          {result.ownerScore} vs {result.opponentScore}
          {outcome ? (
            <>
              {" "}
              • {formatRatingDelta(outcome.delta)} ({formatRatingPoints(outcome.elo)})
            </>
          ) : null}
        </p>
        {outcome ? (
          <RankedTierBadge tierLabel={outcome.tierLabel} elo={outcome.elo} />
        ) : null}
        <p className="matchup-panel__ranked-note">
          Matched vs {formatRatingPoints(result.opponentElo)} opponent
        </p>
      </div>

      <section className="panel panel--compact daily-draft-results__lineup">
        <h3>Your queued lineup</h3>
        <div className="team-lineup-card__players">
          {orderedLineup.map((player, index) => (
            <PlayerStatLine key={player.id} player={player} pickNumber={index + 1} />
          ))}
        </div>
      </section>

      <div className="panel panel--compact daily-draft-results__footer queued-draft-results__footer">
        <button type="button" className="play-again-button" onClick={onDone}>
          Back to home
        </button>
      </div>
    </section>
  );
}
