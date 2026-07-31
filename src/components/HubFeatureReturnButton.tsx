import { useEffect } from "react";

interface HubFeatureReturnButtonProps {
  onBack: () => void;
  label?: string;
}

export function HubFeatureReturnButton({
  onBack,
  label = "Return",
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
