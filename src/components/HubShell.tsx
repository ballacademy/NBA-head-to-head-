import type { ReactNode } from "react";
import { DraftDayGmLogo } from "./DraftDayGmLogo";
import {
  LandingBottomNav,
  type LandingHubTab,
} from "./LandingBottomNav";

interface HubShellProps {
  activeTab: LandingHubTab;
  onSelectTab: (tab: LandingHubTab) => void;
  children: ReactNode;
  className?: string;
}

export function HubShell({
  activeTab,
  onSelectTab,
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

      <div className="landing-hub-scroll">
        {/* Zero-height chrome keeps the logo top-left and scrolling away with content. */}
        <div className="landing-hub-chrome" aria-hidden="true">
          <div className="landing-hub-brand">
            <DraftDayGmLogo className="landing__logo landing-hub-brand__logo" />
          </div>
        </div>
        {children}
      </div>

      <LandingBottomNav activeTab={activeTab} onSelect={onSelectTab} />
    </section>
  );
}
