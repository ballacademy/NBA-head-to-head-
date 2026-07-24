export type LandingHubTab =
  | "play"
  | "daily"
  | "roster"
  | "standings"
  | "account";

interface LandingBottomNavProps {
  activeTab: LandingHubTab;
  onSelect: (tab: LandingHubTab) => void;
}

const TABS: {
  id: LandingHubTab;
  label: string;
  icon: string;
}[] = [
  { id: "play", label: "Play", icon: "play" },
  { id: "daily", label: "Daily", icon: "daily" },
  { id: "roster", label: "Roster", icon: "roster" },
  { id: "standings", label: "Standings", icon: "standings" },
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
    case "daily":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect
            x="4"
            y="5"
            width="16"
            height="15"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M8 3v4M16 3v4M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "roster":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M8 4h8l1.5 3H20v13H4V7h4.5L8 4Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle cx="12" cy="13" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
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

export function LandingBottomNav({ activeTab, onSelect }: LandingBottomNavProps) {
  return (
    <nav className="landing-bottom-nav" aria-label="Main sections">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            className={`landing-bottom-nav__item${
              isActive ? " landing-bottom-nav__item--active" : ""
            }`}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onSelect(tab.id)}
          >
            <span className="landing-bottom-nav__icon">
              <NavIcon name={tab.icon} />
            </span>
            <span className="landing-bottom-nav__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
