import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ScoreBoard } from "./ScoreBoard";
import { TeamLineupCard } from "./TeamLineupCard";
import { PlayerUnlockModal } from "./PlayerUnlockModal";
import {
  formatPlayerRecord,
  loadPlayerRecord,
} from "../lib/playerRecord";
import {
  completeUnlock,
  grantLossUnlock,
  grantWinUnlock,
  type PlayerCollection,
} from "../lib/playerCollection";
import { persistMatchOutcome, projectRecordAfterMatch } from "../lib/matchOutcome";
import { calculateLineupScore } from "../lib/scoring";
import type { Drafter, Player } from "../lib/types";

interface MatchResultsProps {
  user: Drafter;
  opponent: Drafter;
  userLineup: Player[];
  opponentLineup: Player[];
  matchId: string;
  collection: PlayerCollection;
  onCollectionChange: (collection: PlayerCollection) => void;
  onPlayAgain: () => void;
}

export function MatchResults({
  user,
  opponent,
  userLineup,
  opponentLineup,
  matchId,
  collection,
  onCollectionChange,
  onPlayAgain,
}: MatchResultsProps) {
  const recordedRef = useRef(false);
  const [matchCollection, setMatchCollection] =
    useState<PlayerCollection>(collection);
  const [actionsReady, setActionsReady] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const userScore = calculateLineupScore(userLineup);
  const opponentScore = calculateLineupScore(opponentLineup);
  const userWon = userScore.total >= opponentScore.total;
  const updatedRecord = useMemo(
    () => projectRecordAfterMatch(userWon, loadPlayerRecord()),
    [userWon],
  );

  useLayoutEffect(() => {
    if (recordedRef.current) {
      return;
    }

    recordedRef.current = true;
    persistMatchOutcome(userWon, { city: user.city, name: user.name }, matchId);

    const next = userWon
      ? grantWinUnlock(matchId, collection)
      : grantLossUnlock(matchId, collection);

    setMatchCollection(next);
    onCollectionChange(next);
    setActionsReady(true);
  }, [collection, matchId, onCollectionChange, user.city, user.name, userWon]);

  const handleUnlockSelect = (playerId: string) => {
    const next = completeUnlock(playerId, matchCollection);
    setMatchCollection(next);
    onCollectionChange(next);
    setShowUnlockModal(false);
  };

  const hasPendingUnlock = Boolean(matchCollection.pendingUnlock);

  const unlockButtonLabel =
    matchCollection.pendingUnlock?.kind === "loss"
      ? "New scrub unlocked — click to choose"
      : "New star unlocked — click to choose";

  return (
    <section className="match-results">
      {showUnlockModal && matchCollection.pendingUnlock ? (
        <PlayerUnlockModal
          offer={matchCollection.pendingUnlock}
          onSelect={handleUnlockSelect}
        />
      ) : null}

      <div className="panel match-results__header">
        <p className="eyebrow">Matchup results</p>
        <h2>
          {userWon ? "You won the matchup" : `${opponent.name} won the matchup`}
        </h2>
        <p>
          Margin: {Math.abs(userScore.total - opponentScore.total).toFixed(1)}{" "}
          points
        </p>
        <p className="player-record-summary">
          Your head-to-head record: {formatPlayerRecord(updatedRecord)}
        </p>
      </div>

      <div className="match-results__lineups">
        <TeamLineupCard
          drafter={user}
          lineup={userLineup}
          score={userScore}
          isWinner={userWon}
          winStreak={updatedRecord.winStreak}
          lossStreak={updatedRecord.lossStreak}
          showStreak
        />
        <TeamLineupCard
          drafter={opponent}
          lineup={opponentLineup}
          score={opponentScore}
          isWinner={!userWon}
        />
      </div>

      <ScoreBoard
        drafterA={user}
        drafterB={opponent}
        scoreA={userScore}
        scoreB={opponentScore}
      />

      {actionsReady ? (
        <div className="panel match-results__actions">
          {hasPendingUnlock ? (
            <>
              <button
                type="button"
                className={`unlock-reward-button${
                  matchCollection.pendingUnlock!.kind === "loss"
                    ? " unlock-reward-button--loss"
                    : ""
                }`}
                onClick={() => setShowUnlockModal(true)}
              >
                {unlockButtonLabel}
              </button>
              <p className="match-results__unlock-note">
                Review the matchup above, then choose your unlocked player before
                drafting again.
              </p>
            </>
          ) : (
            <button
              type="button"
              className="play-again-button"
              onClick={onPlayAgain}
            >
              Draft another team
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
