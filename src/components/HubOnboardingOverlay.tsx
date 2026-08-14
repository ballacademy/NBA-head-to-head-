import { useRef, type RefObject } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { HUB_ONBOARDING_LEDE, HUB_PLAY_INTENTS } from "../lib/modeCopy";
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
      onClick={onDismiss}
    >
      <div
        ref={panelRef}
        className="draft-onboarding-overlay__panel panel panel--compact hub-onboarding-overlay__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="hub-onboarding-overlay__header">
          <p className="eyebrow">Play hub</p>
          <button
            type="button"
            className="hub-onboarding-overlay__close"
            aria-label="Close"
            onClick={onDismiss}
          >
            ×
          </button>
        </div>
        <h2 id="hub-onboarding-title">What should I play?</h2>
        <p className="hub-onboarding-overlay__lede">{HUB_ONBOARDING_LEDE}</p>

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
