import { useEffect } from "react";

interface HubFeatureReturnButtonProps {
  onBack: () => void;
  label?: string;
  /** When false, only Escape triggers onBack (no visible control). */
  visible?: boolean;
}

export function HubFeatureReturnButton({
  onBack,
  label = "Return",
  visible = true,
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
    <div className="hub-feature__return-row">
      <button
        type="button"
        className="secondary-button hub-feature__return"
        onClick={onBack}
      >
        {displayLabel}
      </button>
    </div>
  );
}
