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
import {
  extractGhostStoredLineupId,
  submitGhostMatchOutcome,
  submitStoredLineup,
} from "../lib/ghostMatchmaking";
import { getOrCreatePlayerIdentity } from "../lib/playerIdentity";
import { ensureCurrentRankedSeason } from "../lib/rankedProfile";
import { formatRatingDelta, formatRatingPoints, RANKED_STARTING_ELO } from "../lib/rankedElo";
import type { RankedMatchOutcome } from "../lib/matchOutcome";
import {
  calculateLineupScore,
  formatProjectedSeasonRecord,
  resolveHeadToHeadResult,
} from "../lib/scoring";
import {
  buildAchievementContext,
  checkLineupAchievements,
  unlockAchievements,
} from "../lib/achievements";
import { saveLineupShareCard } from "../lib/lineupShareCard";
import { getMatchModeTheme, matchModeThemeClass } from "../lib/matchModeTheme";
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
  isMatchmaking?: boolean;
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
  isMatchmaking = false,
}: MatchResultsProps) {
  const recordedRef = useRef(false);
  const achievementsCheckedRef = useRef(false);
  const [matchCollection, setMatchCollection] =
    useState<PlayerCollection>(collection);
  const [actionsReady, setActionsReady] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
  const [rankedOutcome, setRankedOutcome] = useState<RankedMatchOutcome | null>(null);
  const userScore = calculateLineupScore(userLineup);
  const opponentScore = calculateLineupScore(opponentLineup);
  const matchResult = resolveHeadToHeadResult(
    userScore.preciseTotal,
    opponentScore.preciseTotal,
  );
  const isTie = matchResult === "tie";
  const userWon = matchResult === "win";
  const matchRecordMode = getMatchRecordMode(user);
  const modeTheme = getMatchModeTheme(user);
  const updatedRecord = useMemo(
    () => projectRecordAfterMatch(matchResult, matchRecordMode, loadPlayerRecord(matchRecordMode)),
    [matchRecordMode, matchResult],
  );

  useLayoutEffect(() => {
    if (recordedRef.current) {
      return;
    }

    recordedRef.current = true;

    if (!user.practiceMode) {
      const opponentElo = opponent.rankedOpponentElo ?? opponent.classicOpponentElo;
      const outcome = persistMatchOutcome(
        matchResult,
        { name: user.name },
        matchId,
        matchRecordMode,
        { opponentElo },
      );

      if (outcome.ranked) {
        setRankedOutcome(outcome.ranked);
      }

      const next = processMatchUnlock(matchResult, matchId, collection);
      setMatchCollection(next);
      onCollectionChange(next);
    }

    setActionsReady(true);

    if (!user.allTimeMode && !user.practiceMode && userLineup.length === 5) {
      const mode = user.salaryCapMode ? "ranked" : "classic";
      const playerId = getOrCreatePlayerIdentity().playerId;
      const challengerEloBefore = user.salaryCapMode
        ? ensureCurrentRankedSeason().elo
        : RANKED_STARTING_ELO;
      const storedLineupId = opponent.isGhostOpponent
        ? extractGhostStoredLineupId(opponent.id)
        : null;

      if (storedLineupId) {
        void submitGhostMatchOutcome({
          storedLineupId,
          mode,
          challengerPlayerId: playerId,
          challengerTeamName: user.name,
          challengerWon: userWon,
          challengerElo: challengerEloBefore,
          userScore: userScore.total,
          opponentScore: opponentScore.total,
        });
      }

      void submitStoredLineup({
        mode,
        playerId,
        teamName: user.name,
        lineup: user.lineup.filter((id): id is string => Boolean(id)),
        elo: user.salaryCapMode
          ? ensureCurrentRankedSeason().elo
          : RANKED_STARTING_ELO,
      });
    }
  }, [
    collection,
    matchId,
    matchRecordMode,
    matchResult,
    onCollectionChange,
    opponent.classicOpponentElo,
    opponent.id,
    opponent.isGhostOpponent,
    opponent.rankedOpponentElo,
    opponentScore.total,
    user.allTimeMode,
    user.lineup,
    user.name,
    user.practiceMode,
    user.salaryCapMode,
    userLineup.length,
    userScore.total,
    userWon,
  ]);

  useLayoutEffect(() => {
    if (achievementsCheckedRef.current || userLineup.length !== 5 || user.practiceMode) {
      return;
    }

    achievementsCheckedRef.current = true;
    const earned = checkLineupAchievements(
      userLineup,
      buildAchievementContext(userLineup, {
        hasSalaryCap: user.salaryCapLimit != null,
      }),
    );
    const { newlyUnlocked } = unlockAchievements(earned);
    setNewAchievementIds(newlyUnlocked);
  }, [user.practiceMode, userLineup, user.salaryCapLimit]);

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
            <p className="eyebrow">
              {user.practiceMode ? "Practice results" : "Matchup results"}
            </p>
            <h2 className="matchup-panel__title">
              {isTie
                ? "Match ended in a tie"
                : userWon
                  ? "You won the matchup"
                  : `${opponent.name} won the matchup`}
            </h2>
          </div>
          <p className="matchup-panel__meta">
            Margin {Math.abs(userScore.total - opponentScore.total)} • OVR{" "}
            {userScore.total} vs {opponentScore.total}
            {matchRecordMode === "ranked" && rankedOutcome && !user.practiceMode ? (
              <>
                {" "}
                • {formatRatingDelta(rankedOutcome.delta)} (
                {formatRatingPoints(rankedOutcome.elo)})
              </>
            ) : null}
          </p>
          {matchRecordMode === "ranked" && rankedOutcome && !user.practiceMode ? (
            <div className="matchup-panel__ranked">
              <RankedTierBadge
                tierLabel={rankedOutcome.tierLabel}
                elo={rankedOutcome.elo}
              />
              <p className="matchup-panel__ranked-note">
                Matched vs {formatRatingPoints(rankedOutcome.opponentElo)} opponent
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
              isWinner={matchResult === "loss"}
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
                disabled={isMatchmaking}
                onClick={() => void handleShareLineup()}
              >
                Share lineup
              </button>
              <button
                type="button"
                className="play-again-button"
                disabled={isMatchmaking}
                onClick={onPlayAgain}
              >
                {user.practiceMode ? "Practice again" : "Draft another team"}
              </button>
              <button
                type="button"
                className="play-again-button match-results__menu-button"
                disabled={isMatchmaking}
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
