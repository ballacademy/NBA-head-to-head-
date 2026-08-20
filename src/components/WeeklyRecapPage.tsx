import { useEffect } from "react";
import {
  buildWeeklyGmRecap,
  formatWeeklyRecapLede,
  markWeeklyRecapSeen,
} from "../lib/gmWeeklyRecap";
import { HubPageChrome } from "./HubPageChrome";
import { WeeklyGmRecapCard } from "./WeeklyGmRecapCard";

interface WeeklyRecapPageProps {
  onBack: () => void;
  backLabel?: string;
}

export function WeeklyRecapPage({
  onBack,
  backLabel = "Play",
}: WeeklyRecapPageProps) {
  const recap = buildWeeklyGmRecap();

  useEffect(() => {
    markWeeklyRecapSeen(recap.weekKey);
  }, [recap.weekKey]);

  return (
    <HubPageChrome
      className="weekly-recap-page"
      title="Weekly recap"
      lede={formatWeeklyRecapLede(recap)}
      onBack={onBack}
      backLabel={backLabel}
    >
      <WeeklyGmRecapCard alwaysVisible hideDismiss hideHeading />
    </HubPageChrome>
  );
}
