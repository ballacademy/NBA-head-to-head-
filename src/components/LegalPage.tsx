type LegalPageKind = "privacy" | "terms";

interface LegalPageProps {
  kind: LegalPageKind;
  onBack: () => void;
  onOpenPrivacy?: () => void;
}

const LAST_UPDATED = "June 28, 2026";

function PrivacyPolicyContent() {
  return (
    <>
      <p className="legal-page__updated">Last updated: {LAST_UPDATED}</p>
      <p>
        Draft Day GM (&quot;we,&quot; &quot;us,&quot; or &quot;the site&quot;) is
        an independent fan project operated by BALLACADEMY. This Privacy Policy
        explains what information the site stores when you play, why we use it,
        and what choices you have.
      </p>
      <p>
        We do not ask for your real name, email address, phone number, or payment
        information to play.
      </p>

      <h2>Information we collect</h2>
      <h3>On your device</h3>
      <p>Your browser stores gameplay data locally, including:</p>
      <ul>
        <li>A random anonymous player ID and derived GM code</li>
        <li>Your chosen team name</li>
        <li>Win/loss records, ratings, streaks, and mode progress</li>
        <li>Achievement progress, unlocked players, and collection state</li>
        <li>Daily Draft progress and cached score data</li>
        <li>Draft timer deadlines for the current session</li>
      </ul>

      <h3>On our servers</h3>
      <p>
        When you use online features (matchmaking, leaderboards, Daily Draft
        sharing, or stored lineups), we send and store:
      </p>
      <ul>
        <li>Your anonymous player ID and public GM code</li>
        <li>Your team name</li>
        <li>Lineups you draft (player IDs only)</li>
        <li>Match results, ratings, wins, losses, and streaks</li>
        <li>Daily Draft scores and formatted results</li>
        <li>Temporary matchmaking queue entries while you search for an opponent</li>
      </ul>
      <p>
        We do not operate a login system. Your player ID is created in your
        browser and sent with API requests so we can match you with opponents
        and show leaderboard entries.
      </p>

      <h3>Information we do not collect on purpose</h3>
      <ul>
        <li>Email addresses or account passwords</li>
        <li>Payment or billing information</li>
        <li>Precise location</li>
        <li>Advertising or analytics tracking cookies</li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>Run drafts, matchmaking, and head-to-head results</li>
        <li>Store lineups for ghost opponents and live queue features</li>
        <li>Display leaderboards and Daily Draft percentiles</li>
        <li>Keep your local progress synced with server-side competitive features</li>
        <li>Maintain and protect the service</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>Where data is stored</h2>
      <ul>
        <li>
          <strong>Your browser:</strong> local storage and session storage on
          your device
        </li>
        <li>
          <strong>Our backend:</strong> Cloudflare D1 databases that power the
          site&apos;s APIs
        </li>
      </ul>
      <p>
        Cloudflare processes network requests to deliver the site and may log
        standard technical data such as IP addresses as part of hosting. See{" "}
        <a
          href="https://www.cloudflare.com/privacypolicy/"
          target="_blank"
          rel="noreferrer"
        >
          Cloudflare&apos;s Privacy Policy
        </a>
        .
      </p>

      <h2>Third-party services</h2>
      <ul>
        <li>
          <strong>Cloudflare</strong> — hosting, Pages, and database services
        </li>
        <li>
          <strong>Google Fonts</strong> — the site loads the Inter font from
          Google&apos;s servers, which may receive your IP address and browser
          information when fonts are requested
        </li>
      </ul>
      <p>
        Player statistics and salary figures shown in the game come from
        third-party sources such as Basketball Reference and Spotrac. Those
        sources have their own terms and privacy policies.
      </p>

      <h2>Retention</h2>
      <ul>
        <li>
          Local browser data stays on your device until you clear site data or
          use a different browser
        </li>
        <li>
          Stored ghost lineups used for matchmaking are generally kept for a
          limited window (about 14 days) before they stop being offered to
          opponents
        </li>
        <li>
          Leaderboard and Daily Draft entries may remain until seasons reset or
          records are overwritten by newer submissions
        </li>
        <li>Matchmaking queue entries are short-lived and removed after use</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>
          Clear your browser&apos;s site data to reset local progress and receive
          a new anonymous player ID
        </li>
        <li>
          Stop using online modes if you do not want team names, lineups, or
          scores stored on our servers
        </li>
      </ul>
      <p>
        Because there is no account system, we cannot reliably delete
        server-side records tied to your old player ID if you clear local
        storage. Clearing local data creates a new anonymous identity going
        forward.
      </p>

      <h2>Children&apos;s privacy</h2>
      <p>
        Draft Day GM is a casual sports fan game and is not directed at children
        under 13. We do not knowingly collect personal information from
        children under 13. If you believe a child has provided information
        through the site, contact us and we will take reasonable steps to
        remove associated server records where possible.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this Privacy Policy from time to time. The &quot;Last
        updated&quot; date at the top will change when we do. Continued use of
        the site after changes means you accept the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can be sent by opening an issue on the{" "}
        <a
          href="https://github.com/ballacademy/NBA-head-to-head-"
          target="_blank"
          rel="noreferrer"
        >
          Draft Day GM GitHub repository
        </a>{" "}
        or through BALLACADEMY&apos;s usual support channels.
      </p>
    </>
  );
}

function TermsContent({ onOpenPrivacy }: { onOpenPrivacy?: () => void }) {
  return (
    <>
      <p className="legal-page__updated">Last updated: {LAST_UPDATED}</p>
      <p>
        These Terms of Use (&quot;Terms&quot;) govern your use of Draft Day GM,
        an independent fan project operated by BALLACADEMY. By using the site,
        you agree to these Terms.
      </p>

      <h2>Fan project / no affiliation</h2>
      <p>
        Draft Day GM is not affiliated with, endorsed by, sponsored by, or
        connected to the NBA, its teams, players, unions, or partners. Team
        names, player names, and statistics are used for informational and
        entertainment purposes only.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be old enough to use online services where you live. If you are
        under 18, you should use the site only with a parent or guardian&apos;s
        permission.
      </p>

      <h2>What the service is</h2>
      <p>
        Draft Day GM is a free browser game for drafting fictional lineups,
        comparing projected strength, and playing casual head-to-head modes.
        Ratings, records, and outcomes are game mechanics — not predictions of
        real-world results.
      </p>
      <ul>
        <li>No real-money prizes or gambling</li>
        <li>No purchase necessary to play the core game</li>
        <li>No guarantee of uninterrupted or error-free service</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You may enter a team name and draft lineups. Do not use names that are
        illegal, harassing, hateful, impersonate others, or infringe someone
        else&apos;s rights. We may remove or refuse content that violates these
        Terms or creates risk for the service.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Cheat, exploit bugs, or manipulate matchmaking or leaderboards</li>
        <li>Scrape, overload, or attack the site or its APIs</li>
        <li>Reverse engineer the service to build a competing product</li>
        <li>Use the site for unlawful purposes</li>
      </ul>

      <h2>Data sources and third-party rights</h2>
      <p>
        Player statistics, roster information, and salary figures displayed in
        the game may come from third-party sources, including Basketball
        Reference and Spotrac. Those providers own their respective content and
        impose their own terms.
      </p>
      <ul>
        <li>
          <strong>Basketball Reference / Sports Reference</strong> — stats and
          related data. Their terms restrict automated scraping, bulk
          redistribution, and building competing databases without permission.
          See their{" "}
          <a
            href="https://www.sports-reference.com/data_use.html"
            target="_blank"
            rel="noreferrer"
          >
            Data Use policy
          </a>{" "}
          and{" "}
          <a
            href="https://www.sports-reference.com/termsofuse.html"
            target="_blank"
            rel="noreferrer"
          >
            Terms of Use
          </a>
          .
        </li>
        <li>
          <strong>Spotrac</strong> — contract and salary information. Their
          terms prohibit systematic extraction, harvesting, or automated
          scraping of site data without written permission. See{" "}
          <a
            href="https://www.spotrac.com/service"
            target="_blank"
            rel="noreferrer"
          >
            Spotrac&apos;s Terms of Service
          </a>
          .
        </li>
      </ul>
      <p>
        Draft Day GM is operated as a non-commercial fan experience. Maintainers
        should ensure data refresh workflows comply with upstream source terms
        or obtain proper licenses if the project grows beyond personal fan use.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The Draft Day GM name, logo, site design, code, and original game
        mechanics belong to BALLACADEMY or its licensors. NBA-related marks,
        team names, and player names belong to their respective owners.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        THE SITE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
        WITHOUT WARRANTIES OF ANY KIND. WE DO NOT WARRANT THAT STATS, SALARIES,
        RATINGS, OR MATCH RESULTS ARE ACCURATE, COMPLETE, OR FIT FOR ANY
        PARTICULAR PURPOSE.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        TO THE FULLEST EXTENT PERMITTED BY LAW, BALLACADEMY AND THE SITE
        OPERATORS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
        CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR
        GOODWILL, ARISING FROM YOUR USE OF THE SITE.
      </p>

      <h2>Termination</h2>
      <p>
        We may suspend or block access to the site or competitive features at
        any time if we believe you violated these Terms or harmed other players
        or the service.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use after
        changes means you accept the updated Terms.
      </p>

      <h2>Privacy</h2>
      <p>
        Our collection and use of information is described in the{" "}
        {onOpenPrivacy ? (
          <button type="button" className="legal-page__inline-link" onClick={onOpenPrivacy}>
            Privacy Policy
          </button>
        ) : (
          <a href="/privacy">Privacy Policy</a>
        )}
        .
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms can be sent by opening an issue on the{" "}
        <a
          href="https://github.com/ballacademy/NBA-head-to-head-"
          target="_blank"
          rel="noreferrer"
        >
          Draft Day GM GitHub repository
        </a>
        .
      </p>
    </>
  );
}

export function LegalPage({ kind, onBack, onOpenPrivacy }: LegalPageProps) {
  const title = kind === "privacy" ? "Privacy Policy" : "Terms of Use";

  return (
    <section className="legal-page panel panel--compact feature-page feature-page--legal">
      <div className="legal-page__header">
        <div>
          <p className="eyebrow">Draft Day GM</p>
          <h1>{title}</h1>
        </div>
        <button type="button" className="secondary-button" onClick={onBack}>
          Back to home
        </button>
      </div>

      <div className="legal-page__body">
        {kind === "privacy" ? (
          <PrivacyPolicyContent />
        ) : (
          <TermsContent onOpenPrivacy={onOpenPrivacy} />
        )}
      </div>
    </section>
  );
}
