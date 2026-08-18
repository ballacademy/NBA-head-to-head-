import { useRef, type RefObject } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { getDraftOnboardingBullets } from "../lib/draftOnboarding";

interface DraftOnboardingOverlayProps {
  hasSalaryCap: boolean;
  isDailyDraft?: boolean;
  isCompetitive?: boolean;
  onDismiss: () => void;
}

export function DraftOnboardingOverlay({
  hasSalaryCap,
  isDailyDraft = false,
  isCompetitive = false,
  onDismiss,
}: DraftOnboardingOverlayProps) {
  const dismissRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogA11y({
    onClose: onDismiss,
    initialFocusRef: dismissRef,
    containerRef: panelRef as RefObject<HTMLElement | null>,
  });
  const bullets = getDraftOnboardingBullets({
    hasSalaryCap,
    isDailyDraft,
    isCompetitive,
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
          {bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
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
