import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { RankedTierBadge } from "./RankedTierBadge";
import { TeamLineupCard } from "./TeamLineupCard";
import { GmIdentityBadge } from "./GmIdentityBadge";
import { GmProfileModal } from "./GmProfileModal";
import { PlayerUnlockModal } from "./PlayerUnlockModal";
import { AchievementToast } from "./AchievementToast";
import {
  getMatchRecordMode,
  loadPlayerRecord,
} from "../lib/playerRecord";
import {
  completeUnlock,
  countUnlockedAllStars,
  processMatchUnlock,
  type PlayerCollection,
} from "../lib/playerCollection";
import { formatOpponentDisplayName } from "../lib/opponentDisplayName";
import { canOpenOpponentGmProfile } from "../lib/opponentGmProfile";
import { persistMatchOutcome, projectRecordAfterMatch } from "../lib/matchOutcome";
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

    if (!skipCompetitiveRecords) {
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
          void submitEventLeaderboardEntry({
            event,
            teamName: user.name,
            profile: nextProfile,
          });
        }
      } else {
        const opponentElo = opponent.rankedOpponentElo ?? opponent.classicOpponentElo;
        const rankedEloBefore = ensureCurrentRankedSeason().elo;
        const classicEloBefore = ensureClassicProfile().elo;
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

        if (
          canStoreLineupForMatchmaking({
            ...user,
            players: userLineup,
          })
        ) {
          const mode = user.salaryCapMode ? "ranked" : "classic";
          const playerId = getOrCreatePlayerIdentity().playerId;
          const challengerEloBefore = user.salaryCapMode
            ? rankedEloBefore
            : classicEloBefore;
          const storedLineupId = opponent.isGhostOpponent
            ? extractGhostStoredLineupId(opponent.id)
            : null;
          const starCount = countUnlockedAllStars(collection);

          if (storedLineupId) {
            void submitGhostMatchOutcome({
              storedLineupId,
              mode,
              challengerPlayerId: playerId,
              challengerTeamName: user.name,
              challengerWon: userWon,
              challengerElo: challengerEloBefore,
              userScore: userScore.uncappedTotal,
              opponentScore: opponentScore.uncappedTotal,
              challengerLineup: user.lineup.filter(
                (id): id is string => Boolean(id),
              ),
            });
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
        }
      }

      const next = processMatchUnlock(matchResult, matchId, collection);
      setMatchCollection(next);
      onCollectionChange(next);
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
          </div>
          <p className="matchup-panel__meta">
            Margin{" "}
            {Math.abs(
              userScore.uncappedTotal - opponentScore.uncappedTotal,
            ).toFixed(1)}{" "}
            • OVR {formatLineupOvrDisplay(userScore)} vs{" "}
            {formatLineupOvrDisplay(opponentScore)}
            {userScore.ovrOverflow > 0 || opponentScore.ovrOverflow > 0
              ? " · overflow past 100 counts in matchups"
              : ""}
            {userScore.total === opponentScore.total && !isTie
              ? ` · decided by uncapped OVR (${userScore.uncappedTotal.toFixed(1)} vs ${opponentScore.uncappedTotal.toFixed(1)})`
              : ""}
            {isEventMatch && eventProfile
              ? ` · Event record ${eventProfile.wins}-${eventProfile.losses} (${eventProfile.matchesPlayed}/30)`
              : null}
            {((matchRecordMode === "ranked" && rankedOutcome) ||
              (matchRecordMode === "headToHead" && classicOutcome && !isEventMatch)) &&
            !user.practiceMode &&
            !user.privateMatch ? (
              <>
                {" "}
                •{" "}
                {formatRatingDelta(
                  (matchRecordMode === "ranked"
                    ? rankedOutcome
                    : classicOutcome)!.delta,
                )}{" "}
                (
                {formatRatingPoints(
                  (matchRecordMode === "ranked"
                    ? rankedOutcome
                    : classicOutcome)!.elo,
                )}
                )
              </>
            ) : null}
          </p>
          {((matchRecordMode === "ranked" && rankedOutcome) ||
            (matchRecordMode === "headToHead" && classicOutcome && !isEventMatch)) &&
          !user.practiceMode &&
          !user.privateMatch ? (
            <div className="matchup-panel__ranked">
              <RankedTierBadge
                tierLabel={
                  (matchRecordMode === "ranked"
                    ? rankedOutcome
                    : classicOutcome)!.tierLabel
                }
                elo={
                  (matchRecordMode === "ranked"
                    ? rankedOutcome
                    : classicOutcome)!.elo
                }
              />
              <p className="matchup-panel__ranked-note">
                Matched vs{" "}
                {formatRatingPoints(
                  (matchRecordMode === "ranked"
                    ? rankedOutcome
                    : classicOutcome)!.opponentElo,
                )}{" "}
                opponent
                {confirmedLeaderboardRank != null &&
                confirmedLeaderboardRank > 0
                  ? ` · Leaderboard #${confirmedLeaderboardRank}`
                  : null}
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
          {startMatchError ? (
            <p className="form-error" role="alert">
              {startMatchError}
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
            </>
          ) : (
            <div className="match-results__action-row">
              <button
                type="button"
                className="play-again-button match-results__share-button"
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
                className="play-again-button"
                disabled={isMatchmaking}
                onClick={() => {
                  void onPlayAgain();
                }}
              >
                {user.practiceMode
                  ? "Practice again"
                  : user.privateMatch
                    ? "Private match again"
                    : "Draft another team"}
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
