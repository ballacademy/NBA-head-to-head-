import type { ReactNode } from "react";
import {
  LandingBottomNav,
  type LandingHubTab,
} from "./LandingBottomNav";

interface HubShellProps {
  activeTab: LandingHubTab;
  onSelectTab: (tab: LandingHubTab) => void;
  onAccountClick: () => void;
  children: ReactNode;
  className?: string;
}

function AccountGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle
        cx="12"
        cy="9"
        r="3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5.5 19c1.6-3 4-4.5 6.5-4.5S16.9 16 18.5 19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HubShell({
  activeTab,
  onSelectTab,
  onAccountClick,
  children,
  className = "",
}: HubShellProps) {
  return (
    <section
      className={`landing panel landing--rich landing--hub${
        className ? ` ${className}` : ""
      }`}
    >
      <div className="landing__glow" aria-hidden="true" />

      <button
        type="button"
        className="landing-hub-account-btn"
        aria-label="Account"
        title="Account"
        onClick={onAccountClick}
      >
        <AccountGlyph />
      </button>

      <div className="landing-hub-scroll">{children}</div>

      <LandingBottomNav activeTab={activeTab} onSelect={onSelectTab} />
    </section>
  );
}
