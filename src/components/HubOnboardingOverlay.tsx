import { useRef, type RefObject } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { HUB_ONBOARDING_BULLETS, HUB_PLAY_INTENTS } from "../lib/modeCopy";
import type { LandingPlaySection } from "../lib/landingHub";

interface HubOnboardingOverlayProps {
  onDismiss: () => void;
  onChooseIntent?: (intent: {
    playSection: LandingPlaySection;
    h2hMode?: "classic" | "ranked";
  }) => void;
}

export function HubOnboardingOverlay({
  onDismiss,
  onChooseIntent,
}: HubOnboardingOverlayProps) {
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
      aria-labelledby="hub-onboarding-title"
    >
      <div
        ref={panelRef}
        className="draft-onboarding-overlay__panel panel panel--compact"
      >
        <p className="eyebrow">Play hub</p>
        <h2 id="hub-onboarding-title">What should I play?</h2>
        <ul className="draft-onboarding-overlay__list">
          {HUB_ONBOARDING_BULLETS.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong> — {item.body}
            </li>
          ))}
        </ul>

        {onChooseIntent ? (
          <div
            className="hub-onboarding-overlay__intents"
            role="group"
            aria-label="Pick a starting path"
          >
            {HUB_PLAY_INTENTS.map((intent) => (
              <button
                key={intent.id}
                type="button"
                className="hub-onboarding-overlay__intent"
                onClick={() => {
                  onChooseIntent({
                    playSection: intent.playSection,
                    h2hMode: intent.h2hMode,
                  });
                  onDismiss();
                }}
              >
                <strong>{intent.title}</strong>
                <span>{intent.body}</span>
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          ref={dismissRef}
          className="landing__primary-button"
          onClick={onDismiss}
        >
          {onChooseIntent ? "Browse Play hub" : "Got it"}
        </button>
      </div>
    </div>
  );
}
