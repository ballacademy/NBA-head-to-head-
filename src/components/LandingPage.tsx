import { useEffect, useState } from "react";
import {
  getCollectionProgress,
  type PlayerCollection,
} from "../lib/playerCollection";
import {
  formatPlayerRecord,
  formatWinPercentage,
  loadPlayerRecord,
  shouldShowWinPercentage,
} from "../lib/playerRecord";
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
  onStartDraft: (team: TeamProfile, options?: StartDraftOptions) => void;
  onViewStats: () => void;
  onViewLeaderboard: () => void;
}

export function LandingPage({
  collection,
  dailyChallenge,
  onStartDraft,
  onViewStats,
  onViewLeaderboard,
}: LandingPageProps) {
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [playerRecord, setPlayerRecord] = useState(loadPlayerRecord);

  useEffect(() => {
    const savedTeam = loadTeamProfile();

    if (savedTeam) {
      setCity(savedTeam.city);
      setName(savedTeam.name);
    }

    setPlayerRecord(loadPlayerRecord());
  }, []);

  const collectionProgress = getCollectionProgress(collection);

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
      <h1>Draft your five. Beat a random rival.</h1>
      <p className="landing__lede">
        Name your squad, draft a five-player lineup, and compete against a random
        rival from around the world.
      </p>

      <div className="landing-cards">
        <div className="collection-progress-card landing-card">
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

        <div className="player-record-card landing-card landing-card--record">
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
      </div>

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

      <div className="daily-draft-card landing-card">
        <p className="eyebrow">Daily Draft</p>
        <h2 className="daily-draft-card__title">{dailyChallenge.title}</h2>
        <p className="daily-draft-card__description">{dailyChallenge.description}</p>
        <p className="daily-draft-card__meta">
          Same challenge for everyone today. Share your emoji grid after the matchup.
        </p>
        <button
          type="button"
          className="daily-draft-card__button"
          onClick={() => handleStart({ isDailyDraft: true })}
        >
          Play today&apos;s Daily Draft
        </button>
      </div>

      <div className="hero-actions landing__actions">
        <button
          type="button"
          className="landing__primary-button"
          onClick={() => handleStart()}
        >
          Draft a team
        </button>
        <button type="button" className="ghost-link" onClick={onViewLeaderboard}>
          Leaderboard
        </button>
        <button type="button" className="ghost-link" onClick={onViewStats}>
          View season stats
        </button>
      </div>

      <ol className="landing-steps">
        <li>Name your team</li>
        <li>Draft your five-player lineup</li>
        <li>Face a random rival worldwide</li>
      </ol>

      <p className="landing-credit">Created by BALLACADEMY</p>
    </section>
  );
}
