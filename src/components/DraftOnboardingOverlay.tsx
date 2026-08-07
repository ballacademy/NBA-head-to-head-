import { useEffect, useRef } from "react";

interface DraftOnboardingOverlayProps {
  hasSalaryCap: boolean;
  onDismiss: () => void;
}

export function DraftOnboardingOverlay({
  hasSalaryCap,
  onDismiss,
}: DraftOnboardingOverlayProps) {
  const dismissRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    dismissRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div className="draft-onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="draft-onboarding-title">
      <div className="draft-onboarding-overlay__panel panel panel--compact">
        <p className="eyebrow">First draft</p>
        <h2 id="draft-onboarding-title">How drafting works</h2>
        <ul className="draft-onboarding-overlay__list">
          <li>Make five timed draft picks for your lineup.</li>
          {hasSalaryCap ? (
            <li>
              Stay under the salary cap — your banner shows spent vs remaining.
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
