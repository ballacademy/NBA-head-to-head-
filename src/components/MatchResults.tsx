import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { TeamLineupCard } from "./TeamLineupCard";
import { PlayerUnlockModal } from "./PlayerUnlockModal";
import { AchievementToast } from "./AchievementToast";
import {
  formatPlayerRecord,
  loadPlayerRecord,
} from "../lib/playerRecord";
import {
  completeUnlock,
  processMatchUnlock,
  type PlayerCollection,
} from "../lib/playerCollection";
import { persistMatchOutcome, projectRecordAfterMatch } from "../lib/matchOutcome";
import { calculateLineupScore } from "../lib/scoring";
import {
  checkLineupAchievements,
  unlockAchievements,
} from "../lib/achievements";
import { saveLineupShareCard } from "../lib/lineupShareCard";
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
  const achievementsCheckedRef = useRef(false);
  const [matchCollection, setMatchCollection] =
    useState<PlayerCollection>(collection);
  const [actionsReady, setActionsReady] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
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
    const record = persistMatchOutcome(
      userWon,
      { city: user.city, name: user.name },
      matchId,
    );

    const next = processMatchUnlock(userWon, matchId, collection, record);

    setMatchCollection(next);
    onCollectionChange(next);
    setActionsReady(true);
  }, [collection, matchId, onCollectionChange, user.city, user.name, userWon]);

  useLayoutEffect(() => {
    if (achievementsCheckedRef.current || userLineup.length !== 5) {
      return;
    }

    achievementsCheckedRef.current = true;
    const earned = checkLineupAchievements(userLineup);
    const { newlyUnlocked } = unlockAchievements(earned);
    setNewAchievementIds(newlyUnlocked);
  }, [userLineup]);

  const handleUnlockSelect = (playerId: string) => {
    const next = completeUnlock(playerId, matchCollection);
    setMatchCollection(next);
    onCollectionChange(next);
    setShowUnlockModal(false);
  };

  const handleShareLineup = async () => {
    await saveLineupShareCard({
      teamCity: user.city,
      teamName: user.name,
      accent: user.accent,
      ovr: userScore.total,
      lineup: userLineup,
    });
  };

  const hasPendingUnlock = Boolean(matchCollection.pendingUnlock);

  const unlockButtonLabel =
    matchCollection.pendingUnlock?.kind === "loss"
      ? "New scrub unlocked — click to choose"
      : "New star unlocked — click to choose";

  return (
    <section className="match-results match-results--compact">
      {showUnlockModal && matchCollection.pendingUnlock ? (
        <PlayerUnlockModal
          offer={matchCollection.pendingUnlock}
          onSelect={handleUnlockSelect}
        />
      ) : null}

      <AchievementToast achievementIds={newAchievementIds} />

      <div className="panel panel--compact matchup-panel">
        <div className="matchup-panel__banner">
          <div>
            <p className="eyebrow">Matchup results</p>
            <h2 className="matchup-panel__title">
              {userWon ? "You won the matchup" : `${opponent.name} won the matchup`}
            </h2>
          </div>
          <p className="matchup-panel__meta">
            Margin {Math.abs(userScore.total - opponentScore.total).toFixed(1)} •{" "}
            {userScore.total.toFixed(1)} vs {opponentScore.total.toFixed(1)} • Record{" "}
            {formatPlayerRecord(updatedRecord)}
          </p>
        </div>

        <div className="matchup-panel__grid">
          <div className="matchup-panel__team">
            <TeamLineupCard
              drafter={user}
              lineup={userLineup}
              score={userScore}
              isWinner={userWon}
              winStreak={updatedRecord.winStreak}
              lossStreak={updatedRecord.lossStreak}
              showStreak
              compact
              showProjectedRecord={false}
            />
          </div>

          <div className="matchup-panel__team">
            <TeamLineupCard
              drafter={opponent}
              lineup={opponentLineup}
              score={opponentScore}
              isWinner={!userWon}
              compact
              showProjectedRecord={false}
            />
          </div>
        </div>

        <div className="matchup-panel__footer">
          <button
            type="button"
            className="secondary-button matchup-panel__share"
            onClick={() => void handleShareLineup()}
          >
            Share lineup
          </button>
        </div>
      </div>

      {actionsReady ? (
        <div className="panel panel--compact match-results__actions">
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
                Choose your unlocked player before drafting again.
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
