import { useEffect, useRef } from "react";

interface HubOnboardingOverlayProps {
  onDismiss: () => void;
}

export function HubOnboardingOverlay({ onDismiss }: HubOnboardingOverlayProps) {
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
    <div
      className="draft-onboarding-overlay hub-onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-onboarding-title"
    >
      <div className="draft-onboarding-overlay__panel panel panel--compact">
        <p className="eyebrow">Play hub</p>
        <h2 id="hub-onboarding-title">Pick your mode</h2>
        <ul className="draft-onboarding-overlay__list">
          <li>
            <strong>Daily Draft</strong> — one shared puzzle per day. Chase rank
            without a salary cap.
          </li>
          <li>
            <strong>Head to Head</strong> — draft five and duel Casual or Pro
            opponents.
          </li>
          <li>
            <strong>Events</strong> — limited weekly challenges with their own
            standings.
          </li>
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
