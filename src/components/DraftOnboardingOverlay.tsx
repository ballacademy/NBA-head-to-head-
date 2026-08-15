import { useRef, type RefObject } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";

interface DraftOnboardingOverlayProps {
  hasSalaryCap: boolean;
  onDismiss: () => void;
}

export function DraftOnboardingOverlay({
  hasSalaryCap,
  onDismiss,
}: DraftOnboardingOverlayProps) {
  const dismissRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogA11y({
    onClose: onDismiss,
    initialFocusRef: dismissRef,
    containerRef: panelRef as RefObject<HTMLElement | null>,
  });

  return (
    <div
      className="draft-onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-onboarding-title"
    >
      <div
        ref={panelRef}
        className="draft-onboarding-overlay__panel panel panel--compact"
      >
        <p className="eyebrow">First draft</p>
        <h2 id="draft-onboarding-title">How drafting works</h2>
        <ul className="draft-onboarding-overlay__list">
          <li>Make five timed draft picks for your lineup.</li>
          {hasSalaryCap ? (
            <li>
              Stay under the salary cap — the salary bar shows spent vs remaining.
            </li>
          ) : null}
          <li>If the timer hits zero, remaining picks auto-fill.</li>
        </ul>
        <button
          type="button"
          ref={dismissRef}
          className="landing__primary-button"
          onClick={onDismiss}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
