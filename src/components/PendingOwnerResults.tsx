import { useState } from "react";
import { assignLineupSlots } from "../lib/lineupOrder";
import { formatPersistedUncappedOvr } from "../lib/scoring";
import { getPlayersByIdFromActivePool } from "../lib/activePlayerPool";
import { formatRatingDelta, formatRatingPoints } from "../lib/rankedElo";
import { RankedTierBadge } from "./RankedTierBadge";
import { PlayerStatLine } from "./PlayerStatLine";
import { HubPageChrome } from "./HubPageChrome";
import { matchModeThemeClass } from "../lib/matchModeTheme";
import { shortLabelForH2hMode } from "../lib/modeCopy";
import {
  QUEUED_OWNER_DETAIL_COPY,
  QUEUED_OWNER_INBOX_COPY,
  type DeliveredOwnerResult,
} from "../lib/pendingOwnerResults";

interface PendingOwnerResultsProps {
  deliveries: DeliveredOwnerResult[];
  /** Return true when server ack succeeded and the inbox can close. */
  onDone: () => Promise<boolean>;
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

const detailTitle = (result: DeliveredOwnerResult["result"]["ownerResult"]) => {
  if (result === "win") {
    return "Queued lineup won";
  }
  if (result === "loss") {
    return "Queued lineup lost";
  }
  return "Queued lineup tied";
};

function MatchupDetail({
  delivery,
}: {
  delivery: DeliveredOwnerResult;
}) {
  const { result, mode, classic, ranked } = delivery;
  const lineup = getPlayersByIdFromActivePool(result.ownerLineup, {
    allTimeMode: false,
  });
  const slottedLineup = assignLineupSlots(lineup);
  const outcome = mode === "ranked" ? ranked : classic;
  const margin = Math.abs(result.ownerScore - result.opponentScore);

  return (
    <>
      <div className="panel panel--compact owner-results-inbox__summary">
        <p>
          {result.opponentTeamName} drafted against your saved five while you
          were away.
        </p>
        <p className="owner-results-inbox__scoreline">
          <span>
            {formatPersistedUncappedOvr(result.ownerScore)}–
            {formatPersistedUncappedOvr(result.opponentScore)} OVR
          </span>
          <span aria-hidden="true">·</span>
          <span>Margin {margin.toFixed(1)}</span>
          {outcome ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {formatRatingDelta(outcome.delta)} (
                {formatRatingPoints(outcome.elo)})
              </span>
            </>
          ) : null}
        </p>
        {outcome ? (
          <RankedTierBadge tierLabel={outcome.tierLabel} elo={outcome.elo} />
        ) : null}
        <p className="owner-results-inbox__note">{QUEUED_OWNER_DETAIL_COPY}</p>
        <p className="owner-results-inbox__note">
          Matched vs {formatRatingPoints(result.opponentElo)} opponent
        </p>
      </div>

      <section className="panel panel--compact owner-results-inbox__lineup">
        <h2 className="owner-results-inbox__section-title">Your queued lineup</h2>
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
  onDone,
}: PendingOwnerResultsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ackBusy, setAckBusy] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);
  const selected = deliveries.find(
    (delivery) => delivery.result.id === selectedId,
  );
  const count = deliveries.length;
  const themeMode = deliveries.every((delivery) => delivery.mode === "ranked")
    ? "ranked"
    : "head-to-head";

  const title = selected
    ? detailTitle(selected.result.ownerResult)
    : "Queued results";
  const lede = selected
    ? `Queued result · ${modeLabel(selected.mode)}`
    : count === 1
      ? "1 matchup while you were away"
      : `${count} matchups while you were away`;

  const handleDone = async () => {
    if (ackBusy) {
      return;
    }
    setAckBusy(true);
    setAckError(null);
    const ok = await onDone();
    setAckBusy(false);
    if (!ok) {
      setAckError(
        "Couldn't confirm these results with the server. Try again — your Banners already updated.",
      );
    }
  };

  return (
    <HubPageChrome
      className={`match-results match-results--compact owner-results-inbox ${matchModeThemeClass(
        themeMode,
      )}`}
      title={title}
      lede={lede}
      onBack={selected ? () => setSelectedId(null) : undefined}
      backLabel="Results"
    >
      {selected ? (
        <MatchupDetail delivery={selected} />
      ) : (
        <>
          <p className="owner-results-inbox__lede-note">
            {QUEUED_OWNER_INBOX_COPY} Open a matchup for your five and the score.
            Opponent lineups aren&apos;t stored for queued-away games.
          </p>

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
                        {modeLabel(mode)} ·{" "}
                        {formatPersistedUncappedOvr(result.ownerScore)}–
                        {formatPersistedUncappedOvr(result.opponentScore)} ·
                        margin {margin.toFixed(1)}
                        {outcome
                          ? ` · ${formatRatingDelta(outcome.delta)}`
                          : ""}
                      </span>
                    </span>
                    <span
                      className="owner-results-inbox__chevron"
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="panel panel--compact owner-results-inbox__footer">
        {ackError ? (
          <p className="form-error" role="alert">
            {ackError}
          </p>
        ) : null}
        <button
          type="button"
          className="play-again-button"
          disabled={ackBusy}
          onClick={() => void handleDone()}
        >
          {ackBusy ? "Confirming…" : ackError ? "Retry" : "Back to Play"}
        </button>
      </div>
    </HubPageChrome>
  );
}
