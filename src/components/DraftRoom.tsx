import { useEffect, useMemo, useRef, useState } from "react";
import {
  filterPlayersForSlot,
  formatSlotConstraint,
  sortDraftCandidates,
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
import { getSalaryCapDraftOptions } from "../lib/salaryCapDraft";
import { getRankedProfileView } from "../lib/rankedProfile";
import { formatDailyDraftModeLabel } from "../lib/dailyDraftMode";
import { PRO_HEAD_TO_HEAD_LABEL, CLASSIC_HEAD_TO_HEAD_LABEL } from "../lib/modeLabels";
import { formatRatingPoints } from "../lib/rankedElo";
import type { Drafter, Player } from "../lib/types";
import { getMatchModeTheme, matchModeThemeClass } from "../lib/matchModeTheme";
import { PlayerRarityBadge } from "./PlayerRarityBadge";
import { LimitedSampleBadge } from "./LimitedSampleBadge";
import { PlayerTeamIcon } from "./PlayerTeamIcon";
import { TeamNameWithStreak } from "./TeamNameWithStreak";
import {
  formatDailyDraftPlayStreak,
  getDailyDraftPlayStreak,
} from "../lib/dailyDraftPlayStreak";
import { getDailyDateKey } from "../lib/dailyDraft";

interface DraftRoomProps {
  drafter: Drafter;
  players: Player[];
  activeStep: number;
  draftSessionKey?: string | null;
  isDailyDraft?: boolean;
  dailyChallengeTitle?: string;
  dailyChallengeDescription?: string;
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
  onPick,
  onTimeout,
}: DraftRoomProps) {
  const [query, setQuery] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(() =>
    getPickTimeLimitSeconds(isDailyDraft, drafter.salaryCapMode),
  );
  const pickTimeLimitSeconds = getPickTimeLimitSeconds(
    isDailyDraft,
    drafter.salaryCapMode,
  );
  const timeoutFiredRef = useRef(false);

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
    !isPracticeMode && drafter.salaryCapMode ? getRankedProfileView() : null;
  const isClassicHeadToHead =
    hasSalaryCap && !drafter.salaryCapMode && !isPracticeMode;
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
    const filtered = sortDraftCandidates(
      filterPlayersForSlot(players, currentSlot, pickedIds, salaryCapOptions),
      isDailyDraft ? "alphabetical" : "points",
    );

    if (!normalizedQuery) {
      return filtered;
    }

    return filtered.filter((player) =>
      `${player.name} ${player.team}`.toLowerCase().includes(normalizedQuery),
    );
  }, [currentSlot, isDailyDraft, pickedIds, players, query, salaryCapOptions]);

  useEffect(() => {
    setQuery("");
    setSecondsLeft(pickTimeLimitSeconds);
    timeoutFiredRef.current = false;
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
  });

  return (
    <section
      className={`panel panel--compact draft-room draft-room--focused ${matchModeThemeClass(modeTheme)}`}
      aria-labelledby="draft-heading"
    >
      {isDailyDraft && dailyChallengeTitle ? (
        <div className="daily-draft-banner" role="status">
          <p className="eyebrow">
            {formatDailyDraftModeLabel(drafter.dailyDraftMode ?? "basic")} Daily Draft
          </p>
          <h3>{dailyChallengeTitle}</h3>
          {dailyChallengeDescription ? (
            <p>{dailyChallengeDescription}</p>
          ) : null}
          <p className="daily-draft-banner__note">
            Player stats are hidden. Draft from memory.
          </p>
        </div>
      ) : null}

      {hasSalaryCap ? (
        <div className="salary-cap-banner" role="status">
          <p className="eyebrow">
            {isPracticeMode
              ? "Practice mode"
              : drafter.salaryCapMode
                ? `${PRO_HEAD_TO_HEAD_LABEL} • ${rankedProfile?.tier.label ?? "Pro"}`
                : CLASSIC_HEAD_TO_HEAD_LABEL}
          </p>
          {isPracticeMode ? (
            <p className="salary-cap-banner__rating">
              Bot opponent • ratings do not change
            </p>
          ) : rankedProfile ? (
            <p className="salary-cap-banner__rating">
              {formatRatingPoints(rankedProfile.elo)}
            </p>
          ) : isClassicHeadToHead ? (
            <p className="salary-cap-banner__rating">Casual mode • no Banners</p>
          ) : null}
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
              {candidates.length}{" "}
              {candidates.length === 1 ? "player" : "players"} available
            </p>
          </div>
        </div>
      </div>

      <label className="field stats-search">
        <span>Search eligible players</span>
        <input
          type="search"
          value={query}
          placeholder="Search by name or team"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="player-pick-list" role="listbox" aria-label="Eligible players">
        {candidates.length > 0 ? (
          candidates.map((player) => {
            const shineClass = getPlayerPickShineClass(player);

            return (
              <button
                type="button"
                key={player.id}
                className={`player-pick player-pick--compact${shineClass ? ` ${shineClass}` : ""}`}
                onClick={(event) => {
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
                  showJersey
                  label={player.name}
                />
                <div className="player-pick__body">
                  <div className="player-pick__title-row">
                    <span className="player-pick__identity">
                      <strong className="player-pick__name">{player.name}</strong>
                      <span className="player-pick__team">
                        {player.team} · {formatPlayerPositions(player.positions)}
                      </span>
                    </span>
                    <span className="player-pick__trailing">
                      {hasSalaryCap ? (
                        <span className="player-pick__salary">
                          {formatSalary(estimatePlayerSalary(player))}
                        </span>
                      ) : null}
                      <span className="player-pick__badges">
                        <LimitedSampleBadge player={player} compact />
                        <PlayerRarityBadge
                          player={player}
                          allTimeMode={drafter.allTimeMode}
                          compact
                        />
                      </span>
                    </span>
                  </div>
                  {!isDailyDraft ? (
                    <PlayerDraftStats player={player} variant="pills" />
                  ) : null}
                </div>
              </button>
            );
          })
        ) : (
          <p className="draft-empty">
            No eligible players for this slot. The timer will auto-fill your
            remaining picks when it runs out.
          </p>
        )}
      </div>
    </section>
  );
}
