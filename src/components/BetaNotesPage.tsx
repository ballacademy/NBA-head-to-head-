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
        <p className="landing__lede landing-hub__lede">
          Live modes, known limits, and how to reach us.
        </p>
      </div>

      <HubFeatureReturnButton onBack={onBack} visible={false} />

      <section className="hub-feature__panel">
        <div className="legal-page__body beta-notes-body">
          <div className="beta-notes-summary">
            <p>
              Daily Draft, Casual/Pro H2H, and weekly Events are live. All-Time
              Draft is coming soon. Accounts unlock leaderboards and public
              tier lists. Roster, Badges, Stats, and Ranks sit in the bottom
              nav.
            </p>
            <p className="beta-notes-summary__meta">
              Roster as of {ACTIVE_ROSTER_AS_OF_LABEL} · Stats{" "}
              {STATS_DATA_AS_OF_LABEL} · Salaries {SALARIES_DATA_AS_OF_LABEL}
            </p>
          </div>

          <details className="beta-notes-details">
            <summary>What&apos;s live</summary>
            <ul>
              <li>
                <strong>Play hub</strong> — Daily Draft (one scored try per mode
                daily), Casual/Pro H2H, and weekly Events
              </li>
              <li>
                <strong>LeBron James</strong> is banned in Casual H2H, Pro H2H,
                and Events (salary / impact edge) — he still appears at the
                bottom of the draft board with a Banned label. Freely draftable
                in practice and Daily Draft without an All-Star unlock.
              </li>
              <li>
                Collection, Badges, and Season Stats (Roster) · Ranks ·
                Community · Account
              </li>
              <li>
                <strong>Private match</strong> (Casual or Pro) — account
                holders create a room code and invite a friend for live H2H.
                Same draft rules as that mode; records, Banners, and badges do
                not change.
              </li>
              <li>
                <strong>All-Time Draft</strong> — coming soon (peak seasons and
                era legends). Not playable in this beta build.
              </li>
              <li>
                <strong>Stored lineup results</strong> — when someone drafts
                against your queued lineup while you&apos;re away, that match
                still moves your Banners (and W–L). Win/loss streaks only change
                from matches you play live.
              </li>
              <li>
                Accounts required to appear on leaderboards or publish public
                tier lists (playing stays open to guests)
              </li>
            </ul>
          </details>

          <details className="beta-notes-details">
            <summary>Known limits</summary>
            <ul>
              <li>
                <strong>Password reset</strong> — use Account → Forgot password
                to email yourself a one-time code (when email delivery is
                configured). Support-assisted codes via{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> still
                work. New accounts require an email for recovery.
              </li>
              <li>
                <strong>Guest / local progress</strong> — Collection unlocks and
                badges sync to your account when signed in. Logging into an
                account on another browser restores online records, collection,
                and badge progress.
              </li>
              <li>
                A few players may still be missing salary rows until the next
                data pass.
              </li>
            </ul>
          </details>

          <details className="beta-notes-details">
            <summary>Limited sample size</summary>
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
                <strong>Lineup weight</strong> — Limited players also pull less
                on lineup totals until their sample is trusted: with a prior,
                weight scales by (current + prior games) / 35; with no prior, by
                current games / 35 (floor 0.35). Full-sample players stay at
                weight 1.
              </li>
              <li>
                Both effects apply in every scored mode (Daily, Casual, Pro,
                Events). Draft boards sort limited-sample players below
                full-sample ones when other keys tie.
              </li>
            </ul>
          </details>

          <details className="beta-notes-details" open>
            <summary>Feedback &amp; bugs</summary>
            <p>
              Something broken, confusing, or unfair? Tell us the mode, what you
              tapped, and what you expected.
            </p>
            <div className="beta-notes-actions">
              <a
                className="landing__primary-button"
                href={buildBugReportMailto()}
              >
                Report a bug
              </a>
              <a className="secondary-button" href={buildSupportMailto()}>
                Email support
              </a>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
