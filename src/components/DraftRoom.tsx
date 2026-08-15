import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatSlotConstraint,
  type DraftSortMode,
} from "../lib/draft";
import { PlayerDraftStats } from "./PlayerDraftStats";
import { getPlayerPickShineClass } from "../lib/draftPickStyle";
import { getPickTimeLimitSeconds } from "../lib/match";
import {
  clearDraftDeadline,
  getSecondsUntilDeadline,
  loadDraftDeadline,
  saveDraftDeadline,
} from "../lib/draftTimer";
import { formatCompactPlayerName, formatPlayerPositions } from "../lib/playerPool";
import { getMatchRecordMode, loadPlayerRecord } from "../lib/playerRecord";
import {
  estimatePlayerSalary,
  formatSalary,
  getLineupSalaryTotal,
  getRemainingSalaryCap,
} from "../lib/salaryCap";
import {
  buildDraftCandidateList,
  getSalaryCapDraftOptions,
} from "../lib/salaryCapDraft";
import { getClassicProfileView } from "../lib/classicProfile";
import { getRankedProfileView } from "../lib/rankedProfile";
import {
  formatDailyDraftModeLabel,
  formatDailyDraftProductName,
} from "../lib/dailyDraftMode";
import { PRO_HEAD_TO_HEAD_LABEL, CLASSIC_HEAD_TO_HEAD_LABEL } from "../lib/modeLabels";
import { formatRatingPoints } from "../lib/rankedElo";
import type { Drafter, Player } from "../lib/types";
import { getMatchModeTheme, matchModeThemeClass } from "../lib/matchModeTheme";
import { getPlayerRarityBadgeItems } from "../lib/playerRarityBadges";
import { hasLimitedSampleSize } from "../lib/sampleSize";
import { PlayerRarityBadge } from "./PlayerRarityBadge";
import { LimitedSampleBadge } from "./LimitedSampleBadge";
import { PlayerTeamIcon } from "./PlayerTeamIcon";
import { TeamNameWithStreak } from "./TeamNameWithStreak";
import { EmptyState } from "./EmptyState";
import {
  formatDailyDraftPlayStreak,
  getDailyDraftPlayStreak,
} from "../lib/dailyDraftPlayStreak";
import { getDailyDateKey } from "../lib/dailyDraft";
import { isBannedRankedEventPlayer } from "../lib/competitivePlayerBans";

interface DraftRoomProps {
  drafter: Drafter;
  players: Player[];
  activeStep: number;
  draftSessionKey?: string | null;
  isDailyDraft?: boolean;
  dailyChallengeTitle?: string;
  dailyChallengeDescription?: string;
  /** Competitive modes: show banned players at the bottom, not pickable. */
  banRankedEventPlayers?: boolean;
  opponentName?: string | null;
  onPick: (slot: number, playerId: string) => void;
  onTimeout: (slot: number) => void;
}

export function DraftRoom({
  drafter,
  players,
  activeStep,
  draftSessionKey = null,
  isDailyDraft = false,
  dailyChallengeTitle,
  dailyChallengeDescription,
  banRankedEventPlayers = false,
  opponentName = null,
  onPick,
  onTimeout,
}: DraftRoomProps) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<DraftSortMode>(() =>
    isDailyDraft ? "alphabetical" : "points",
  );
  const [secondsLeft, setSecondsLeft] = useState(() =>
    getPickTimeLimitSeconds(isDailyDraft, drafter.salaryCapMode),
  );
  const pickTimeLimitSeconds = getPickTimeLimitSeconds(
    isDailyDraft,
    drafter.salaryCapMode,
  );
  const timeoutFiredRef = useRef(false);
  const playerPickListRef = useRef<HTMLDivElement | null>(null);

  const currentSlot = drafter.draftSlots[activeStep];
  const playerRecord = loadPlayerRecord(getMatchRecordMode(drafter));
  const isPracticeMode = Boolean(drafter.practiceMode);
  const dailyPlayStreak = isDailyDraft
    ? getDailyDraftPlayStreak(
        drafter.dailyDraftMode ?? "basic",
        getDailyDateKey(),
      )
    : null;
  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const pickedLineup = useMemo(
    () =>
      drafter.lineup
        .map((playerId) => (playerId ? playersById.get(playerId) : undefined))
        .filter((player): player is Player => Boolean(player)),
    [drafter.lineup, playersById],
  );
  const salaryCapLimit = drafter.salaryCapLimit;
  const hasSalaryCap = salaryCapLimit != null;
  const rankedProfile =
    !isPracticeMode && drafter.salaryCapMode && !drafter.eventId
      ? getRankedProfileView()
      : null;
  const classicProfile =
    !isPracticeMode && hasSalaryCap && !drafter.salaryCapMode && !drafter.eventId
      ? getClassicProfileView()
      : null;
  const salaryCapOptions = useMemo(
    () =>
      getSalaryCapDraftOptions(
        drafter.lineup,
        players,
        activeStep,
        drafter.draftSlots.length,
        salaryCapLimit,
        drafter.draftSlots,
      ),
    [
      activeStep,
      drafter.draftSlots,
      drafter.lineup,
      players,
      salaryCapLimit,
    ],
  );
  const pickedIds = useMemo(
    () =>
      new Set(
        drafter.lineup.filter((playerId): playerId is string =>
          Boolean(playerId),
        ),
      ),
    [drafter.lineup],
  );
  const picksByIndex = useMemo(() => {
    const picks = new Map<number, Player>();

    drafter.lineup.forEach((playerId, index) => {
      if (!playerId) {
        return;
      }

      const player = playersById.get(playerId);

      if (player) {
        picks.set(index, player);
      }
    });

    return picks;
  }, [drafter.lineup, playersById]);

  const candidates = useMemo(() => {
    if (!currentSlot) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const listed = buildDraftCandidateList(
      players,
      currentSlot,
      pickedIds,
      salaryCapOptions,
      sortMode,
    ).map((entry) => {
      const banned =
        banRankedEventPlayers && isBannedRankedEventPlayer(entry.player);
      return {
        ...entry,
        banned,
        affordable: banned ? false : entry.affordable,
      };
    });

    const ordered = banRankedEventPlayers
      ? [
          ...listed.filter((entry) => !entry.banned),
          ...listed.filter((entry) => entry.banned),
        ]
      : listed;

    if (!normalizedQuery) {
      return ordered;
    }

    return ordered.filter(({ player }) =>
      `${player.name} ${player.team}`.toLowerCase().includes(normalizedQuery),
    );
  }, [
    banRankedEventPlayers,
    currentSlot,
    pickedIds,
    players,
    query,
    salaryCapOptions,
    sortMode,
  ]);

  const affordableCandidateCount = useMemo(
    () => candidates.filter((entry) => entry.affordable).length,
    [candidates],
  );

  useEffect(() => {
    setQuery("");
    setSecondsLeft(pickTimeLimitSeconds);
    timeoutFiredRef.current = false;
    // Reset the pick list so each new slot starts from the top of the pool.
    playerPickListRef.current?.scrollTo({ top: 0 });
  }, [activeStep, currentSlot?.division, currentSlot?.position, pickTimeLimitSeconds]);

  useEffect(() => {
    if (!currentSlot || drafter.lineup.length >= drafter.draftSlots.length) {
      return;
    }

    if (drafter.lineup[activeStep]) {
      return;
    }

    if (!draftSessionKey) {
      return;
    }

    let deadlineMs = loadDraftDeadline(draftSessionKey, activeStep);

    if (deadlineMs == null) {
      deadlineMs = Date.now() + pickTimeLimitSeconds * 1000;
      saveDraftDeadline(draftSessionKey, activeStep, deadlineMs);
    }

    const syncTimer = () => {
      const remaining = getSecondsUntilDeadline(deadlineMs!);
      setSecondsLeft(remaining);

      if (remaining <= 0 && !timeoutFiredRef.current) {
        timeoutFiredRef.current = true;
        clearDraftDeadline(draftSessionKey, activeStep);
        onTimeout(activeStep);
      }
    };

    syncTimer();
    const interval = window.setInterval(syncTimer, 250);
    const handleResume = () => syncTimer();

    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
    };
  }, [
    activeStep,
    currentSlot,
    draftSessionKey,
    drafter.draftSlots.length,
    drafter.lineup,
    onTimeout,
    pickTimeLimitSeconds,
  ]);

  if (!currentSlot) {
    return null;
  }

  const timerClass =
    secondsLeft <= 5 ? "draft-timer urgent" : "draft-timer";
  const totalPicks = drafter.draftSlots.length;
  const modeTheme = getMatchModeTheme({
    isDailyDraft,
    salaryCapMode: drafter.salaryCapMode,
    allTimeMode: drafter.allTimeMode,
    practiceMode: drafter.practiceMode,
    eventId: drafter.eventId,
  });

  return (
    <section
      className={`panel panel--compact draft-room draft-room--focused ${matchModeThemeClass(modeTheme)}`}
      aria-labelledby="draft-heading"
    >
      {isDailyDraft && dailyChallengeTitle ? (
        <div className="daily-draft-banner" role="status">
          <p className="eyebrow">
            {formatDailyDraftProductName(drafter.dailyDraftMode ?? "basic")}
          </p>
          <h3 className="daily-draft-banner__title">{dailyChallengeTitle}</h3>
          {dailyChallengeDescription ? (
            <p className="daily-draft-banner__goal">{dailyChallengeDescription}</p>
          ) : null}
          <p className="daily-draft-banner__note">
            Player stats are hidden. Draft from memory.
          </p>
        </div>
      ) : null}

      {hasSalaryCap ? (
        <div className="salary-cap-banner salary-cap-banner--compact" role="status">
          <div className="salary-cap-banner__topline">
            <p className="eyebrow">
              {isPracticeMode
                ? "Practice mode"
                : drafter.eventId
                  ? "Weekly Event"
                  : drafter.salaryCapMode
                    ? `${PRO_HEAD_TO_HEAD_LABEL} • ${rankedProfile?.tier.label ?? "Pro"}`
                    : `${CLASSIC_HEAD_TO_HEAD_LABEL} • ${classicProfile?.tier.label ?? "Casual"}`}
            </p>
            {isPracticeMode ? (
              <p className="salary-cap-banner__rating">Bot · no rating change</p>
            ) : drafter.eventId ? (
              <p className="salary-cap-banner__rating">Shared board</p>
            ) : rankedProfile ? (
              <p className="salary-cap-banner__rating">
                {formatRatingPoints(rankedProfile.elo)}
              </p>
            ) : classicProfile ? (
              <p className="salary-cap-banner__rating">
                {formatRatingPoints(classicProfile.elo)}
              </p>
            ) : null}
          </div>
          <p className="salary-cap-banner__cap">
            <span className="salary-cap-banner__spent">
              {formatSalary(getLineupSalaryTotal(pickedLineup))}
            </span>{" "}
            spent ·{" "}
            <span className="salary-cap-banner__remaining">
              {formatSalary(getRemainingSalaryCap(pickedLineup, salaryCapLimit))}
            </span>{" "}
            left of {formatSalary(salaryCapLimit)}
          </p>
        </div>
      ) : null}

      {drafter.allTimeMode ? (
        <div className="all-time-banner" role="status">
          <p className="eyebrow">All-Time Draft</p>
          <p>Today&apos;s NBA plus legendary All-Stars from every era are in this draft pool.</p>
        </div>
      ) : null}

      <div className="draft-page-header">
        <p className="eyebrow">
          {isDailyDraft ? (
            <span className="team-name-with-streak">
              <span className="team-name-with-streak__name">{drafter.name}</span>
              {dailyPlayStreak && dailyPlayStreak.current > 0 ? (
                <span
                  className="daily-draft-play-streak"
                  title={`${formatDailyDraftModeLabel(drafter.dailyDraftMode ?? "basic")} consecutive days played`}
                >
                  {formatDailyDraftPlayStreak(dailyPlayStreak)}
                </span>
              ) : null}
            </span>
          ) : (
            <TeamNameWithStreak
              name={drafter.name}
              winStreak={isPracticeMode ? 0 : playerRecord.winStreak}
              lossStreak={isPracticeMode ? 0 : playerRecord.lossStreak}
            />
          )}
        </p>
        {opponentName ? (
          <p className="draft-page-header__matchup">vs {opponentName}</p>
        ) : null}
      </div>

      <div
        className="draft-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalPicks}
        aria-valuenow={activeStep + 1}
        aria-label={`Draft progress, pick ${activeStep + 1} of ${totalPicks}`}
      >
        {Array.from({ length: totalPicks }, (_, index) => {
          const player = picksByIndex.get(index);
          const slot = drafter.draftSlots[index];
          const status =
            index < activeStep
              ? "complete"
              : index === activeStep
                ? "active"
                : "upcoming";

          return (
            <div
              key={`draft-progress-${index}`}
              className={`draft-progress__slot draft-progress__slot--${status}`}
              aria-label={
                player
                  ? `Pick ${index + 1}: ${player.name}, ${player.position}`
                  : `Pick ${index + 1}: ${slot?.position ?? "upcoming"}`
              }
            >
              {player ? (
                <>
                  <span className="draft-progress__name">
                    {formatCompactPlayerName(player.name)}
                  </span>
                  <span className="draft-progress__position">
                    {player.position}
                  </span>
                </>
              ) : (
                <span className="draft-progress__slot-label">
                  {slot?.position ?? index + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="draft-prompt draft-prompt--compact">
        <div className="draft-prompt__header">
          <div className="draft-prompt__copy">
            <div className="draft-prompt__topline">
              <p className="draft-prompt__eyebrow">On the clock</p>
              <div className={timerClass} aria-live="polite">
                <span>{secondsLeft}s</span>
                <small>left</small>
              </div>
            </div>
            <h3 id="draft-heading" className="draft-prompt__title">
              {formatSlotConstraint(currentSlot)}
            </h3>
            <p className="draft-prompt__eligible">
              {hasSalaryCap && candidates.length > affordableCandidateCount
                ? `${affordableCandidateCount} affordable · ${candidates.length - affordableCandidateCount} over cap`
                : `${affordableCandidateCount} ${
                    affordableCandidateCount === 1 ? "player" : "players"
                  } available`}
            </p>
          </div>
        </div>
      </div>

      <div className="draft-pool-toolbar">
        <label className="field stats-search draft-pool-toolbar__search">
          <span>Search players for this slot</span>
          <input
            type="search"
            value={query}
            placeholder="Search by name or team"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="field draft-pool-toolbar__sort">
          <span>Sort by</span>
          <select
            value={sortMode}
            aria-label="Sort draft pool"
            onChange={(event) =>
              setSortMode(event.target.value as DraftSortMode)
            }
          >
            <option value="points">Points</option>
            <option value="alphabetical">Name</option>
            <option value="salary">Salary</option>
          </select>
        </label>
      </div>

      <div
        ref={playerPickListRef}
        className="player-pick-list"
        role="listbox"
        aria-label="Eligible players"
      >
        {candidates.length > 0 ? (
          candidates.map(({ player, affordable, banned }) => {
            const playerSalary = hasSalaryCap ? estimatePlayerSalary(player) : 0;
            const remainingSalary =
              hasSalaryCap && salaryCapLimit != null
                ? getRemainingSalaryCap(pickedLineup, salaryCapLimit)
                : null;
            const overage =
              remainingSalary != null
                ? Math.max(0, playerSalary - remainingSalary)
                : 0;
            const disabledReason = banned
              ? "Banned from Casual H2H, Pro, and Events"
              : !affordable
                ? overage > 0
                  ? `Over by ${formatSalary(overage)}`
                  : "Over the remaining salary cap for this pick"
                : null;
            const shineClass = affordable && !banned
              ? getPlayerPickShineClass(player)
              : "";
            const showTags =
              !banned &&
              (hasLimitedSampleSize(player) ||
                getPlayerRarityBadgeItems(player, {
                  allTimeMode: drafter.allTimeMode,
                }).length > 0);
            const pickDisabled = !affordable || banned;

            return (
              <button
                type="button"
                key={player.id}
                disabled={pickDisabled}
                aria-disabled={pickDisabled}
                aria-label={`${player.name}, ${player.team}, ${formatPlayerPositions(player.positions)}${
                  disabledReason ? `. Disabled: ${disabledReason}` : ""
                }`}
                title={
                  disabledReason ?? undefined
                }
                className={`player-pick player-pick--compact${isDailyDraft ? " player-pick--daily" : ""}${shineClass ? ` ${shineClass}` : ""}${
                  banned
                    ? " player-pick--banned"
                    : affordable
                      ? ""
                      : " player-pick--unaffordable"
                }`}
                onClick={(event) => {
                  if (pickDisabled) {
                    return;
                  }
                  if (draftSessionKey) {
                    clearDraftDeadline(draftSessionKey, activeStep);
                  }
                  onPick(activeStep, player.id);
                  setQuery("");
                  event.currentTarget.blur();
                }}
              >
                <PlayerTeamIcon
                  team={player.team}
                  position={player.position}
                  jerseyNumber={player.jerseyNumber}
                  bbrPlayerId={player.bbrPlayerId}
                  showJersey
                  label={player.name}
                />
                <div className="player-pick__body">
                  <div className="player-pick__header">
                    <span className="player-pick__identity">
                      <strong className="player-pick__name">{player.name}</strong>
                      <span className="player-pick__team">
                        {player.team} · {formatPlayerPositions(player.positions)}
                      </span>
                    </span>
                    {banned ? (
                      <span className="player-pick__banned-label">Banned</span>
                    ) : hasSalaryCap ? (
                      <span className="player-pick__salary">
                        {formatSalary(playerSalary)}
                        {!affordable ? (
                          <span className="player-pick__over-cap">
                            {overage > 0
                              ? `Over by ${formatSalary(overage)}`
                              : "Over cap"}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                  {!isDailyDraft ? (
                    <PlayerDraftStats player={player} variant="pills" />
                  ) : null}
                  {showTags ? (
                    <span className="player-pick__badges">
                      <LimitedSampleBadge player={player} compact />
                      <PlayerRarityBadge
                        player={player}
                        allTimeMode={drafter.allTimeMode}
                        compact
                      />
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })
        ) : (
          <EmptyState
            variant="draft"
            message="No eligible players for this slot. The timer will auto-fill your remaining picks when it runs out."
          />
        )}
      </div>
    </section>
  );
}
