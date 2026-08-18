import { useLayoutEffect, useRef, type ReactNode } from "react";
import { scrollHubToTop } from "../lib/hubScroll";
import { DraftDayGmLogo } from "./DraftDayGmLogo";
import {
  LandingBottomNav,
  type LandingHubTab,
} from "./LandingBottomNav";

interface HubShellProps {
  activeTab: LandingHubTab;
  onSelectTab: (tab: LandingHubTab) => void;
  onPrefetchTab?: (tab: LandingHubTab) => void;
  playBadgeCount?: number;
  children: ReactNode;
  className?: string;
}

export function HubShell({
  activeTab,
  onSelectTab,
  onPrefetchTab,
  playBadgeCount = 0,
  children,
  className = "",
}: HubShellProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tabAccent =
    activeTab === "standings"
      ? "ranked"
      : activeTab === "community"
        ? "community"
        : activeTab;

  // Shared scroller keeps position across tabs; reset so Play modes aren't cut off.
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = 0;
      node.scrollLeft = 0;
    }
    scrollHubToTop();
  }, [activeTab]);

  return (
    <section
      className={`landing panel landing--rich landing--hub landing--hub-tab-${tabAccent}${
        className ? ` ${className}` : ""
      }`}
      data-hub-tab={activeTab}
    >
      <div className="landing__glow" aria-hidden="true" />

      <div className="landing-hub-scroll" ref={scrollRef}>
        {/* Zero-height chrome keeps the logo top-left and scrolling away with content. */}
        <div className="landing-hub-chrome" aria-hidden="true">
          <div className="landing-hub-brand">
            <DraftDayGmLogo className="landing__logo landing-hub-brand__logo" />
          </div>
        </div>
        {children}
      </div>

      <LandingBottomNav
        activeTab={activeTab}
        onSelect={onSelectTab}
        onPrefetchTab={onPrefetchTab}
        playBadgeCount={playBadgeCount}
      />
    </section>
  );
}
