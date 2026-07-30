import {
  SALARIES_DATA_AS_OF_LABEL,
  STATS_DATA_AS_OF_LABEL,
  SUPPORT_EMAIL,
  buildBugReportMailto,
  buildSupportMailto,
} from "../lib/support";
import { ACTIVE_ROSTER_AS_OF_LABEL } from "../lib/playerPool";
import { HubFeatureReturnButton } from "./HubFeatureReturnButton";

interface BetaNotesPageProps {
  onBack: () => void;
}

export function BetaNotesPage({ onBack }: BetaNotesPageProps) {
  return (
    <div className="hub-feature beta-notes-page">
      <HubFeatureReturnButton onBack={onBack} />
      <div className="landing-hub__top">
        <h1 className="landing-hub__title">Beta notes</h1>
        <p className="landing__lede landing-hub__lede">
          What works, what doesn&apos;t, and how to reach us
        </p>
      </div>

      <section className="hub-feature__panel">
        <div className="legal-page__body beta-notes-body">
          <h2>What&apos;s live</h2>
          <ul>
            <li>Daily Draft (one attempt per day; Practice for extra runs)</li>
            <li>Classic H2H and Pro H2H ranked matchmaking</li>
            <li>Weekly Events (live opponents only)</li>
            <li>Collection, Badges, Leaderboards, and Stats</li>
            <li>Optional accounts for restoring a GM identity across devices</li>
          </ul>

          <h2>Known limits</h2>
          <ul>
            <li>
              <strong>Password reset</strong> is support-assisted: email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your
              username, get a one-time code, then use Account → Forgot password.
              New accounts require an email for recovery.
            </li>
            <li>
              <strong>Guest / local Collection</strong> stays on this device.
              Logging into an account on another browser restores online records
              but rebuilds on-device collection there.
            </li>
            <li>
              <strong>All-Time legends</strong> is coming soon — not part of this
              beta build.
            </li>
            <li>
              Roster teams as of {ACTIVE_ROSTER_AS_OF_LABEL}. Season stats as of{" "}
              {STATS_DATA_AS_OF_LABEL}. Salaries as of {SALARIES_DATA_AS_OF_LABEL}.
              A few players may still be missing salary rows until the next data
              pass.
            </li>
          </ul>

          <h2>Feedback &amp; bugs</h2>
          <p>
            Something broken, confusing, or unfair? Tell us the mode, what you
            tapped, and what you expected.
          </p>
          <div className="beta-notes-actions">
            <a
              className="landing__primary-button"
              href={buildSupportMailto({
                subject: "Draft Day GM beta feedback",
              })}
            >
              Send feedback
            </a>
            <a className="secondary-button" href={buildBugReportMailto()}>
              Report a bug
            </a>
          </div>
          <p>
            Or email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> anytime.
          </p>
        </div>
      </section>
    </div>
  );
}
