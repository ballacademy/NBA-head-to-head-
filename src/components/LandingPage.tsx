import { useEffect, useMemo, useRef, useState } from "react";
import {
  completeUnlock,
  getCollectionProgress,
  type PlayerCollection,
} from "../lib/playerCollection";
import { PlayerUnlockModal } from "./PlayerUnlockModal";
import { getDailyDateKey } from "../lib/dailyDraft";
import { getPlayerDailyDraftEntry } from "../lib/dailyDraftScores";
import {
  ALL_TIME_WIN_THRESHOLD,
  getAllTimeWinsRemaining,
  isAllTimeModeUnlocked,
} from "../lib/eraUnlocks";
import { getLegendPlayerCount } from "../lib/eraPlayers";
import {
  formatPlayerRecord,
  formatWinPercentage,
  shouldShowWinPercentage,
  type PlayerRecord,
} from "../lib/playerRecord";
import { RANKED_SALARY_CAP } from "../lib/salaryCap";
import {
  loadTeamProfile,
  normalizeTeamProfile,
  type TeamProfile,
} from "../lib/teamProfile";
import { LossStreakBadge } from "./LossStreakBadge";
import { WinStreakBadge } from "./WinStreakBadge";
import { hasLossStreakBadge } from "../lib/lossStreak";
import { hasFireStreak } from "../lib/winStreak";
import type { DailyDraftChallenge } from "../lib/dailyDraft";
import type { StartDraftOptions } from "../lib/match";

interface LandingPageProps {
  collection: PlayerCollection;
  dailyChallenge: DailyDraftChallenge;
  playerRecord: PlayerRecord;
  onStartDraft: (
    team: TeamProfile,
    options?: StartDraftOptions,
  ) => boolean;
  onCollectionChange: (collection: PlayerCollection) => void;
  onViewStats: () => void;
  onViewAchievements: () => void;
  onViewLeaderboard: () => void;
}

function MatchModeRecord({ record }: { record: PlayerRecord }) {
  return (
    <div className="landing-mode-card__record-block">
      <p className="landing-mode-card__record">
        <span className="landing-mode-card__record-label">Record</span>
        <span className="landing-mode-card__record-value">
          {formatPlayerRecord(record)}
          {hasFireStreak(record.winStreak) ? (
            <WinStreakBadge winStreak={record.winStreak} />
          ) : null}
          {!hasFireStreak(record.winStreak) &&
          hasLossStreakBadge(record.lossStreak) ? (
            <LossStreakBadge lossStreak={record.lossStreak} />
          ) : null}
        </span>
      </p>
      <p className="landing-mode-card__record-meta">
        {shouldShowWinPercentage(record)
          ? `${formatWinPercentage(record)} win rate`
          : `${record.wins + record.losses} games played`}
      </p>
    </div>
  );
}

export function LandingPage({
  collection,
  dailyChallenge,
  playerRecord,
  onStartDraft,
  onCollectionChange,
  onViewStats,
  onViewAchievements,
  onViewLeaderboard,
}: LandingPageProps) {
  const [name, setName] = useState(() => loadTeamProfile()?.name ?? "");
  const [error, setError] = useState("");
  const [showUnlockModal, setShowUnlockModal] = useState(
    () => Boolean(collection.pendingUnlock),
  );
  const teamFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (collection.pendingUnlock) {
      setShowUnlockModal(true);
    }
  }, [collection.pendingUnlock]);

  const collectionProgress = getCollectionProgress(collection);
  const allTimeUnlocked = isAllTimeModeUnlocked(playerRecord);
  const allTimeWinsRemaining = getAllTimeWinsRemaining(playerRecord);
  const legendCount = getLegendPlayerCount();
  const dailyDateKey = getDailyDateKey();
  const dailyEntry = useMemo(
    () => getPlayerDailyDraftEntry(dailyDateKey, dailyChallenge.id),
    [dailyChallenge.id, dailyDateKey],
  );

  const handleUnlockSelect = (playerId: string) => {
    const next = completeUnlock(playerId, collection);
    onCollectionChange(next);
    setShowUnlockModal(false);
  };

  const handleStart = (options?: StartDraftOptions) => {
    if (collection.pendingUnlock) {
      setShowUnlockModal(true);
      return;
    }

    let team = normalizeTeamProfile(name);

    if (!team) {
      const savedTeam = loadTeamProfile();

      if (savedTeam) {
        setName(savedTeam.name);
        team = savedTeam;
      }
    }

    if (!team) {
      setError("Enter a team name to start drafting.");
      teamFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setError("");
    const started = onStartDraft(team, options);

    if (!started) {
      setError("Couldn't start this draft. Refresh the page and try again.");
    }
  };

  return (
    <section className="landing panel landing--rich">
      {showUnlockModal && collection.pendingUnlock ? (
        <PlayerUnlockModal
          offer={collection.pendingUnlock}
          onSelect={handleUnlockSelect}
        />
      ) : null}

      <div className="landing__glow" aria-hidden="true" />

      <p className="eyebrow landing__eyebrow">Draft Day GM</p>
      <h1>Draft your five. Win your way.</h1>
      <p className="landing__lede">
        Pick a mode below, name your team, and draft your five against the
        competition.
      </p>

      <div
        ref={teamFormRef}
        className="landing-team-form landing-card landing-card--form"
      >
        <label className="field">
          <span>Team name</span>
          <input
            type="text"
            value={name}
            placeholder="e.g. Bulls"
            onChange={(event) => {
              setName(event.target.value);
              if (error) {
                setError("");
              }
            }}
          />
        </label>

        <p className="landing-team-form__note">
          Your team name is saved for future drafts. You can change it here
          anytime before you start.
        </p>

        {error ? <p className="form-error">{error}</p> : null}
      </div>

      <div className="landing-game-modes">
        <div className="daily-draft-card landing-card landing-card--daily landing-card--mode">
          <p className="eyebrow">Daily Draft</p>
          <h2 className="daily-draft-card__title">{dailyChallenge.title}</h2>
          <p className="daily-draft-card__description">{dailyChallenge.description}</p>
          <p className="daily-draft-card__meta">
            Same goal for everyone today. Player stats stay hidden while you draft.
          </p>
          <div className="landing-mode-card__record-block">
            <p className="landing-mode-card__record">
              <span className="landing-mode-card__record-label">Today</span>
              <span className="landing-mode-card__record-value landing-mode-card__record-value--daily">
                {dailyEntry?.formattedResult ?? "—"}
              </span>
            </p>
            <p className="landing-mode-card__record-meta">
              {dailyEntry ? "Daily draft completed" : "Not played yet today"}
            </p>
          </div>
          <button
            type="button"
            className="daily-draft-card__button"
            onClick={() => handleStart({ isDailyDraft: true })}
          >
            Play Today&apos;s Daily Draft
          </button>
        </div>

        <div className="head-to-head-card landing-card landing-card--mode">
          <p className="eyebrow">Head-to-Head</p>
          <h2 className="head-to-head-card__title">Compete Head-to-Head</h2>
          <p className="head-to-head-card__description">
            Draft a five-player lineup and face a random rival. Chemistry bonuses
            reward real-world connections like college teammates and brothers.
          </p>
          <MatchModeRecord record={playerRecord} />
          <button
            type="button"
            className="landing__primary-button"
            onClick={() => handleStart()}
          >
            Compete Head-to-Head
          </button>
        </div>

        <div className="ranked-cap-card landing-card landing-card--mode">
          <p className="eyebrow">Ranked</p>
          <h2 className="ranked-cap-card__title">Salary Cap Mode</h2>
          <p className="ranked-cap-card__description">
            Build under a ${(RANKED_SALARY_CAP / 1_000_000).toFixed(0)}M cap with
            real 2025-26 salaries. Stack stars and you&apos;ll need minimum deals
            to finish your five.
          </p>
          <MatchModeRecord record={playerRecord} />
          <button
            type="button"
            className="ranked-cap-card__button"
            onClick={() => handleStart({ salaryCapMode: true })}
          >
            Play Ranked (Salary Cap)
          </button>
        </div>

        <div className="all-time-card landing-card landing-card--mode">
          <p className="eyebrow">All-Time</p>
          <h2 className="all-time-card__title">All-Time Draft</h2>
          <p className="all-time-card__description">
            Draft active stars at their peak seasons plus legendary All-Stars from every era.
            {allTimeUnlocked
              ? ` ${legendCount} legends available.`
              : ` ${allTimeWinsRemaining} more win${allTimeWinsRemaining === 1 ? "" : "s"} to unlock legends.`}
          </p>
          <MatchModeRecord record={playerRecord} />
          {allTimeUnlocked ? (
            <button
              type="button"
              className="all-time-card__button"
              onClick={() => handleStart({ allTimeMode: true })}
            >
              Play All-Time Draft
            </button>
          ) : (
            <button
              type="button"
              className="all-time-card__button all-time-card__button--locked"
              disabled
            >
              Achieve {ALL_TIME_WIN_THRESHOLD} wins to unlock all-time legend mode
            </button>
          )}
        </div>
      </div>

      <div className="hero-actions landing__actions landing__actions--secondary">
        <button type="button" className="ghost-link" onClick={onViewLeaderboard}>
          Leaderboard
        </button>
        <button type="button" className="ghost-link" onClick={onViewStats}>
          View season stats
        </button>
        <button type="button" className="ghost-link" onClick={onViewAchievements}>
          Badges
        </button>
      </div>

      <div className="collection-progress-card landing-card landing-card--collection">
        <p className="eyebrow">Your stars &amp; scrubs</p>
        <div className="collection-progress-card__split">
          <div className="collection-progress-card__column">
            <span className="collection-progress-card__label">All-Stars</span>
            <span className="collection-progress-card__value">
              {collectionProgress.unlocked}/{collectionProgress.total}
            </span>
          </div>
          <div className="collection-progress-card__column">
            <span className="collection-progress-card__label">Superstars</span>
            <span className="collection-progress-card__value collection-progress-card__value--superstar">
              {collectionProgress.superstarUnlocked}/{collectionProgress.superstarTotal}
            </span>
          </div>
          <div className="collection-progress-card__column">
            <span className="collection-progress-card__label">Recent All-Stars</span>
            <span className="collection-progress-card__value collection-progress-card__value--recent">
              {collectionProgress.recentUnlocked}/{collectionProgress.recentTotal}
            </span>
          </div>
          <div className="collection-progress-card__column">
            <span className="collection-progress-card__label">Scrubs</span>
            <span className="collection-progress-card__value collection-progress-card__value--scrubs">
              {collectionProgress.unlockedScrubs}/{collectionProgress.scrubPool}
            </span>
          </div>
          <div className="collection-progress-card__column">
            <span className="collection-progress-card__label">Super Scrubs</span>
            <span className="collection-progress-card__value collection-progress-card__value--super-scrubs">
              {collectionProgress.unlockedSuperScrubs}/{collectionProgress.superScrubPool}
            </span>
          </div>
        </div>
        <p className="collection-progress-card__meta">
          Win to unlock more stars, lose to unlock scrubs.
        </p>
      </div>

      <p className="landing-credit">Created by BALLACADEMY</p>
    </section>
  );
}
