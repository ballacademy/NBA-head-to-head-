import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { RankedTierBadge } from "./RankedTierBadge";
import { TeamLineupCard } from "./TeamLineupCard";
import { GmIdentityBadge } from "./GmIdentityBadge";
import { GmProfileModal } from "./GmProfileModal";
import { PlayerUnlockModal } from "./PlayerUnlockModal";
import { AchievementToast } from "./AchievementToast";
import {
  getMatchRecordMode,
  formatPlayerRecord,
  loadPlayerRecord,
} from "../lib/playerRecord";
import {
  completeUnlock,
  countUnlockedAllStars,
  dismissPendingUnlock,
  processMatchUnlock,
  type PlayerCollection,
} from "../lib/playerCollection";
import { formatOpponentDisplayName } from "../lib/opponentDisplayName";
import { canOpenOpponentGmProfile } from "../lib/opponentGmProfile";
import { persistMatchOutcome, projectRecordAfterMatch } from "../lib/matchOutcome";
import { rememberCommunityShareable } from "../lib/communityShareables";
import {
  CLASSIC_HEAD_TO_HEAD_LABEL,
  PRO_HEAD_TO_HEAD_LABEL,
} from "../lib/modeLabels";
import {
  extractGhostStoredLineupId,
  submitGhostMatchOutcome,
  submitStoredLineup,
} from "../lib/ghostMatchmaking";
import { canStoreLineupForMatchmaking } from "../lib/storedLineups";
import { getLineupSalaryTotal } from "../lib/salaryCap";
import { getOrCreatePlayerIdentity, derivePublicTag } from "../lib/playerIdentity";
import { ensureClassicProfile } from "../lib/classicProfile";
import { ensureCurrentRankedSeason } from "../lib/rankedProfile";
import { formatRatingDelta, formatRatingPoints } from "../lib/rankedElo";
import type { RankedMatchOutcome } from "../lib/matchOutcome";
import {
  calculateLineupScore,
  formatLineupOvrDisplay,
  formatProjectedSeasonRecord,
  resolveHeadToHeadResult,
} from "../lib/scoring";
import {
  buildAchievementContext,
  checkLineupAchievements,
  unlockAchievements,
} from "../lib/achievements";
import { saveLineupShareCard } from "../lib/lineupShareCard";
import { isShareDismissalError } from "../lib/appErrors";
import { trackProductEvent } from "../lib/productAnalytics";
import { confirmRemoteLeaderboardRank } from "../lib/leaderboardRemote";
import { getMatchModeTheme, matchModeThemeClass } from "../lib/matchModeTheme";
import {
  loadEventProfile,
  persistEventMatchOutcome,
  type EventProfile,
} from "../lib/eventProfile";
import { submitEventLeaderboardEntry } from "../lib/eventLeaderboard";
import {
  formatEventBadgeLabel,
  getCurrentWeeklyEvent,
  type EventBadgeTier,
} from "../lib/weeklyEvents";
import type { Drafter, Player } from "../lib/types";
import { players as allPlayers } from "../data/players";

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
  startMatchError?: string | null;
  opponentAutoDrafted?: boolean;
  matchmakingNotice?: string | null;
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
  startMatchError = null,
  opponentAutoDrafted = false,
  matchmakingNotice = null,
}: MatchResultsProps) {
  const recordedRef = useRef(false);
  const achievementsCheckedRef = useRef(false);
  const [matchCollection, setMatchCollection] =
    useState<PlayerCollection>(collection);
  const [actionsReady, setActionsReady] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
  const [rankedOutcome, setRankedOutcome] = useState<RankedMatchOutcome | null>(null);
  const [classicOutcome, setClassicOutcome] = useState<RankedMatchOutcome | null>(null);
  const [confirmedLeaderboardRank, setConfirmedLeaderboardRank] = useState<
    number | null
  >(null);
  const [eventProfile, setEventProfile] = useState<EventProfile | null>(() =>
    user.eventId ? loadEventProfile(user.eventId) : null,
  );
  const [newEventBadges, setNewEventBadges] = useState<EventBadgeTier[]>([]);
  const [opponentProfileOpen, setOpponentProfileOpen] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "busy" | "error">(
    "idle",
  );
  const [ghostOutcomeFailed, setGhostOutcomeFailed] = useState(false);
  const [ghostOutcomeRetryBusy, setGhostOutcomeRetryBusy] = useState(false);
  const [eventLeaderboardSyncFailed, setEventLeaderboardSyncFailed] =
    useState(false);
  const [eventLeaderboardRetryBusy, setEventLeaderboardRetryBusy] =
    useState(false);
  const ghostOutcomeSubmissionRef = useRef<{
    storedLineupId: string;
    mode: "classic" | "ranked";
    challengerPlayerId: string;
    challengerTeamName: string;
    challengerWon: boolean;
    challengerElo: number;
    userScore: number;
    opponentScore: number;
    challengerLineup: string[];
  } | null>(null);
  const applyGhostCompetitiveOutcomeRef = useRef<(() => void) | null>(null);
  const eventLeaderboardSubmissionRef = useRef<{
    event: NonNullable<ReturnType<typeof getCurrentWeeklyEvent>>;
    teamName: string;
    profile: EventProfile;
  } | null>(null);
  const userScore = calculateLineupScore(userLineup);
  const opponentScore = calculateLineupScore(opponentLineup);
  const matchResult = resolveHeadToHeadResult(
    userScore.uncappedTotal,
    opponentScore.uncappedTotal,
  );
  const isTie = matchResult === "tie";
  const userWon = matchResult === "win";
  const isEventMatch = Boolean(user.eventId);
  const matchRecordMode = getMatchRecordMode(user);
  const modeTheme = getMatchModeTheme(user);
  const updatedRecord = useMemo(() => {
    if (isEventMatch && eventProfile) {
      return {
        playerId: getOrCreatePlayerIdentity().playerId,
        wins: eventProfile.wins,
        losses: eventProfile.losses,
        ties: eventProfile.ties,
        winStreak: eventProfile.winStreak,
        lossStreak: eventProfile.lossStreak,
      };
    }

    return projectRecordAfterMatch(
      matchResult,
      matchRecordMode,
      loadPlayerRecord(matchRecordMode),
    );
  }, [eventProfile, isEventMatch, matchRecordMode, matchResult]);

  useLayoutEffect(() => {
    if (recordedRef.current) {
      return;
    }

    recordedRef.current = true;

    const skipCompetitiveRecords = Boolean(
      user.practiceMode || user.privateMatch,
    );
    const lineupsComplete =
      userLineup.length === 5 && opponentLineup.length === 5;

    if (lineupsComplete) {
      const modeLabel = user.eventId
        ? "Weekly Event"
        : user.salaryCapMode
          ? PRO_HEAD_TO_HEAD_LABEL
          : user.practiceMode
            ? "Practice"
            : CLASSIC_HEAD_TO_HEAD_LABEL;
      rememberCommunityShareable({
        kind: "matchup",
        modeLabel,
        result: matchResult,
        userTeam: user.name,
        opponentTeam: formatOpponentDisplayName(
          opponent.name,
          opponent.username,
        ),
        userOvr: userScore.total,
        opponentOvr: opponentScore.total,
        userLineupNames: userLineup.map((player) => player.name),
        opponentLineupNames: opponentLineup.map((player) => player.name),
        userLineupIds: userLineup.map((player) => player.id),
        userAccent: user.accent,
        userRecord: formatProjectedSeasonRecord(userScore.projectedRecord),
        userWinRecord: skipCompetitiveRecords
          ? undefined
          : formatPlayerRecord(updatedRecord),
        ovrOverflow: userScore.ovrOverflow,
        savedAt: new Date().toISOString(),
      });
    }

    if (!skipCompetitiveRecords && lineupsComplete) {
      if (user.eventId) {
        const before = loadEventProfile(user.eventId);
        const nextProfile = persistEventMatchOutcome(
          user.eventId,
          matchResult,
          matchId,
        );
        setEventProfile(nextProfile);
        setNewEventBadges(
          nextProfile.badges.filter((badge) => !before.badges.includes(badge)),
        );

        const event = getCurrentWeeklyEvent(allPlayers);
        if (event && event.id === user.eventId) {
          eventLeaderboardSubmissionRef.current = {
            event,
            teamName: user.name,
            profile: nextProfile,
          };
          void submitEventLeaderboardEntry({
            event,
            teamName: user.name,
            profile: nextProfile,
          }).then((ok) => {
            if (!ok) {
              setEventLeaderboardSyncFailed(true);
            }
          });
        }

        const next = processMatchUnlock(matchResult, matchId, collection);
        setMatchCollection(next);
        onCollectionChange(next);
        setActionsReady(true);
        return;
      }

      const opponentElo = opponent.rankedOpponentElo ?? opponent.classicOpponentElo;
      const rankedEloBefore = ensureCurrentRankedSeason().elo;
      const classicEloBefore = ensureClassicProfile().elo;
      const mode = user.salaryCapMode ? "ranked" : "classic";
      const playerId = getOrCreatePlayerIdentity().playerId;
      const challengerEloBefore = user.salaryCapMode
        ? rankedEloBefore
        : classicEloBefore;
      const storedLineupId = opponent.isGhostOpponent
        ? extractGhostStoredLineupId(opponent.id)
        : null;
      const starCount = countUnlockedAllStars(collection);

      const applyLocalCompetitiveOutcome = () => {
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

        if (outcome.classic) {
          setClassicOutcome(outcome.classic);
        }

        const banners = outcome.ranked ?? outcome.classic;
        if (banners) {
          const identity = getOrCreatePlayerIdentity();
          void confirmRemoteLeaderboardRank({
            mode: matchRecordMode === "ranked" ? "ranked" : "classic",
            playerId: identity.playerId,
            teamName: user.name,
            publicTag: identity.publicTag,
            elo: banners.elo,
            wins: banners.wins,
            losses: banners.losses,
            winStreak: banners.winStreak,
            lossStreak: banners.lossStreak,
          }).then((rank) => {
            if (rank != null) {
              setConfirmedLeaderboardRank(rank);
            }
          });
        }

        const next = processMatchUnlock(matchResult, matchId, collection);
        setMatchCollection(next);
        onCollectionChange(next);
      };
      applyGhostCompetitiveOutcomeRef.current = applyLocalCompetitiveOutcome;

      const storeChallengerLineup = () => {
        if (
          !canStoreLineupForMatchmaking({
            ...user,
            players: userLineup,
          })
        ) {
          return;
        }

        void submitStoredLineup({
          mode,
          playerId,
          teamName: user.name,
          lineup: user.lineup.filter((id): id is string => Boolean(id)),
          elo: challengerEloBefore,
          awaitingLive: false,
          salaryTotal: getLineupSalaryTotal(userLineup),
          starCount,
        });
      };

      if (
        storedLineupId &&
        canStoreLineupForMatchmaking({
          ...user,
          players: userLineup,
        })
      ) {
        const submission = {
          storedLineupId,
          mode: mode as "classic" | "ranked",
          challengerPlayerId: playerId,
          challengerTeamName: user.name,
          challengerWon: userWon,
          challengerElo: challengerEloBefore,
          userScore: userScore.uncappedTotal,
          opponentScore: opponentScore.uncappedTotal,
          challengerLineup: user.lineup.filter(
            (id): id is string => Boolean(id),
          ),
        };
        ghostOutcomeSubmissionRef.current = submission;

        void submitGhostMatchOutcome(submission).then((ok) => {
          if (!ok) {
            setGhostOutcomeFailed(true);
            setActionsReady(true);
            return;
          }

          // Only count the match locally after the owner result is persisted.
          applyLocalCompetitiveOutcome();
          storeChallengerLineup();
          setActionsReady(true);
        });
        return;
      }

      applyLocalCompetitiveOutcome();
      storeChallengerLineup();
    }

    setActionsReady(true);
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
    opponentScore.uncappedTotal,
    user.allTimeMode,
    user.eventId,
    user.lineup,
    user.name,
    user.practiceMode,
    user.privateMatch,
    user.salaryCapMode,
    userLineup,
    userScore.uncappedTotal,
    userWon,
  ]);

  useLayoutEffect(() => {
    if (
      achievementsCheckedRef.current ||
      userLineup.length !== 5 ||
      user.practiceMode ||
      user.privateMatch
    ) {
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
  }, [user.practiceMode, user.privateMatch, userLineup, user.salaryCapLimit]);

  const handleUnlockSelect = (playerId: string) => {
    const next = completeUnlock(playerId, matchCollection);
    setMatchCollection(next);
    onCollectionChange(next);
    setShowUnlockModal(false);
  };

  const handleUnlockDismiss = () => {
    const next = dismissPendingUnlock(matchCollection);
    setMatchCollection(next);
    onCollectionChange(next);
    setShowUnlockModal(false);
  };

  const retryGhostOutcome = async () => {
    const submission = ghostOutcomeSubmissionRef.current;
    if (!submission || ghostOutcomeRetryBusy) {
      return;
    }

    setGhostOutcomeRetryBusy(true);
    const ok = await submitGhostMatchOutcome(submission);
    if (ok) {
      applyGhostCompetitiveOutcomeRef.current?.();
      setGhostOutcomeFailed(false);
    } else {
      setGhostOutcomeFailed(true);
    }
    setGhostOutcomeRetryBusy(false);
  };

  const retryEventLeaderboardSync = async () => {
    const submission = eventLeaderboardSubmissionRef.current;
    if (!submission || eventLeaderboardRetryBusy) {
      return;
    }

    setEventLeaderboardRetryBusy(true);
    const ok = await submitEventLeaderboardEntry(submission);
    setEventLeaderboardSyncFailed(!ok);
    setEventLeaderboardRetryBusy(false);
  };

  const handleShareLineup = async () => {
    if (shareState === "busy") {
      return;
    }

    setShareState("busy");

    try {
      await saveLineupShareCard({
        teamName: user.name,
        accent: user.accent,
        ovr: userScore.total,
        ovrOverflow: userScore.ovrOverflow,
        lineup: userLineup,
        record: formatProjectedSeasonRecord(userScore.projectedRecord),
      });
      trackProductEvent("share_lineup", {
        surface: "match_results",
      });
      setShareState("idle");
    } catch (error) {
      if (isShareDismissalError(error)) {
        setShareState("idle");
        return;
      }

      setShareState("error");
      window.setTimeout(() => setShareState("idle"), 3000);
    }
  };

  const hasPendingUnlock = Boolean(matchCollection.pendingUnlock);
  const showCompetitiveStreak =
    !user.practiceMode && !user.privateMatch;

  const unlockButtonLabel =
    matchCollection.pendingUnlock?.kind === "loss"
      ? "New Scrub unlocked — choose one"
      : "New star unlocked — click to choose";
  const playerIdentity = getOrCreatePlayerIdentity();
  const opponentProfileId =
    opponent.profilePlayerId ?? opponent.liveOpponentPlayerId ?? null;
  const opponentProfileMode: "classic" | "ranked" = user.salaryCapMode
    ? "ranked"
    : "classic";
  const canOpenOpponentProfile = canOpenOpponentGmProfile({
    profilePlayerId: opponentProfileId,
    practiceMode: user.practiceMode,
    eventId: user.eventId,
  });
  const openOpponentProfile = () => setOpponentProfileOpen(true);
  const competitiveOutcome =
    !user.practiceMode && !user.privateMatch
      ? matchRecordMode === "ranked"
        ? rankedOutcome
        : matchRecordMode === "headToHead" && !isEventMatch
          ? classicOutcome
          : null
      : null;

  return (
    <section
      className={`match-results match-results--compact ${matchModeThemeClass(modeTheme)}`}
    >
      {showUnlockModal && matchCollection.pendingUnlock ? (
        <PlayerUnlockModal
          offer={matchCollection.pendingUnlock}
          onSelect={handleUnlockSelect}
          onDismiss={handleUnlockDismiss}
        />
      ) : null}

      {opponentProfileOpen && opponentProfileId && canOpenOpponentProfile ? (
        <GmProfileModal
          playerId={opponentProfileId}
          name={opponent.name}
          publicTag={derivePublicTag(opponentProfileId)}
          username={opponent.username}
          wins={0}
          losses={0}
          elo={opponent.rankedOpponentElo ?? opponent.classicOpponentElo}
          profileMode={opponentProfileMode}
          onClose={() => setOpponentProfileOpen(false)}
        />
      ) : null}

      <AchievementToast achievementIds={newAchievementIds} />

      <div className="panel panel--compact matchup-panel">
        <div className="matchup-panel__banner">
          <div>
            <p className="eyebrow">
              {user.practiceMode
                ? "Practice results"
                : user.privateMatch
                  ? "Private match results"
                  : isEventMatch
                    ? "Event results"
                    : "Matchup results"}
            </p>
            <h2 className="matchup-panel__title">
              {isTie
                ? "Match ended in a tie"
                : userWon
                  ? "You won the matchup"
                  : canOpenOpponentProfile
                    ? (
                      <>
                        <button
                          type="button"
                          className="matchup-panel__opponent-link"
                          onClick={openOpponentProfile}
                        >
                          {formatOpponentDisplayName(
                            opponent.name,
                            opponent.username,
                          )}
                        </button>{" "}
                        won the matchup
                      </>
                      )
                    : `${formatOpponentDisplayName(opponent.name, opponent.username)} won the matchup`}
            </h2>
            {opponentAutoDrafted ? (
              <p className="matchup-panel__autodraft-note">
                Opponent timed out — their lineup was auto-drafted.
              </p>
            ) : null}
          </div>
          <ul className="matchup-panel__facts" aria-label="Match facts">
            <li className="matchup-panel__fact">
              <span className="matchup-panel__fact-label">Margin</span>
              <span className="matchup-panel__fact-value">
                {Math.abs(
                  userScore.uncappedTotal - opponentScore.uncappedTotal,
                ).toFixed(1)}
              </span>
            </li>
            <li className="matchup-panel__fact">
              <span className="matchup-panel__fact-label">OVR</span>
              <span className="matchup-panel__fact-value">
                {formatLineupOvrDisplay(userScore)}–{formatLineupOvrDisplay(opponentScore)}
              </span>
            </li>
            {competitiveOutcome ? (
              <li className="matchup-panel__fact">
                <span className="matchup-panel__fact-label">Rating</span>
                <span className="matchup-panel__fact-value">
                  {formatRatingDelta(competitiveOutcome.delta)} (
                  {formatRatingPoints(competitiveOutcome.elo)})
                </span>
              </li>
            ) : null}
            {isEventMatch && eventProfile ? (
              <li className="matchup-panel__fact">
                <span className="matchup-panel__fact-label">Event</span>
                <span className="matchup-panel__fact-value">
                  {eventProfile.wins}-{eventProfile.losses} (
                  {eventProfile.matchesPlayed}/30)
                </span>
              </li>
            ) : null}
            {confirmedLeaderboardRank != null && confirmedLeaderboardRank > 0 ? (
              <li className="matchup-panel__fact">
                <span className="matchup-panel__fact-label">Board</span>
                <span className="matchup-panel__fact-value">
                  #{confirmedLeaderboardRank}
                </span>
              </li>
            ) : null}
          </ul>
          {userScore.ovrOverflow > 0 ||
          opponentScore.ovrOverflow > 0 ||
          (userScore.total === opponentScore.total && !isTie) ? (
            <p className="matchup-panel__meta-note">
              {userScore.total === opponentScore.total && !isTie
                ? `Decided by uncapped OVR (${userScore.uncappedTotal.toFixed(1)} vs ${opponentScore.uncappedTotal.toFixed(1)}).`
                : null}
              {userScore.ovrOverflow > 0 || opponentScore.ovrOverflow > 0
                ? `${userScore.total === opponentScore.total && !isTie ? " " : ""}Overflow past 100 still counts.`
                : null}
            </p>
          ) : null}
          {competitiveOutcome ? (
            <div className="matchup-panel__ranked">
              <RankedTierBadge
                tierLabel={competitiveOutcome.tierLabel}
                elo={competitiveOutcome.elo}
              />
              <p className="matchup-panel__ranked-note">
                Matched vs {formatRatingPoints(competitiveOutcome.opponentElo)}{" "}
                opponent
              </p>
            </div>
          ) : null}
          {isEventMatch && newEventBadges.length > 0 ? (
            <p className="matchup-panel__event-badges">
              New event badge
              {newEventBadges.length > 1 ? "s" : ""}:{" "}
              {newEventBadges.map((badge) => formatEventBadgeLabel(badge)).join(", ")}
            </p>
          ) : null}
          <p className="matchup-panel__identity">
            <span className="matchup-panel__identity-label">GM code</span>
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
              showStreak={showCompetitiveStreak}
              showScoreContext
              compact
            />
          </div>

          <div className="matchup-panel__team matchup-panel__team--opponent">
            <TeamLineupCard
              drafter={opponent}
              lineup={opponentLineup}
              score={opponentScore}
              isWinner={matchResult === "loss"}
              showScoreContext
              compact
              onNameClick={
                canOpenOpponentProfile ? openOpponentProfile : undefined
              }
            />
          </div>
        </div>
      </div>

      {actionsReady ? (
        <div className="panel panel--compact match-results__actions">
          {matchmakingNotice ? (
            <p className="match-results__matchmaking-notice" role="status">
              {matchmakingNotice}
            </p>
          ) : null}
          {startMatchError ? (
            <p className="form-error" role="alert">
              {startMatchError}
            </p>
          ) : null}
          {ghostOutcomeFailed ? (
            <p className="form-error" role="alert">
              Couldn&apos;t report this result to the queued owner.{" "}
              <button
                type="button"
                className="daily-draft-results__sync-retry"
                disabled={ghostOutcomeRetryBusy}
                onClick={() => void retryGhostOutcome()}
              >
                {ghostOutcomeRetryBusy ? "Retrying…" : "Retry"}
              </button>
            </p>
          ) : null}
          {eventLeaderboardSyncFailed ? (
            <p className="form-error" role="alert">
              Event standings sync failed.{" "}
              <button
                type="button"
                className="daily-draft-results__sync-retry"
                disabled={eventLeaderboardRetryBusy}
                onClick={() => void retryEventLeaderboardSync()}
              >
                {eventLeaderboardRetryBusy ? "Retrying…" : "Retry sync"}
              </button>
            </p>
          ) : null}
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
              <div className="match-results__action-row match-results__action-row--unlock">
                <button
                  type="button"
                  className="secondary-button match-results__share-button"
                  disabled={isMatchmaking || shareState === "busy"}
                  onClick={() => void handleShareLineup()}
                >
                  {shareState === "busy"
                    ? "Sharing…"
                    : shareState === "error"
                      ? "Share failed — try again"
                      : "Share lineup"}
                </button>
                <button
                  type="button"
                  className="secondary-button match-results__menu-button"
                  disabled={isMatchmaking}
                  onClick={onReturnToMenu}
                >
                  Back to home
                </button>
              </div>
            </>
          ) : (
            <div className="match-results__action-row">
              <button
                type="button"
                className="play-again-button match-results__primary-action"
                disabled={isMatchmaking}
                onClick={() => {
                  void onPlayAgain();
                }}
              >
                {user.practiceMode
                  ? "Practice again"
                  : user.privateMatch
                    ? "Private match again"
                    : user.eventId
                      ? "Play event again"
                      : "Draft another team"}
              </button>
              <button
                type="button"
                className="secondary-button match-results__share-button"
                disabled={isMatchmaking || shareState === "busy"}
                onClick={() => void handleShareLineup()}
              >
                {shareState === "busy"
                  ? "Sharing…"
                  : shareState === "error"
                    ? "Share failed — try again"
                    : "Share lineup"}
              </button>
              <button
                type="button"
                className="secondary-button match-results__menu-button"
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
