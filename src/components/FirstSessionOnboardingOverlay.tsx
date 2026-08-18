import { useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
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
    body: `Daily Draft has two scored challenges each day (Basic and Advanced). ${MODE_COPY.classicH2h.short} and ${MODE_COPY.proH2h.short} H2H are live matchups with Banners on the line. Events is a weekly themed H2H with rotating restrictions.`,
  },
  {
    title: "Build a career",
    body: "Franchise tracks badges, collection unlocks, and a weekly recap. Practice H2H is vs a bot and does not change your record.",
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
    lockScroll: true,
  });

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
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
            <h2 id="first-session-title">Prove your GM eye</h2>
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

        <div className="hub-onboarding-overlay__body">
          <p className="hub-onboarding-overlay__lede">
            Draft five NBA players, get a score, and see how your lineup stacks
            up. Practice against a bot to learn the loop, jump into
            today&apos;s Daily Draft, or open Events from Play for this
            week&apos;s themed matchup.
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
              <strong>Practice H2H</strong>
              <span>Vs a bot — no Banners, badges, or board impact.</span>
            </button>
            <button
              type="button"
              className="hub-onboarding-overlay__intent hub-accent hub-accent--daily"
              onClick={onDaily}
            >
              <strong>Try Daily Draft</strong>
              <span>
                Two puzzles per day — stats stay hidden until all five are
                picked.
              </span>
            </button>
          </div>
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
    </div>,
    document.body,
  );
}
