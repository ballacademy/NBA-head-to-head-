import { useEffect, useState } from "react";
import {
  getCollectionProgress,
  type PlayerCollection,
} from "../lib/playerCollection";
import {
  ERA_2010S_WIN_THRESHOLD,
  getEraProgress,
  getUnlockedEras,
  isAllTimeModeUnlocked,
} from "../lib/eraUnlocks";
import { getEraPlayerCount } from "../lib/eraPlayers";
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
  onStartDraft: (team: TeamProfile, options?: StartDraftOptions) => void;
  onViewStats: () => void;
  onViewAchievements: () => void;
  onViewLeaderboard: () => void;
}

export function LandingPage({
  collection,
  dailyChallenge,
  playerRecord,
  onStartDraft,
  onViewStats,
  onViewAchievements,
  onViewLeaderboard,
}: LandingPageProps) {
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedTeam = loadTeamProfile();

    if (savedTeam) {
      setCity(savedTeam.city);
      setName(savedTeam.name);
    }
  }, []);

  const collectionProgress = getCollectionProgress(collection);
  const eraProgress = getEraProgress(playerRecord);
  const unlockedEraCount = getUnlockedEras(playerRecord).length;
  const allTimeUnlocked = isAllTimeModeUnlocked(playerRecord);
  const allTimeWinsRemaining = Math.max(
    ERA_2010S_WIN_THRESHOLD - playerRecord.wins,
    0,
  );

  const handleStart = (options?: StartDraftOptions) => {
    const team = normalizeTeamProfile(city, name);

    if (!team) {
      setError("Enter both a city and team name to start drafting.");
      return;
    }

    setError("");
    onStartDraft(team, options);
  };

  return (
    <section className="landing panel landing--rich">
      <div className="landing__glow" aria-hidden="true" />

      <p className="eyebrow landing__eyebrow">NBA Head-to-Head</p>
      <h1>Draft your five. Win your way.</h1>
      <p className="landing__lede">
        Pick a mode below, name your team, and draft your five against the
        competition.
      </p>

      <div className="landing-team-form landing-card landing-card--form">
        <label className="field">
          <span>Team city</span>
          <input
            type="text"
            value={city}
            placeholder="e.g. Chicago"
            onChange={(event) => {
              setCity(event.target.value);
              if (error) {
                setError("");
              }
            }}
          />
        </label>

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
          <button
            type="button"
            className="daily-draft-card__button"
            onClick={() => handleStart({ isDailyDraft: true })}
          >
            Play Today&apos;s Daily Draft
          </button>
        </div>

        <div className="player-record-card landing-card landing-card--record landing-card--mode">
          <p className="eyebrow">Your head-to-head record</p>
          <p className="player-record-card__value">
            {formatPlayerRecord(playerRecord)}
            {hasFireStreak(playerRecord.winStreak) ? (
              <WinStreakBadge winStreak={playerRecord.winStreak} />
            ) : null}
            {!hasFireStreak(playerRecord.winStreak) &&
            hasLossStreakBadge(playerRecord.lossStreak) ? (
              <LossStreakBadge lossStreak={playerRecord.lossStreak} />
            ) : null}
          </p>
          <p className="player-record-card__meta">
            {shouldShowWinPercentage(playerRecord)
              ? `${formatWinPercentage(playerRecord)} win rate`
              : `${playerRecord.wins + playerRecord.losses} games played`}
          </p>
        </div>

        <div className="head-to-head-card landing-card landing-card--mode">
          <p className="eyebrow">Head-to-Head</p>
          <h2 className="head-to-head-card__title">Compete Head-to-Head</h2>
          <p className="head-to-head-card__description">
            Draft a five-player lineup and face a random rival. Chemistry bonuses
            reward real-world connections like college teammates and brothers.
          </p>
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
            Draft from today&apos;s NBA plus any unlocked era legends in one pool.
            {allTimeUnlocked
              ? ` ${unlockedEraCount} era${unlockedEraCount === 1 ? "" : "s"} currently available.`
              : ` ${allTimeWinsRemaining} more win${allTimeWinsRemaining === 1 ? "" : "s"} to unlock.`}
          </p>
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
              Achieve 50 wins to unlock all-time legend mode
            </button>
          )}
        </div>
      </div>

      <div className="era-progress-card landing-card">
        <p className="eyebrow">Eras &amp; Legends</p>
        <ul className="era-progress-card__list">
          {eraProgress.map((era) => (
            <li key={era.id}>
              <strong>{era.title}</strong>
              <span>
                {era.isUnlocked
                  ? `${getEraPlayerCount(era.id)} legends unlocked`
                  : `${era.winsRemaining} wins to unlock`}
              </span>
            </li>
          ))}
        </ul>
        <p className="era-progress-card__meta">
          Unlocked legends are only available in All-Time mode.
        </p>
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
        <p className="collection-progress-card__value">
          {collectionProgress.unlocked}/{collectionProgress.total} All-Stars •{" "}
          {collectionProgress.recentUnlocked}/{collectionProgress.recentTotal}{" "}
          Recent All-Stars • {collectionProgress.superstarUnlocked}/
          {collectionProgress.superstarTotal} Superstars
        </p>
        <p className="collection-progress-card__meta">
          {collectionProgress.unlockedScrubs}/{collectionProgress.scrubPool} Scrubs
          unlocked • Win to unlock more Stars, lose to unlock scrubs.
        </p>
      </div>

      <p className="landing-credit">Created by BALLACADEMY</p>
    </section>
  );
}
