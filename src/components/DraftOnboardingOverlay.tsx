interface DraftOnboardingOverlayProps {
  hasSalaryCap: boolean;
  onDismiss: () => void;
}

export function DraftOnboardingOverlay({
  hasSalaryCap,
  onDismiss,
}: DraftOnboardingOverlayProps) {
  return (
    <div className="draft-onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="draft-onboarding-title">
      <div className="draft-onboarding-overlay__panel panel panel--compact">
        <p className="eyebrow">First draft</p>
        <h2 id="draft-onboarding-title">How drafting works</h2>
        <ul className="draft-onboarding-overlay__list">
          <li>
            You will fill five position slots. Each pick must match the slot
            shown on the clock.
          </li>
          {hasSalaryCap ? (
            <li>
              Watch salary cap space. Your banner shows spent vs. remaining
              budget for the lineup.
            </li>
          ) : null}
          <li>
            The timer counts down each pick. If it hits zero, the game
            auto-fills your remaining slots.
          </li>
        </ul>
        <button type="button" className="landing__primary-button" onClick={onDismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
