import { useRef, type RefObject } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { MODE_COPY } from "../lib/modeCopy";
import type { LandingContentTab } from "../lib/landingHub";

interface FirstSessionOnboardingOverlayProps {
  onDismiss: () => void;
  onGoToHub: (tab: LandingContentTab) => void;
}

const GUIDE_ITEMS: { title: string; body: string }[] = [
  {
    title: "Play",
    body: `${MODE_COPY.daily.title}, ${MODE_COPY.classicH2h.short}/${MODE_COPY.proH2h.short} Head to Head, and weekly Events — start every match here.`,
  },
  {
    title: "Franchise",
    body: "Your unlocked players, badge goals, and Daily streak progress as you build a career.",
  },
  {
    title: "Community",
    body: "Share lineups and browse tier lists from other GMs.",
  },
  {
    title: "Ranks",
    body: `Season leaderboards for ${MODE_COPY.classicH2h.short} and ${MODE_COPY.proH2h.short} Head to Head.`,
  },
  {
    title: "Account",
    body: "Set your team name, sign in to keep progress, and open privacy or terms.",
  },
];

export function FirstSessionOnboardingOverlay({
  onDismiss,
  onGoToHub,
}: FirstSessionOnboardingOverlayProps) {
  const dismissRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogA11y({
    onClose: onDismiss,
    initialFocusRef: dismissRef,
    containerRef: panelRef as RefObject<HTMLElement | null>,
  });

  return (
    <div
      className="draft-onboarding-overlay hub-onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-session-title"
      onClick={onDismiss}
    >
      <div
        ref={panelRef}
        className="draft-onboarding-overlay__panel panel panel--compact hub-onboarding-overlay__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="hub-onboarding-overlay__header">
          <div>
            <p className="eyebrow">Welcome</p>
            <h2 id="first-session-title">Quick tour</h2>
          </div>
          <button
            type="button"
            className="hub-onboarding-overlay__close"
            aria-label="Close"
            onClick={onDismiss}
          >
            ×
          </button>
        </div>
        <p className="hub-onboarding-overlay__lede">
          Draft a five and compete as a GM. Use the bottom bar to move around —
          here&apos;s what each tab is for.
        </p>

        <ul className="first-session-guide__list">
          {GUIDE_ITEMS.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </li>
          ))}
        </ul>

        <div className="hub-onboarding-overlay__intents" role="group">
          <button
            type="button"
            className="hub-onboarding-overlay__intent hub-accent hub-accent--daily"
            onClick={() => {
              onGoToHub("play");
              onDismiss();
            }}
          >
            <strong>Start in Play</strong>
            <span>Pick Daily, Head to Head, or an Event and draft.</span>
          </button>
          <button
            type="button"
            className="hub-onboarding-overlay__intent hub-accent hub-accent--roster"
            onClick={() => {
              onGoToHub("roster");
              onDismiss();
            }}
          >
            <strong>Peek at Franchise</strong>
            <span>See your collection and what to unlock next.</span>
          </button>
        </div>

        <div className="hub-onboarding-overlay__footer">
          <button
            type="button"
            ref={dismissRef}
            className="secondary-button"
            onClick={onDismiss}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
