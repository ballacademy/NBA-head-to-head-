import { useRef } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { closeComposerScrim } from "./closeComposerScrim";

interface KeepCustomPhotoDialogProps {
  playerName: string;
  onKeep: () => void;
  onReplace: () => void;
  onClose: () => void;
}

export function KeepCustomPhotoDialog({
  playerName,
  onKeep,
  onReplace,
  onClose,
}: KeepCustomPhotoDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y({
    open: true,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: dialogRef,
    lockScroll: true,
  });

  return (
    <div
      className="sc-picker-scrim"
      onClick={(event) => closeComposerScrim(event, onClose)}
    >
      <div
        ref={dialogRef}
        className="sc-picker sc-picker--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keep-custom-photo-title"
        tabIndex={-1}
      >
        <div className="sc-picker__top">
          <div>
            <h2 id="keep-custom-photo-title">Keep this image?</h2>
            <p>
              This slot already has a custom photo. Keep it for {playerName},
              including pan, scale, and rotate — or replace it with their
              default headshot.
            </p>
          </div>
          <button type="button" className="sc-picker__close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sc-picker__footer">
          <button type="button" className="sc-btn sc-btn--ghost" onClick={onReplace}>
            Use new headshot
          </button>
          <button type="button" className="sc-btn sc-btn--primary" onClick={onKeep}>
            Keep this image
          </button>
        </div>
      </div>
    </div>
  );
}
