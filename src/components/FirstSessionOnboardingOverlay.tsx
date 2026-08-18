import { useRef, type RefObject } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { MODE_COPY } from "../lib/modeCopy";

interface FirstSessionOnboardingOverlayProps {
  onDismiss: () => void;
  onPractice: () => void;
  onDaily: () => void;
}

const GUIDE_ITEMS: { title: string; body: string }[] = [
  {
    title: "Draft a five",
    body: "Five timed picks. Stay under the cap when there is one. If the timer hits zero, remaining slots auto-fill.",
  },
  {
    title: "Get a score",
    body: `${MODE_COPY.daily.title} is a shared puzzle. ${MODE_COPY.classicH2h.short} and ${MODE_COPY.proH2h.short} are live head-to-head.`,
  },
  {
    title: "Build a career",
    body: "Franchise keeps Daily streaks, badges, and unlocks. Start here on Play — Practice does not touch your record.",
  },
];

export function FirstSessionOnboardingOverlay({
  onDismiss,
  onPractice,
  onDaily,
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
            <h2 id="first-session-title">How to play</h2>
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
          Draft five players and get a score. Practice is the fastest way to
          learn the loop — or jump into today&apos;s Daily.
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
            className="hub-onboarding-overlay__intent hub-accent hub-accent--h2h"
            onClick={onPractice}
          >
            <strong>Practice Casual</strong>
            <span>Vs a bot — no streaks, badges, or board impact.</span>
          </button>
          <button
            type="button"
            className="hub-onboarding-overlay__intent hub-accent hub-accent--daily"
            onClick={onDaily}
          >
            <strong>Try Daily Draft</strong>
            <span>One shared puzzle. Stats stay hidden until you lock.</span>
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
