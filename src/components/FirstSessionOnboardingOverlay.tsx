import { useRef, type RefObject } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { MODE_COPY } from "../lib/modeCopy";
import type { LandingContentTab } from "../lib/landingHub";

interface FirstSessionOnboardingOverlayProps {
  onDismiss: () => void;
  onGoToHub: (tab: LandingContentTab) => void;
}

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
            <p className="eyebrow">First session</p>
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
          Three places matter: Play modes, Franchise career, and Account
          identity.
        </p>

        <ul className="first-session-guide__list">
          <li>
            <strong>Play</strong>
            <span>
              {MODE_COPY.daily.short} · {MODE_COPY.classicH2h.short}/
              {MODE_COPY.proH2h.short} H2H · {MODE_COPY.weeklyEvent.short} —
              pick a mode and draft.
            </span>
          </li>
          <li>
            <strong>Franchise</strong>
            <span>
              Collection, badges, Daily streaks, and Most Drafted — your career
              home.
            </span>
          </li>
          <li>
            <strong>Account</strong>
            <span>
              Sign-in, team name, and legal — keeps Franchise separate from
              settings.
            </span>
          </li>
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
            <span>Jump to Daily, Head to Head, or Events.</span>
          </button>
          <button
            type="button"
            className="hub-onboarding-overlay__intent hub-accent hub-accent--roster"
            onClick={() => {
              onGoToHub("roster");
              onDismiss();
            }}
          >
            <strong>Open Franchise</strong>
            <span>See collection and next badge goals.</span>
          </button>
        </div>

        <div className="hub-onboarding-overlay__footer">
          <button
            type="button"
            ref={dismissRef}
            className="secondary-button"
            onClick={onDismiss}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
