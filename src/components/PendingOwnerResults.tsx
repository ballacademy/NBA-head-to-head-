import { useState } from "react";
import { assignLineupSlots } from "../lib/lineupOrder";
import { getPlayersByIdFromActivePool } from "../lib/activePlayerPool";
import { formatRatingDelta, formatRatingPoints } from "../lib/rankedElo";
import { RankedTierBadge } from "./RankedTierBadge";
import { PlayerStatLine } from "./PlayerStatLine";
import { matchModeThemeClass } from "../lib/matchModeTheme";
import { shortLabelForH2hMode } from "../lib/modeCopy";
import type { DeliveredOwnerResult } from "../lib/pendingOwnerResults";
import type { ModePlayerRecords } from "../lib/playerRecord";

interface PendingOwnerResultsProps {
  deliveries: DeliveredOwnerResult[];
  modeRecords: ModePlayerRecords;
  onDone: () => void;
}

const outcomeLabel = (result: DeliveredOwnerResult["result"]["ownerResult"]) => {
  if (result === "win") {
    return "Win";
  }
  if (result === "loss") {
    return "Loss";
  }
  return "Tie";
};

const modeLabel = (mode: DeliveredOwnerResult["mode"]) =>
  shortLabelForH2hMode(mode);

function MatchupDetail({
  delivery,
  modeRecords,
}: {
  delivery: DeliveredOwnerResult;
  modeRecords: ModePlayerRecords;
}) {
  const { result, mode, classic, ranked } = delivery;
  const allTimeRecord = modeRecords.allTime;
  const lineup = getPlayersByIdFromActivePool(
    result.ownerLineup,
    allTimeRecord,
    { allTimeMode: false },
  );
  const slottedLineup = assignLineupSlots(lineup);
  const ownerWon = result.ownerResult === "win";
  const ownerLost = result.ownerResult === "loss";
  const outcome = mode === "ranked" ? ranked : classic;

  return (
    <>
      <div className="panel panel--compact daily-draft-results__header">
        <p className="eyebrow">Matchup preview · {modeLabel(mode)}</p>
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
          Margin{" "}
          {Math.abs(result.ownerScore - result.opponentScore).toFixed(1)} • OVR{" "}
          {result.ownerScore.toFixed(1)} vs {result.opponentScore.toFixed(1)}
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
          {slottedLineup.map(({ player, slot }) => (
            <PlayerStatLine
              key={player.id}
              player={player}
              lineupSlot={slot}
            />
          ))}
        </div>
      </section>
    </>
  );
}

export function PendingOwnerResults({
  deliveries,
  modeRecords,
  onDone,
}: PendingOwnerResultsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = deliveries.find((delivery) => delivery.result.id === selectedId);
  const count = deliveries.length;
  const themeMode =
    deliveries.every((delivery) => delivery.mode === "ranked")
      ? "ranked"
      : "head-to-head";

  return (
    <section
      className={`match-results daily-draft-results match-results--compact owner-results-inbox ${matchModeThemeClass(
        themeMode,
      )}`}
    >
      {selected ? (
        <MatchupDetail delivery={selected} modeRecords={modeRecords} />
      ) : (
        <>
          <div className="panel panel--compact daily-draft-results__header">
            <p className="eyebrow">Queued lineup results</p>
            <h2>
              {count === 1
                ? "1 matchup while you were away"
                : `${count} matchups while you were away`}
            </h2>
            <p>
              Open any matchup for the full preview, or close all results at once.
            </p>
          </div>

          <ul className="owner-results-inbox__list">
            {deliveries.map((delivery) => {
              const { result, mode, classic, ranked } = delivery;
              const outcome = mode === "ranked" ? ranked : classic;
              const margin = Math.abs(result.ownerScore - result.opponentScore);

              return (
                <li key={result.id}>
                  <button
                    type="button"
                    className={`owner-results-inbox__row owner-results-inbox__row--${result.ownerResult}`}
                    onClick={() => setSelectedId(result.id)}
                  >
                    <span className="owner-results-inbox__outcome">
                      {outcomeLabel(result.ownerResult)}
                    </span>
                    <span className="owner-results-inbox__body">
                      <span className="owner-results-inbox__opponent">
                        {result.opponentTeamName}
                      </span>
                      <span className="owner-results-inbox__meta">
                        {modeLabel(mode)} · {result.ownerScore.toFixed(1)}–
                        {result.opponentScore.toFixed(1)} · margin{" "}
                        {margin.toFixed(1)}
                        {outcome
                          ? ` · ${formatRatingDelta(outcome.delta)}`
                          : ""}
                      </span>
                    </span>
                    <span className="owner-results-inbox__chevron" aria-hidden="true">
                      ›
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div
        className={`panel panel--compact daily-draft-results__footer queued-draft-results__footer${
          selected ? " owner-results-inbox__footer--split" : ""
        }`}
      >
        {selected ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSelectedId(null)}
          >
            Back to results
          </button>
        ) : null}
        <button type="button" className="play-again-button" onClick={onDone}>
          Close all results
        </button>
      </div>
    </section>
  );
}
