import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "../hooks/useDialogA11y";

const REPORT_REASON_MAX = 200;

export type ReportPostDialogProps = {
  postId: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (reason: string) => void | Promise<void>;
  onClose: () => void;
};

export function ReportPostDialog({
  postId,
  busy = false,
  error = null,
  onSubmit,
  onClose,
}: ReportPostDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [reason, setReason] = useState("");
  useDialogA11y({
    onClose,
    disableClose: busy,
    initialFocusRef: closeRef,
    containerRef: panelRef as RefObject<HTMLElement | null>,
    lockScroll: true,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) {
      return;
    }
    void onSubmit(reason.trim().slice(0, REPORT_REASON_MAX));
  };

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="unlock-modal unlock-modal--compact community-report-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-post-id={postId}
      onClick={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="unlock-modal__panel panel unlock-modal__panel--compact"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Community</p>
        <h2 id={titleId}>Report post</h2>
        <p className="unlock-modal__copy">
          Optional note for moderators. Reports help keep Posts useful.
        </p>
        <form className="community-report-dialog__form" onSubmit={handleSubmit}>
          <label className="tier-list__search">
            <span>Note (optional)</span>
            <textarea
              rows={3}
              maxLength={REPORT_REASON_MAX}
              value={reason}
              disabled={busy}
              placeholder="What’s wrong with this post?"
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <p className="community-report-dialog__meta">
            {REPORT_REASON_MAX - reason.length} left
          </p>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="community-report-dialog__actions">
            <button
              type="button"
              ref={closeRef}
              className="secondary-button"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="hub-cta" disabled={busy}>
              {busy ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
