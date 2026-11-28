import { copyGraphicCaption } from "../instagramComposer/graphicCaption";
import {
  downloadTotwStatsCsv,
  totwStatsCaption,
  totwStatsHasRows,
  type TotwStatsSheet,
} from "./totwStatsExport";

interface TotwStatsExportHudProps {
  sheet: TotwStatsSheet;
  statsSheet: boolean;
  onStatsSheet: (on: boolean) => void;
  onStatus: (status: string) => void;
}

export function TotwStatsExportHud({
  sheet,
  statsSheet,
  onStatsSheet,
  onStatus,
}: TotwStatsExportHudProps) {
  const ready = totwStatsHasRows(sheet);
  return (
    <>
      <label className="sc-field">
        <span className="sc-toolbar__eyebrow">Stats sheet</span>
        <button
          type="button"
          className={statsSheet ? "sc-chip is-on" : "sc-chip"}
          aria-pressed={statsSheet}
          aria-label="Stats sheet"
          onClick={() => onStatsSheet(!statsSheet)}
        >
          {statsSheet ? "On" : "Off"}
        </button>
      </label>
      <button
        type="button"
        className="sc-chip"
        disabled={!ready}
        aria-label="Copy stats"
        onClick={() => {
          void copyGraphicCaption(totwStatsCaption(sheet)).then(
            () => onStatus("Week stats copied."),
            () => onStatus("Could not copy week stats."),
          );
        }}
      >
        Copy stats
      </button>
      <button
        type="button"
        className="sc-chip"
        disabled={!ready}
        aria-label="Download CSV"
        onClick={() => {
          downloadTotwStatsCsv(sheet);
          onStatus("Week stats CSV download started.");
        }}
      >
        Download CSV
      </button>
    </>
  );
}
