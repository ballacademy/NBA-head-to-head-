import { useEffect, type ReactNode } from "react";

interface HubFeatureReturnButtonProps {
  onBack: () => void;
  label?: string;
  /** When false, only Escape triggers onBack (no visible control). */
  visible?: boolean;
  /** Optional action aligned to the right of the return row (e.g. Game log). */
  trailing?: ReactNode;
}

export function HubFeatureReturnButton({
  onBack,
  label = "Return",
  visible = true,
  trailing,
}: HubFeatureReturnButtonProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onBack]);

  if (!visible) {
    return null;
  }

  const displayLabel = label.startsWith("←") ? label : `← ${label}`;

  return (
    <div
      className={`hub-feature__return-row${
        trailing ? " hub-feature__return-row--split" : ""
      }`}
    >
      <button
        type="button"
        className="secondary-button hub-feature__return"
        onClick={onBack}
      >
        {displayLabel}
      </button>
      {trailing}
    </div>
  );
}
