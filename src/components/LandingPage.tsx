interface LandingPageProps {
  onStartDraft: () => void;
  onViewStats: () => void;
}

export function LandingPage({ onStartDraft, onViewStats }: LandingPageProps) {
  return (
    <section className="landing panel">
      <p className="eyebrow">NBA Head-to-Head</p>
      <h1>Draft your five. Beat a random rival.</h1>
      <p>
        You will be matched with a random opponent, then draft one player at a
        time under position and division rules. Each pick gets its own screen.
        You have 20 seconds per pick.
      </p>

      <div className="hero-actions">
        <button type="button" onClick={onStartDraft}>
          Draft a team
        </button>
        <button type="button" className="ghost-link" onClick={onViewStats}>
          View season stats
        </button>
      </div>

      <ol className="landing-steps">
        <li>Get queued against a random challenger</li>
        <li>Draft five players one pick at a time</li>
        <li>See the matchup once both teams are in</li>
      </ol>
    </section>
  );
}
