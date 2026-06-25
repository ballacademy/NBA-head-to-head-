import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { RankedTierBadge } from "./RankedTierBadge";
import { TeamLineupCard } from "./TeamLineupCard";
import { GmIdentityBadge } from "./GmIdentityBadge";
import { PlayerUnlockModal } from "./PlayerUnlockModal";
import { AchievementToast } from "./AchievementToast";
import {
  getMatchRecordMode,
  loadPlayerRecord,
} from "../lib/playerRecord";
import {
  completeUnlock,
  processMatchUnlock,
  type PlayerCollection,
} from "../lib/playerCollection";
import { persistMatchOutcome, projectRecordAfterMatch } from "../lib/matchOutcome";
import type { ClassicMatchOutcome, RankedMatchOutcome } from "../lib/matchOutcome";
import {
  calculateLineupScore,
  formatProjectedSeasonRecord,
} from "../lib/scoring";
import {
  checkLineupAchievements,
  unlockAchievements,
} from "../lib/achievements";
import { saveLineupShareCard } from "../lib/lineupShareCard";
import { getMatchModeTheme, matchModeThemeClass } from "../lib/matchModeTheme";
import { getOrCreatePlayerIdentity } from "../lib/playerIdentity";
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
  onReturnToMenu: () => void;
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
  onReturnToMenu,
}: MatchResultsProps) {
  const recordedRef = useRef(false);
  const achievementsCheckedRef = useRef(false);
  const [matchCollection, setMatchCollection] =
    useState<PlayerCollection>(collection);
  const [actionsReady, setActionsReady] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
  const [rankedOutcome, setRankedOutcome] = useState<RankedMatchOutcome | null>(null);
  const [classicOutcome, setClassicOutcome] = useState<ClassicMatchOutcome | null>(null);
  const userScore = calculateLineupScore(userLineup);
  const opponentScore = calculateLineupScore(opponentLineup);
  const userWon = userScore.preciseTotal >= opponentScore.preciseTotal;
  const matchRecordMode = getMatchRecordMode(user);
  const modeTheme = getMatchModeTheme(user);
  const updatedRecord = useMemo(
    () => projectRecordAfterMatch(userWon, matchRecordMode, loadPlayerRecord(matchRecordMode)),
    [matchRecordMode, userWon],
  );

  useLayoutEffect(() => {
    if (recordedRef.current) {
      return;
    }

    recordedRef.current = true;
    const opponentElo = opponent.rankedOpponentElo ?? opponent.classicOpponentElo;
    const outcome = persistMatchOutcome(
      userWon,
      { name: user.name },
      matchId,
      matchRecordMode,
      { opponentElo },
    );

    if (outcome.ranked) {
      setRankedOutcome(outcome.ranked);
    }

    if (outcome.classic) {
      setClassicOutcome(outcome.classic);
    }

    const next = processMatchUnlock(userWon, matchId, collection);

    setMatchCollection(next);
    onCollectionChange(next);
    setActionsReady(true);
  }, [collection, matchId, matchRecordMode, onCollectionChange, opponent.classicOpponentElo, opponent.rankedOpponentElo, user.name, userWon]);

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
      teamName: user.name,
      accent: user.accent,
      ovr: userScore.total,
      lineup: userLineup,
      record: formatProjectedSeasonRecord(userScore.projectedRecord),
    });
  };

  const hasPendingUnlock = Boolean(matchCollection.pendingUnlock);

  const unlockButtonLabel =
    matchCollection.pendingUnlock?.kind === "loss"
      ? "New scrub unlocked — click to choose"
      : "New star unlocked — click to choose";
  const playerIdentity = getOrCreatePlayerIdentity();

  return (
    <section
      className={`match-results match-results--compact ${matchModeThemeClass(modeTheme)}`}
    >
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
            Margin {Math.abs(userScore.total - opponentScore.total)} • OVR{" "}
            {userScore.total} vs {opponentScore.total}
            {matchRecordMode === "ranked" && rankedOutcome ? (
              <>
                {" "}
                • Elo {rankedOutcome.delta >= 0 ? "+" : ""}
                {rankedOutcome.delta} ({rankedOutcome.elo})
              </>
            ) : null}
            {matchRecordMode === "headToHead" && classicOutcome ? (
              <>
                {" "}
                • Elo {classicOutcome.delta >= 0 ? "+" : ""}
                {classicOutcome.delta} ({classicOutcome.elo})
              </>
            ) : null}
          </p>
          {matchRecordMode === "ranked" && rankedOutcome ? (
            <div className="matchup-panel__ranked">
              <RankedTierBadge
                tierLabel={rankedOutcome.tierLabel}
                elo={rankedOutcome.elo}
              />
              <p className="matchup-panel__ranked-note">
                Matched vs {rankedOutcome.opponentElo} Elo opponent
              </p>
            </div>
          ) : null}
          {matchRecordMode === "headToHead" && classicOutcome ? (
            <div className="matchup-panel__ranked">
              <RankedTierBadge
                tierLabel={classicOutcome.tierLabel}
                elo={classicOutcome.elo}
              />
              <p className="matchup-panel__ranked-note">
                Matched vs {classicOutcome.opponentElo} Elo opponent
              </p>
            </div>
          ) : null}
          <p className="matchup-panel__identity">
            <span className="matchup-panel__identity-label">Listed as</span>
            <GmIdentityBadge
              name={user.name}
              publicTag={playerIdentity.publicTag}
              playerId={playerIdentity.playerId}
            />
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
            />
          </div>

          <div className="matchup-panel__team matchup-panel__team--opponent">
            <TeamLineupCard
              drafter={opponent}
              lineup={opponentLineup}
              score={opponentScore}
              isWinner={!userWon}
              compact
            />
          </div>
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
            <div className="match-results__action-row">
              <button
                type="button"
                className="play-again-button match-results__share-button"
                onClick={() => void handleShareLineup()}
              >
                Share lineup
              </button>
              <button
                type="button"
                className="play-again-button"
                onClick={onPlayAgain}
              >
                Draft another team
              </button>
              <button
                type="button"
                className="play-again-button match-results__menu-button"
                onClick={onReturnToMenu}
              >
                Back to home
              </button>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
