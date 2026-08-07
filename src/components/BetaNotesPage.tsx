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
      <div className="landing-hub__top">
        <h1 className="landing-hub__title">Beta notes</h1>
        <p className="landing__lede landing-hub__lede">Status and contact.</p>
      </div>

      <HubFeatureReturnButton onBack={onBack} />

      <section className="hub-feature__panel">
        <div className="legal-page__body beta-notes-body">
          <h2>What&apos;s live</h2>
          <ul>
            <li>
              <strong>Play hub</strong> — Daily Draft (one scored try per mode
              daily), Classic/Pro H2H, and weekly Events
            </li>
            <li>
              Collection, Badges, and Season Stats (Roster) · Leaderboards
              (Standings) · Tier Lists · Account
            </li>
            <li>
              <strong>Private match</strong> (Classic or Pro) — account holders
              create a room code and invite a friend for live H2H. Same draft
              rules as that mode; records, Banners, and badges do not change.
            </li>
            <li>
              <strong>Stored lineup results</strong> — when someone drafts
              against your queued lineup while you&apos;re away, that match still
              moves your Banners (and W–L). Win/loss streaks only change from
              matches you play live.
            </li>
            <li>
              Accounts required to appear on leaderboards or publish public tier
              lists (playing stays open to guests)
            </li>
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
              <strong>Guest / local progress</strong> — Collection unlocks sync
              to your account when signed in. Achievements stay on this device
              for now. Logging into an account on another browser restores
              online records and collection unlocks.
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

          <h2>Limited sample size</h2>
          <p>
            Players under <strong>35 games</strong> this season show a Limited
            sample badge in draft and stats. That flag is about the{" "}
            <em>current</em> season only — prior history does not remove it.
          </p>
          <ul>
            <li>
              <strong>Stat blend</strong> — If they have prior-season (or peak)
              production on file, the engine game-weights those numbers with
              current ones before scoring. Example: 5 games now + 70 prior →
              current stats count 5/75 and prior 70/75. Usage, defense grades,
              and play styles stay on the current row.
            </li>
            <li>
              <strong>Lineup weight</strong> — Limited players also pull less on
              lineup totals until their sample is trusted: with a prior, weight
              scales by (current + prior games) / 35; with no prior, by current
              games / 35 (floor 0.35). Full-sample players stay at weight 1.
            </li>
            <li>
              Both effects apply in every scored mode (Daily, Classic, Pro,
              Events). Draft boards sort limited-sample players below
              full-sample ones when other keys tie.
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
