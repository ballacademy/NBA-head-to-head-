export type LandingHubTab =
  | "play"
  | "roster"
  | "community"
  | "standings"
  | "account";

interface LandingBottomNavProps {
  activeTab: LandingHubTab;
  onSelect: (tab: LandingHubTab) => void;
  onPrefetchTab?: (tab: LandingHubTab) => void;
  playBadgeCount?: number;
}

const TABS: {
  id: LandingHubTab;
  label: string;
  icon: string;
}[] = [
  { id: "play", label: "Play", icon: "play" },
  { id: "roster", label: "Franchise", icon: "franchise" },
  { id: "community", label: "Community", icon: "community" },
  { id: "standings", label: "Ranks", icon: "standings" },
  { id: "account", label: "Account", icon: "account" },
];

function NavIcon({ name }: { name: string }) {
  switch (name) {
    case "play":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M10 8.5v7l6-3.5-6-3.5Z"
            fill="currentColor"
          />
        </svg>
      );
    case "franchise":
      // Championship pennant — reads as team/franchise identity at nav size.
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M7 3.5v17"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M7 5h9.5l-2.8 4.25L16.5 13.5H7V5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "community":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="9" cy="9" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="16" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M4.5 18.5c1.2-2.4 3.1-3.6 4.5-3.6s3.3 1.2 4.5 3.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M13.2 18.5c.7-1.5 1.8-2.4 2.8-2.4 1.2 0 2.3.8 3.2 2.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "standings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M6 19V11M12 19V5M18 19v-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "account":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M5.5 19c1.6-3 4-4.5 6.5-4.5S16.9 16 18.5 19"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function LandingBottomNav({
  activeTab,
  onSelect,
  onPrefetchTab,
  playBadgeCount = 0,
}: LandingBottomNavProps) {
  return (
    <nav className="landing-bottom-nav" aria-label="Main sections">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const showPlayBadge = tab.id === "play" && playBadgeCount > 0;
        const badgeLabel =
          playBadgeCount === 1
            ? "1 queued match waiting"
            : `${playBadgeCount} queued matches waiting`;

        return (
          <button
            key={tab.id}
            type="button"
            className={`landing-bottom-nav__item landing-bottom-nav__item--${tab.id}${
              isActive ? " landing-bottom-nav__item--active" : ""
            }`}
            aria-current={isActive ? "page" : undefined}
            aria-label={showPlayBadge ? `Play, ${badgeLabel}` : undefined}
            onClick={() => onSelect(tab.id)}
            onPointerDown={() => onPrefetchTab?.(tab.id)}
            onPointerEnter={() => onPrefetchTab?.(tab.id)}
            onFocus={() => onPrefetchTab?.(tab.id)}
          >
            <span className="landing-bottom-nav__icon">
              <NavIcon name={tab.icon} />
              {showPlayBadge ? (
                <span className="landing-bottom-nav__badge" aria-hidden="true">
                  {playBadgeCount > 9 ? "9+" : playBadgeCount}
                </span>
              ) : null}
            </span>
            <span className="landing-bottom-nav__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
