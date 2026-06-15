import { useEffect, useState } from "react";
import {
  loadTeamProfile,
  normalizeTeamProfile,
  type TeamProfile,
} from "../lib/teamProfile";

interface LandingPageProps {
  onStartDraft: (team: TeamProfile) => void;
  onViewStats: () => void;
}

export function LandingPage({ onStartDraft, onViewStats }: LandingPageProps) {
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
    <section className="landing panel">
      <p className="eyebrow">NBA Head-to-Head</p>
      <h1>Draft your five. Beat a random rival.</h1>
      <p>
        Name your squad, then draft one player at a time under position and
        division rules. Your opponent stays hidden until the final matchup.
      </p>

      <div className="landing-team-form">
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

      <div className="hero-actions">
        <button type="button" onClick={handleSubmit}>
          Draft a team
        </button>
        <button type="button" className="ghost-link" onClick={onViewStats}>
          View season stats
        </button>
      </div>

      <ol className="landing-steps">
        <li>Name your team on the landing page</li>
        <li>Draft five players one pick at a time</li>
        <li>Reveal the hidden opponent in the final matchup</li>
      </ol>
    </section>
  );
}
