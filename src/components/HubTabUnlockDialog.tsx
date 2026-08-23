import { useRef } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "../hooks/useDialogA11y";
import type { HubTabLockPrompt } from "../lib/hubUnlockProgress";

interface HubTabUnlockDialogProps {
  prompt: HubTabLockPrompt;
  onGoToPlay: () => void;
  onClose: () => void;
}

const copyForPrompt = (prompt: HubTabLockPrompt) => {
  if (prompt.kind === "franchise") {
    const remaining = prompt.progress.franchiseGamesRemaining;
    return {
      title: "Franchise unlocks after your first score",
      body:
        remaining === 1
          ? "Finish one Daily Draft puzzle or competitive Head to Head match to open badges, collection, and weekly recap."
          : `Finish ${remaining} scored games to open badges, collection, and weekly recap.`,
      cta: "Go to Play",
    };
  }

  const remaining = prompt.progress.ranksGamesRemaining;
  return {
    title: "Ranks unlock after competitive play",
    body:
      remaining === 1
        ? "Play one more Casual, Pro, or Event match to see season leaderboards. Daily Draft counts toward Franchise, but Ranks needs live match results."
        : `Play ${remaining} competitive matches (Casual, Pro, or Events) to unlock season leaderboards.`,
    cta: "Go to Play",
  };
};

export function HubTabUnlockDialog({
  prompt,
  onGoToPlay,
  onClose,
}: HubTabUnlockDialogProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogA11y({
    onClose,
    initialFocusRef: closeRef,
    containerRef: panelRef,
    lockScroll: true,
  });

  const copy = copyForPrompt(prompt);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="draft-onboarding-overlay hub-unlock-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-unlock-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="draft-onboarding-overlay__panel panel panel--compact hub-unlock-overlay__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="hub-onboarding-overlay__header">
          <div>
            <p className="eyebrow">Unlocks with play</p>
            <h2 id="hub-unlock-title">{copy.title}</h2>
          </div>
          <button
            type="button"
            className="hub-onboarding-overlay__close"
            aria-label="Close"
            ref={closeRef}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p className="hub-onboarding-overlay__lede">{copy.body}</p>
        <div className="hub-onboarding-overlay__footer">
          <button
            type="button"
            className="landing__primary-button"
            onClick={onGoToPlay}
          >
            {copy.cta}
          </button>
          <button type="button" className="secondary-button" onClick={onClose}>
            Not now
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
