import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { RankedTierBadge } from "./RankedTierBadge";
import { MatchupCompareBoard } from "./MatchupCompareBoard";
import { GmIdentityBadge } from "./GmIdentityBadge";
import { GmProfileModal } from "./GmProfileModal";
import { PlayerUnlockModal } from "./PlayerUnlockModal";
import { AchievementToast } from "./AchievementToast";
import { InlineAlert } from "./InlineAlert";
import { PostGameNextActions } from "./PostGameNextActions";
import { forceUnlockBackgroundScroll } from "../hooks/useDialogA11y";
import {
  getMatchRecordMode,
  formatPlayerRecord,
  loadPlayerRecord,
  type PlayerRecord,
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
import {
  hasRecordedMatchId,
  persistMatchOutcome,
  resolveRecordForMatchDisplay,
} from "../lib/matchOutcome";
import {
  seasonStreaksForMatchDisplay,
  type SeasonBoardMode,
} from "../lib/seasonBoardRecord";
import { recordNbaPlayerMatchUsage } from "../lib/nbaPlayerUsage";
import {
  buildMatchupShareCardInputsFromAttachment,
  rememberCommunityShareable,
} from "../lib/communityShareables";
import {
  extractGhostStoredLineupId,
  submitGhostMatchOutcome,
  submitStoredLineup,
} from "../lib/ghostMatchmaking";
import { canStoreLineupForMatchmaking } from "../lib/storedLineups";
import { getLineupSalaryTotal } from "../lib/salaryCap";
import { getOrCreatePlayerIdentity, derivePublicTag } from "../lib/playerIdentity";
import { ensureClassicProfile } from "../lib/classicProfile";
import { loadAllTimeProfile } from "../lib/allTimeProfile";
import { ensureCurrentRankedSeason } from "../lib/rankedProfile";
import { formatRatingDelta, formatRatingPoints, getTierForElo } from "../lib/rankedElo";
import { logLiveMatchGameEntry, type MatchGameLogMatchup } from "../lib/matchGameLog";
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
  evaluateCareerProgressAchievements,
  unlockAchievements,
} from "../lib/achievements";
import { getCachedLinkedUsername, isPlayerAccountLinked } from "../lib/accountGate";
import { saveLineupShareCard, saveMatchupShareCard } from "../lib/lineupShareCard";
import { databasePlayersById } from "../lib/playerPool";
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
  getWeeklyEventForEventId,
  isCurrentEventId,
  type EventBadgeTier,
  type WeeklyEventDefinition,
} from "../lib/weeklyEvents";
import { MODE_COPY } from "../lib/modeCopy";
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
  onPostToCommunity?: () => void;
  onChallengeGm?: (
    mode: "classic" | "ranked",
    target?: { playerId: string; displayName?: string } | null,
  ) => void;
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
  onPostToCommunity,
  onChallengeGm,
  isMatchmaking = false,
  startMatchError = null,
  opponentAutoDrafted = false,
  matchmakingNotice = null,
}: MatchResultsProps) {
  // Nested PrivateMatchModal + MatchmakingOverlay locks can leave body/html
  // overflow stuck (or wheel preventDefault still attached). Clear before paint.
  useLayoutEffect(() => {
    forceUnlockBackgroundScroll();
  }, []);

  const recordedRef = useRef(false);
  const achievementsCheckedRef = useRef(false);
  const [matchCollection, setMatchCollection] =
    useState<PlayerCollection>(collection);
  const [ghostSubmitting, setGhostSubmitting] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
  const [rankedOutcome, setRankedOutcome] = useState<RankedMatchOutcome | null>(null);
  const [classicOutcome, setClassicOutcome] = useState<RankedMatchOutcome | null>(null);
  const [allTimeOutcome, setAllTimeOutcome] = useState<RankedMatchOutcome | null>(null);
  const [confirmedLeaderboardRank, setConfirmedLeaderboardRank] = useState<
    number | null
  >(null);
  const [eventProfile, setEventProfile] = useState<EventProfile | null>(() =>
    user.eventId ? loadEventProfile(user.eventId) : null,
  );
  const [persistedMatchRecord, setPersistedMatchRecord] =
    useState<PlayerRecord | null>(null);
  const [newEventBadges, setNewEventBadges] = useState<EventBadgeTier[]>([]);
  const [opponentProfileOpen, setOpponentProfileOpen] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "busy" | "error">(
    "idle",
  );
  const [shareWarning, setShareWarning] = useState<string | null>(null);
  const [ghostOutcomeFailed, setGhostOutcomeFailed] = useState(false);
  const [ghostOutcomeRetryBusy, setGhostOutcomeRetryBusy] = useState(false);
  const [eventLeaderboardSyncFailed, setEventLeaderboardSyncFailed] =
    useState(false);
  const [eventLeaderboardRetryBusy, setEventLeaderboardRetryBusy] =
    useState(false);
  const [leaderboardSyncFailed, setLeaderboardSyncFailed] = useState(false);
  const [leaderboardSyncRetryBusy, setLeaderboardSyncRetryBusy] =
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
    event: WeeklyEventDefinition;
    teamName: string;
    profile: EventProfile;
  } | null>(null);
  const leaderboardSyncParamsRef = useRef<{
    mode: "classic" | "ranked";
    playerId: string;
    teamName: string;
    publicTag: string;
    elo: number;
    wins: number;
    losses: number;
    winStreak: number;
    lossStreak: number;
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
  const resultModeLabel = user.eventId
    ? MODE_COPY.weeklyEvent.title
    : user.practiceMode
      ? MODE_COPY.practice.title
      : user.privateMatch
        ? "Private match"
        : user.allTimeMode
          ? MODE_COPY.allTime.title
          : user.salaryCapMode
            ? MODE_COPY.proH2h.title
            : MODE_COPY.classicH2h.title;
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

    if (persistedMatchRecord) {
      return persistedMatchRecord;
    }

    return resolveRecordForMatchDisplay(
      matchResult,
      matchId,
      matchRecordMode,
    );
  }, [
    eventProfile,
    isEventMatch,
    matchId,
    matchRecordMode,
    matchResult,
    persistedMatchRecord,
  ]);

  const seasonBoardMode: SeasonBoardMode | null =
    isEventMatch || user.practiceMode || user.privateMatch || user.allTimeMode
      ? null
      : matchRecordMode === "ranked"
        ? "ranked"
        : matchRecordMode === "headToHead"
          ? "classic"
          : null;
  const competitiveActionsLocked = ghostSubmitting || isMatchmaking;
  const queuedGhostPersistPending = Boolean(
    opponent.isGhostOpponent && extractGhostStoredLineupId(opponent.id),
  );

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

    const buildMatchupSnapshot = (
      username?: string,
    ): MatchGameLogMatchup | undefined => {
      if (!lineupsComplete) {
        return undefined;
      }
      return {
        modeLabel: resultModeLabel,
        userTeam: user.name,
        username,
        opponentTeam: formatOpponentDisplayName(
          opponent.name,
          opponent.username,
        ),
        userOvr: userScore.total,
        opponentOvr: opponentScore.total,
        userLineupNames: userLineup.map((player) => player.name),
        opponentLineupNames: opponentLineup.map((player) => player.name),
        userLineupIds: userLineup.map((player) => player.id),
        opponentLineupIds: opponentLineup.map((player) => player.id),
        userAccent: user.accent,
        opponentAccent: opponent.accent,
        userRecord: formatProjectedSeasonRecord(userScore.projectedRecord),
        userWinRecord: skipCompetitiveRecords
          ? undefined
          : formatPlayerRecord(updatedRecord),
        ovrOverflow: userScore.ovrOverflow,
        opponentOvrOverflow: opponentScore.ovrOverflow,
      };
    };

    if (lineupsComplete) {
      void (async () => {
        try {
          const playerId = getOrCreatePlayerIdentity().playerId;
          await isPlayerAccountLinked(playerId);
          const username = getCachedLinkedUsername(playerId) ?? undefined;
          const matchup = buildMatchupSnapshot(username);
          if (!matchup) {
            return;
          }
          rememberCommunityShareable({
            kind: "matchup",
            ...matchup,
            result: matchResult,
            savedAt: new Date().toISOString(),
          });
        } catch {
          // Never block match results on local shareable storage failures.
        }
      })();
    }

    if (!skipCompetitiveRecords && lineupsComplete) {
      if (user.eventId) {
        const before = loadEventProfile(user.eventId);
        const nextProfile = persistEventMatchOutcome(
          user.eventId,
          matchResult,
          matchId,
        );
        recordNbaPlayerMatchUsage({
          recordKey: matchId,
          playerIds: userLineup.map((player) => player.id),
          mode: "event",
          result: matchResult,
        });
        setEventProfile(nextProfile);
        setNewEventBadges(
          nextProfile.badges.filter((badge) => !before.badges.includes(badge)),
        );

        const event = getWeeklyEventForEventId(user.eventId, allPlayers);
        if (event && isCurrentEventId(user.eventId)) {
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
        logLiveMatchGameEntry({
          matchId,
          matchRecordMode,
          matchResult,
          opponentName: opponent.name,
          ownerScore: userScore.uncappedTotal,
          opponentScore: opponentScore.uncappedTotal,
          isEvent: true,
          matchup: buildMatchupSnapshot(
            getCachedLinkedUsername(getOrCreatePlayerIdentity().playerId) ??
              undefined,
          ),
        });
        return;
      }

      const opponentElo = opponent.rankedOpponentElo ?? opponent.classicOpponentElo;
      const rankedEloBefore = ensureCurrentRankedSeason().elo;
      const classicEloBefore = ensureClassicProfile().elo;
      const allTimeEloBefore = loadAllTimeProfile().elo;
      const mode = user.salaryCapMode ? "ranked" : "classic";
      const playerId = getOrCreatePlayerIdentity().playerId;
      const challengerEloBefore = user.allTimeMode
        ? allTimeEloBefore
        : user.salaryCapMode
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
        setPersistedMatchRecord(outcome.record);
        recordNbaPlayerMatchUsage({
          recordKey: matchId,
          playerIds: userLineup.map((player) => player.id),
          mode:
            matchRecordMode === "ranked"
              ? "ranked"
              : matchRecordMode === "allTime"
                ? "allTime"
                : "headToHead",
          result: matchResult,
        });

        if (outcome.ranked) {
          setRankedOutcome(outcome.ranked);
        }

        if (outcome.classic) {
          setClassicOutcome(outcome.classic);
        }

        if (outcome.allTime) {
          setAllTimeOutcome(outcome.allTime);
        }

        const banners = outcome.ranked ?? outcome.classic;
        if (banners) {
          const identity = getOrCreatePlayerIdentity();
          const syncParams = {
            mode: (matchRecordMode === "ranked" ? "ranked" : "classic") as
              | "classic"
              | "ranked",
            playerId: identity.playerId,
            teamName: user.name,
            publicTag: identity.publicTag,
            elo: banners.elo,
            wins: banners.wins,
            losses: banners.losses,
            winStreak: banners.winStreak,
            lossStreak: banners.lossStreak,
          };
          leaderboardSyncParamsRef.current = syncParams;
          void confirmRemoteLeaderboardRank(syncParams).then((result) => {
            if (result.ok) {
              if (result.rank != null) {
                setConfirmedLeaderboardRank(result.rank);
              }
              setLeaderboardSyncFailed(false);
              return;
            }
            if (result.reason === "submit-failed") {
              setLeaderboardSyncFailed(true);
            }
          });
        }

        logLiveMatchGameEntry({
          matchId,
          matchRecordMode,
          matchResult,
          opponentName: opponent.name,
          ownerScore: userScore.uncappedTotal,
          opponentScore: opponentScore.uncappedTotal,
          bannerDelta: banners?.delta,
          matchup: buildMatchupSnapshot(
            getCachedLinkedUsername(getOrCreatePlayerIdentity().playerId) ??
              undefined,
          ),
        });

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
        setGhostSubmitting(true);

        void submitGhostMatchOutcome(submission).then((ok) => {
          setGhostSubmitting(false);
          if (!ok) {
            setGhostOutcomeFailed(true);
            return;
          }

          // Only count the match locally after the owner result is persisted.
          applyLocalCompetitiveOutcome();
          storeChallengerLineup();
        });
        return;
      }

      applyLocalCompetitiveOutcome();
      storeChallengerLineup();
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
    resultModeLabel,
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
    const lineupUnlock = unlockAchievements(earned);
    const careerUnlock = evaluateCareerProgressAchievements();
    setNewAchievementIds([
      ...lineupUnlock.newlyUnlocked,
      ...careerUnlock.newlyUnlocked,
    ]);
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

  const retryLeaderboardSync = async () => {
    const params = leaderboardSyncParamsRef.current;
    if (!params || leaderboardSyncRetryBusy) {
      return;
    }

    setLeaderboardSyncRetryBusy(true);
    const result = await confirmRemoteLeaderboardRank(params);
    if (result.ok) {
      if (result.rank != null) {
        setConfirmedLeaderboardRank(result.rank);
      }
      setLeaderboardSyncFailed(false);
    } else if (result.reason === "submit-failed") {
      setLeaderboardSyncFailed(true);
    } else {
      setLeaderboardSyncFailed(false);
    }
    setLeaderboardSyncRetryBusy(false);
  };

  const handleShareLineup = async () => {
    if (shareState === "busy") {
      return;
    }

    setShareState("busy");

    try {
      const playerId = getOrCreatePlayerIdentity().playerId;
      await isPlayerAccountLinked(playerId);
      await saveLineupShareCard({
        teamName: user.name,
        username: getCachedLinkedUsername(playerId) ?? undefined,
        subhead: resultModeLabel,
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

  const handleShareMatchup = async () => {
    if (shareState === "busy" || userLineup.length !== 5 || opponentLineup.length !== 5) {
      return;
    }

    setShareState("busy");

    try {
      const playerId = getOrCreatePlayerIdentity().playerId;
      await isPlayerAccountLinked(playerId);
      const inputs = buildMatchupShareCardInputsFromAttachment(
        {
          kind: "matchup",
          modeLabel: resultModeLabel,
          result: matchResult,
          userTeam: user.name,
          username: getCachedLinkedUsername(playerId) ?? undefined,
          opponentTeam: formatOpponentDisplayName(
            opponent.name,
            opponent.username,
          ),
          userOvr: userScore.total,
          opponentOvr: opponentScore.total,
          userLineupNames: userLineup.map((player) => player.name),
          opponentLineupNames: opponentLineup.map((player) => player.name),
          userLineupIds: userLineup.map((player) => player.id),
          opponentLineupIds: opponentLineup.map((player) => player.id),
          userAccent: user.accent,
          opponentAccent: opponent.accent,
          userRecord: formatProjectedSeasonRecord(userScore.projectedRecord),
          ovrOverflow: userScore.ovrOverflow,
          opponentOvrOverflow: opponentScore.ovrOverflow,
          savedAt: new Date().toISOString(),
        },
        databasePlayersById,
      );
      if (!inputs) {
        throw new Error("Could not rebuild matchup image.");
      }
      await saveMatchupShareCard(inputs);
      trackProductEvent("share_matchup", {
        surface: "match_results",
      });
      setShareWarning(
        inputs.missingPlayerCount > 0
          ? `${inputs.missingPlayerCount} player${
              inputs.missingPlayerCount === 1 ? "" : "s"
            } missing from share image.`
          : null,
      );
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
  const shareButtonLabel =
    shareState === "error" ? "Share failed — try again" : "Share lineup";
  const shareMatchupButtonLabel =
    shareState === "error" ? "Share failed — try again" : "Share matchup";
  const playAgainLabel = user.practiceMode
    ? "Practice again"
    : user.privateMatch
      ? "Rematch"
      : user.eventId
        ? "Play event again"
        : "Draft another team";
  const playerIdentity = getOrCreatePlayerIdentity();
  const opponentProfileId =
    opponent.profilePlayerId ?? opponent.liveOpponentPlayerId ?? null;
  const opponentProfileMode: "classic" | "ranked" = user.salaryCapMode
    ? "ranked"
    : "classic";
  const opponentProfileElo =
    opponent.rankedOpponentElo ?? opponent.classicOpponentElo ?? undefined;
  const opponentProfileTierLabel =
    opponentProfileElo != null
      ? getTierForElo(opponentProfileElo).label
      : undefined;
  const canOpenOpponentProfile = canOpenOpponentGmProfile({
    profilePlayerId: opponentProfileId,
    practiceMode: user.practiceMode,
    eventId: user.eventId,
    allTimeMode: user.allTimeMode,
  });
  const openOpponentProfile = () => setOpponentProfileOpen(true);
  const challengeOpponentTarget = opponentProfileId
    ? {
        playerId: opponentProfileId,
        displayName: formatOpponentDisplayName(
          opponent.name,
          opponent.username,
        ),
      }
    : null;
  const startChallengeVsOpponent = () => {
    if (!onChallengeGm || !challengeOpponentTarget) {
      return;
    }
    onChallengeGm(opponentProfileMode, challengeOpponentTarget);
  };
  const competitiveOutcome =
    !user.practiceMode && !user.privateMatch
      ? matchRecordMode === "ranked"
        ? rankedOutcome
        : matchRecordMode === "allTime"
          ? allTimeOutcome
          : matchRecordMode === "headToHead" && !isEventMatch
            ? classicOutcome
            : null
      : null;

  /** Casual/Pro badges use monthly board streaks (same as Play cards + Ranks). */
  const displayStreaks = useMemo(() => {
    if (isEventMatch && eventProfile) {
      return {
        winStreak: eventProfile.winStreak,
        lossStreak: eventProfile.lossStreak,
      };
    }

    if (competitiveOutcome) {
      return {
        winStreak: competitiveOutcome.winStreak,
        lossStreak: competitiveOutcome.lossStreak,
      };
    }

    if (seasonBoardMode) {
      return seasonStreaksForMatchDisplay(seasonBoardMode, matchResult, {
        recorded: hasRecordedMatchId(matchId),
        persistPending: queuedGhostPersistPending,
      });
    }

    return {
      winStreak: updatedRecord.winStreak,
      lossStreak: updatedRecord.lossStreak,
    };
  }, [
    competitiveOutcome,
    eventProfile,
    isEventMatch,
    matchId,
    matchResult,
    queuedGhostPersistPending,
    seasonBoardMode,
    updatedRecord.lossStreak,
    updatedRecord.winStreak,
  ]);

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
          elo={opponentProfileElo}
          tierLabel={opponentProfileTierLabel}
          profileMode={opponentProfileMode}
          onClose={() => setOpponentProfileOpen(false)}
          onChallenge={
            onChallengeGm &&
            challengeOpponentTarget &&
            !user.practiceMode &&
            !user.eventId
              ? startChallengeVsOpponent
              : undefined
          }
        />
      ) : null}

      <AchievementToast achievementIds={newAchievementIds} />

      <div className="panel panel--compact matchup-panel">
        <div
          className={`matchup-panel__banner${
            isTie
              ? " matchup-panel__banner--tie"
              : userWon
                ? " matchup-panel__banner--win"
                : " matchup-panel__banner--loss"
          }`}
        >
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
                <span className="matchup-panel__fact-label">Rank</span>
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

        <div className="matchup-panel__compare">
          <MatchupCompareBoard
            user={user}
            opponent={opponent}
            userLineup={userLineup}
            opponentLineup={opponentLineup}
            userScore={userScore}
            opponentScore={opponentScore}
            userOutcome={isTie ? "tie" : userWon ? "win" : "loss"}
            opponentOutcome={isTie ? "tie" : userWon ? "loss" : "win"}
            winStreak={displayStreaks.winStreak}
            lossStreak={displayStreaks.lossStreak}
            showStreak={showCompetitiveStreak}
            onOpponentNameClick={
              canOpenOpponentProfile ? openOpponentProfile : undefined
            }
          />
        </div>
      </div>

      <div className="panel panel--compact match-results__actions">
          {ghostSubmitting ? (
            <p className="match-results__matchmaking-notice" role="status">
              Reporting result to the queued owner…
            </p>
          ) : null}
          {matchmakingNotice ? (
            <p className="match-results__matchmaking-notice" role="status">
              {matchmakingNotice}
            </p>
          ) : null}
          {shareWarning ? (
            <p className="match-results__matchmaking-notice" role="status">
              {shareWarning}
            </p>
          ) : null}
          {startMatchError ? (
            <InlineAlert message={startMatchError} />
          ) : null}
          {ghostOutcomeFailed ? (
            <InlineAlert
              message="Couldn't report this result to the queued owner."
              action={{
                label: "Retry",
                busyLabel: "Retrying…",
                busy: ghostOutcomeRetryBusy,
                onClick: () => void retryGhostOutcome(),
              }}
            />
          ) : null}
          {eventLeaderboardSyncFailed ? (
            <InlineAlert
              message="Event standings sync failed."
              action={{
                label: "Retry sync",
                busyLabel: "Retrying…",
                busy: eventLeaderboardRetryBusy,
                onClick: () => void retryEventLeaderboardSync(),
              }}
            />
          ) : null}
          {leaderboardSyncFailed ? (
            <InlineAlert
              message="Ranks sync failed. Your local record is saved."
              action={{
                label: "Retry sync",
                busyLabel: "Retrying…",
                busy: leaderboardSyncRetryBusy,
                onClick: () => void retryLeaderboardSync(),
              }}
            />
          ) : null}
          {hasPendingUnlock ? (
            <PostGameNextActions
              requiredMessage="Choose your unlocked player before drafting again."
              primary={{
                id: "unlock",
                label: unlockButtonLabel,
                onClick: () => setShowUnlockModal(true),
              }}
              secondary={[
                {
                  id: "share-matchup",
                  label: shareMatchupButtonLabel,
                  busyLabel: "Sharing…",
                  disabled: competitiveActionsLocked,
                  busy: shareState === "busy",
                  onClick: () => void handleShareMatchup(),
                },
                {
                  id: "share",
                  label: shareButtonLabel,
                  busyLabel: "Sharing…",
                  disabled: competitiveActionsLocked,
                  busy: shareState === "busy",
                  onClick: () => void handleShareLineup(),
                },
                ...(onPostToCommunity
                  ? [
                      {
                        id: "community",
                        label: "Post to Community",
                        disabled: competitiveActionsLocked,
                        onClick: onPostToCommunity,
                      },
                    ]
                  : []),
                {
                  id: "home",
                  label: "Back to Play",
                  disabled: ghostSubmitting,
                  onClick: onReturnToMenu,
                },
              ]}
            />
          ) : (
            <PostGameNextActions
              primary={{
                id: "play-again",
                label: playAgainLabel,
                disabled: competitiveActionsLocked,
                onClick: () => {
                  void onPlayAgain();
                },
              }}
              secondary={[
                {
                  id: "share-matchup",
                  label: shareMatchupButtonLabel,
                  busyLabel: "Sharing…",
                  disabled: competitiveActionsLocked,
                  busy: shareState === "busy",
                  onClick: () => void handleShareMatchup(),
                },
                {
                  id: "share",
                  label: shareButtonLabel,
                  busyLabel: "Sharing…",
                  disabled: competitiveActionsLocked,
                  busy: shareState === "busy",
                  onClick: () => void handleShareLineup(),
                },
                ...(onPostToCommunity
                  ? [
                      {
                        id: "community",
                        label: "Post to Community",
                        disabled: competitiveActionsLocked,
                        onClick: onPostToCommunity,
                      },
                    ]
                  : []),
                ...(onChallengeGm &&
                challengeOpponentTarget &&
                canOpenOpponentProfile &&
                !user.practiceMode &&
                !user.privateMatch &&
                !user.eventId
                  ? [
                      {
                        id: "challenge",
                        label: "Challenge this GM",
                        disabled: competitiveActionsLocked,
                        onClick: startChallengeVsOpponent,
                      },
                    ]
                  : []),
                {
                  id: "home",
                  label: "Back to Play",
                  // Keep hub exit available during rematch wait / matchmaking.
                  disabled: ghostSubmitting,
                  onClick: onReturnToMenu,
                },
              ]}
            />
          )}
        </div>
    </section>
  );
}
