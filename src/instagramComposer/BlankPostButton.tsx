import { confirmBlankPost } from "./confirmBlankPost";

export function BlankPostButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <button
      type="button"
      className="sc-btn sc-btn--ghost"
      onClick={() => {
        if (confirmBlankPost()) {
          onConfirm();
        }
      }}
    >
      Blank post
    </button>
  );
}
