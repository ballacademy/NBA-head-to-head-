import { useEffect, useRef } from "react";
import {
  SALARIES_DATA_AS_OF_LABEL,
  STATS_DATA_AS_OF_LABEL,
  SUPPORT_EMAIL,
  buildBugReportMailto,
  buildSupportMailto,
} from "../lib/support";
import { ACTIVE_ROSTER_AS_OF_LABEL } from "../lib/playerPool";
import {
  parseBetaNotesSection,
  type BetaNotesSection,
} from "../lib/betaNotes";
import type { LandingContentTab, LandingPlaySection } from "../lib/landingHub";
import { HubPageChrome } from "./HubPageChrome";

interface BetaNotesPageProps {
  onBack: () => void;
  initialSection?: string | null;
  onPlayIntent?: (intent: {
    playSection: LandingPlaySection;
    h2hMode?: "classic" | "ranked";
  }) => void;
  onOpenHub?: (tab: LandingContentTab) => void;
  onOpenRanks?: () => void;
  onOpenCommunity?: () => void;
}

export function BetaNotesPage({
  onBack,
  initialSection = null,
  onPlayIntent,
  onOpenHub,
  onOpenRanks,
  onOpenCommunity,
}: BetaNotesPageProps) {
  const section = parseBetaNotesSection(initialSection);
  const sectionRefs = useRef<Partial<Record<BetaNotesSection, HTMLDetailsElement | null>>>(
    {},
  );

  useEffect(() => {
    if (!section) {
      return;
    }

    const node = sectionRefs.current[section];
    if (!node) {
      return;
    }

    node.open = true;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section]);

  return (
    <HubPageChrome
      className="beta-notes-page"
      title="Beta notes"
      lede="Live modes, known limits, and how to reach us"
      onBack={onBack}
      backLabel="Account"
    >
      <section className="hub-feature__panel">
        <div className="legal-page__body beta-notes-body">
          <div className="beta-notes-summary">
            <p>
              Daily Draft, Casual/Pro H2H, and weekly Events are live. All-Time
              Draft is coming soon. Accounts unlock leaderboards and public
              tier lists. Bottom nav: Play, Franchise, Community, Ranks, and
              Account.
            </p>
            <p className="beta-notes-summary__meta">
              Roster as of {ACTIVE_ROSTER_AS_OF_LABEL} · Stats{" "}
              {STATS_DATA_AS_OF_LABEL} · Salaries {SALARIES_DATA_AS_OF_LABEL}
            </p>
            {(onPlayIntent || onOpenHub || onOpenRanks || onOpenCommunity) && (
              <p className="beta-notes-summary__links" role="navigation">
                Jump to{" "}
                {onPlayIntent ? (
                  <button
                    type="button"
                    className="beta-notes-inline-link"
                    onClick={() => onPlayIntent({ playSection: "daily" })}
                  >
                    Daily
                  </button>
                ) : null}
                {onPlayIntent ? (
                  <>
                    {" · "}
                    <button
                      type="button"
                      className="beta-notes-inline-link"
                      onClick={() =>
                        onPlayIntent({
                          playSection: "headToHead",
                          h2hMode: "classic",
                        })
                      }
                    >
                      Casual H2H
                    </button>
                  </>
                ) : null}
                {onOpenHub ? (
                  <>
                    {" · "}
                    <button
                      type="button"
                      className="beta-notes-inline-link"
                      onClick={() => onOpenHub("roster")}
                    >
                      Franchise
                    </button>
                  </>
                ) : null}
                {onOpenRanks ? (
                  <>
                    {" · "}
                    <button
                      type="button"
                      className="beta-notes-inline-link"
                      onClick={onOpenRanks}
                    >
                      Ranks
                    </button>
                  </>
                ) : null}
                {onOpenCommunity ? (
                  <>
                    {" · "}
                    <button
                      type="button"
                      className="beta-notes-inline-link"
                      onClick={onOpenCommunity}
                    >
                      Community
                    </button>
                  </>
                ) : null}
              </p>
            )}
          </div>

          <details
            className="beta-notes-details"
            id="beta-live"
            open={section === "live"}
            ref={(node) => {
              sectionRefs.current.live = node;
            }}
          >
            <summary>What&apos;s live</summary>
            <ul>
              <li>
                <strong>Play hub</strong> — Daily Draft (one scored try per mode
                daily), Casual/Pro H2H, and weekly Events
                {onPlayIntent ? (
                  <>
                    {" "}
                    (
                    <button
                      type="button"
                      className="beta-notes-inline-link"
                      onClick={() => onPlayIntent({ playSection: "chooser" })}
                    >
                      open Play
                    </button>
                    )
                  </>
                ) : null}
              </li>
              <li>
                <strong>LeBron James</strong> is banned in Casual H2H, Pro H2H,
                and Events (salary / impact edge) — he still appears at the
                bottom of the draft board with a Banned label. Freely draftable
                in practice and Daily Draft without an All-Star unlock.
              </li>
              <li>
                <strong>Community</strong> — posts, attached lineups/matchups,
                and public tier lists (account required to publish)
              </li>
              <li>
                <strong>Franchise</strong> — Collection, Badges, Player pool,
                Daily progress, Most drafted, and GM Stats ·{" "}
                <strong>Ranks</strong> · <strong>Account</strong> (sign-in,
                settings)
              </li>
              <li>
                <strong>Private match</strong> (Casual or Pro) — account
                holders create a room code for live H2H. Same draft rules as
                that mode; records, Banners, and badges do not change.
              </li>
              <li>
                <strong>All-Time Draft</strong> — peak seasons and era legends.
                Coming soon; not tied to career wins or banner totals in the
                current beta.
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

          <details
            className="beta-notes-details"
            id="beta-limits"
            open={section === "limits"}
            ref={(node) => {
              sectionRefs.current.limits = node;
            }}
          >
            <summary>Known limits</summary>
            <ul>
              <li>
                <strong>Password reset</strong> — when you&apos;re signed out,
                use Account → Forgot password to email yourself a one-time code
                (requires Resend email delivery on the server). Support-assisted
                codes via{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> still
                work. New accounts require an email for recovery. Forgot password
                is hidden while you&apos;re already signed in — log out first if
                you need a reset.
              </li>
              <li>
                <strong>Guest / local progress</strong> — When signed in,
                collection, badges, career W–L, Most Drafted, event badges, tier
                list drafts/library, and <strong>Daily streaks</strong> (from
                your scored Daily history) sync to your account and restore on
                login / another device. Device-only history (game log,
                weekly-recap seen, unlock-progress, live draft session,
                community mute/rate caches) clears on logout and is not restored
                across devices.
              </li>
              <li>
                <strong>Stats freshness</strong> — Roster/salaries are labeled
                as of {SALARIES_DATA_AS_OF_LABEL}; player production stats are
                still as of {STATS_DATA_AS_OF_LABEL}. New signings may look thin
                or limited-sample until the next stats pass.
              </li>
              <li>
                <strong>1500+ Banners</strong> — At {`1500+`} Banners you skip
                NPC fallback and need a <em>live</em> opponent. That opponent can
                be below 1500; they just have to be a real GM (or claim your
                queued lineup live). Practice and Private still work while you
                wait.
              </li>
            </ul>
          </details>

          <details
            className="beta-notes-details"
            id="beta-sample"
            open={section === "sample"}
            ref={(node) => {
              sectionRefs.current.sample = node;
            }}
          >
            <summary>Limited sample size</summary>
            <p>
              Players with <strong>29 or fewer games</strong> this season show a
              Limited sample badge in draft and stats. That flag is about the{" "}
              <em>current</em> season only — prior history does not remove it.
              At <strong>30+ games</strong>, scoring uses this season’s stats
              only.
            </p>
            <ul>
              <li>
                <strong>Stat blend</strong> — If they have prior-season (or peak)
                production on file, the engine game-weights those numbers with
                current ones before scoring. Example: 5 games now + 70 prior →
                current stats count 5/75 and prior 70/75. Defense grades soft-
                regress toward average (C) with those same game weights. Usage
                and play styles stay on the current row.
              </li>
              <li>
                <strong>Lineup weight</strong> — Limited players also pull less
                on lineup totals until their sample is trusted: with a prior,
                weight scales by (current + prior games) / 30; with no prior, by
                current games / 30 (floor 0.35). Full-sample players (30+) stay
                at weight 1.
              </li>
              <li>
                Both effects apply in every scored mode (Daily, Casual, Pro,
                Events). Draft boards sort limited-sample players below
                full-sample ones when other keys tie.
              </li>
            </ul>
          </details>

          <details
            className="beta-notes-details"
            id="beta-feedback"
            open={section == null || section === "feedback"}
            ref={(node) => {
              sectionRefs.current.feedback = node;
            }}
          >
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
    </HubPageChrome>
  );
}
