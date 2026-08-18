import { useEffect, useMemo } from "react";
import {
  buildWeeklyGmRecap,
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
  const recap = useMemo(() => buildWeeklyGmRecap(), []);

  useEffect(() => {
    markWeeklyRecapSeen(recap.weekKey);
  }, [recap.weekKey]);

  return (
    <HubPageChrome
      className="weekly-recap-page"
      title="Weekly recap"
      lede={`Last week · Daily Draft · ${recap.weekRangeLabel}`}
      onBack={onBack}
      backLabel={backLabel}
    >
      <section className="hub-feature__panel">
        <WeeklyGmRecapCard alwaysVisible hideDismiss hideHeading />
      </section>
    </HubPageChrome>
  );
}
