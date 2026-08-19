import { useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "../hooks/useDialogA11y";

interface TeamNameValidationModalProps {
  message: string;
  onClose: () => void;
}

export function TeamNameValidationModal({
  message,
  onClose,
}: TeamNameValidationModalProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogA11y({
    onClose,
    initialFocusRef: closeRef,
    containerRef: panelRef as RefObject<HTMLElement | null>,
    lockScroll: true,
  });

  const modal = (
    <div
      className="unlock-modal unlock-modal--compact team-name-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-name-modal-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="unlock-modal__panel panel unlock-modal__panel--compact team-name-modal__panel"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <p className="eyebrow">Team name required</p>
        <h2 id="team-name-modal-title">Update your team name</h2>
        <p className="unlock-modal__copy">{message}</p>
        <button
          type="button"
          ref={closeRef}
          className="landing__primary-button team-name-modal__button"
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
