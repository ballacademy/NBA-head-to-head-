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

interface LandingPageProps {
  collection: PlayerCollection;
  onStartDraft: (team: TeamProfile) => void;
  onViewStats: () => void;
  onViewLeaderboard: () => void;
}

export function LandingPage({
  collection,
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

  const handleSubmit = () => {
    const team = normalizeTeamProfile(city, name);

    if (!team) {
      setError("Enter both a city and team name to start drafting.");
      return;
    }

    setError("");
    onStartDraft(team);
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
          <p className="eyebrow">Your All-Star collection</p>
          <p className="collection-progress-card__value">
            {collectionProgress.unlocked}/{collectionProgress.total} All-Stars •{" "}
            {collectionProgress.recentUnlocked}/{collectionProgress.recentTotal}{" "}
            Recent All-Stars
          </p>
          <p className="collection-progress-card__meta">
            Win to unlock more Stars, lose to unlock scrubs.
          </p>
        </div>

        <div className="player-record-card landing-card landing-card--record">
          <p className="eyebrow">Your head-to-head record</p>
          <p className="player-record-card__value">
            {formatPlayerRecord(playerRecord)}
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

      <div className="hero-actions landing__actions">
        <button type="button" className="landing__primary-button" onClick={handleSubmit}>
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
