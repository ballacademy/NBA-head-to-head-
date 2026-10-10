import { useCallback, useEffect, useRef, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";
import { TeamPicker } from "../standingsComposer/TeamPicker";
import { exportTierFilename, exportTierListPng } from "./exportTierPng";
import {
  TierListGraphic,
  type TierPickerTarget,
} from "./TierListGraphic";
import {
  addTeamToRow,
  addTier,
  createDefaultRows,
  DEFAULT_TIER_TITLE,
  isTierDraft,
  MAX_TIERS,
  MIN_TIERS,
  placeTeamAt,
  removeLastTier,
  removeTeamFromRow,
  replaceTeamInRow,
  setTierLabel,
  usedLabelsForPicker,
  type TierRow,
} from "./tierState";
import "@fontsource/montserrat/latin-900.css";
import "./tierListComposer.css";

const STORAGE_KEY = "ddgm:tier-list-composer";

interface TierComposerDraft {
  title: string;
  rows: TierRow[];
}

const loadDraft = (): TierComposerDraft => {
  const stored = readJson<Partial<TierComposerDraft>>(STORAGE_KEY);
  if (isTierDraft(stored)) {
    return { title: stored.title.trim() || DEFAULT_TIER_TITLE, rows: stored.rows };
  }
  return {
    title: stored?.title?.trim() ? stored.title : DEFAULT_TIER_TITLE,
    rows: createDefaultRows(),
  };
};

export function TierListComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [title, setTitle] = useState(DEFAULT_TIER_TITLE);
  const [rows, setRows] = useState<TierRow[]>(createDefaultRows);
  const [active, setActive] = useState<TierPickerTarget | null>(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    document.title = "Tier list graphic";
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    setTitle(draft.title);
    setRows(draft.rows);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, { title, rows });
  }, [title, rows, hydrated]);

  const closePicker = useCallback(() => setActive(null), []);

  const handleExport = async () => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    setStatus("Rendering PNG…");
    setActive(null);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await exportTierListPng(node, exportTierFilename(title), { title, rows });
      setStatus("Download started.");
    } catch (error) {
      console.error(error);
      setStatus("Could not export PNG.");
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    setTitle(DEFAULT_TIER_TITLE);
    setRows(createDefaultRows());
    setActive(null);
    setStatus("Board cleared.");
  };

  const pickerRow = active ? rows[active.rowIndex] : null;

  return (
    <div className="sc-composer">
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">Tier list graphic</h1>
        </div>
        <label className="sc-field sc-field--wide">
          Title
          <input
            value={title}
            maxLength={48}
            onChange={(event) => setTitle(event.target.value.toUpperCase())}
          />
        </label>
        <div className="sc-toolbar__actions">
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => setRows((current) => addTier(current))}
            disabled={rows.length >= MAX_TIERS}
          >
            Add tier
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => setRows((current) => removeLastTier(current))}
            disabled={rows.length <= MIN_TIERS}
          >
            Remove tier
          </button>
          <button type="button" className="sc-btn sc-btn--ghost" onClick={handleReset}>
            Reset
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--primary"
            onClick={() => void handleExport()}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Export PNG"}
          </button>
        </div>
      </header>

      <main className="sc-stage">
        <div className="sc-stage__frame">
          <TierListGraphic
            ref={boardRef}
            title={title}
            rows={rows}
            active={exporting ? null : active}
            exporting={exporting}
            onTitleChange={setTitle}
            onLabelChange={(index, label) =>
              setRows((current) => setTierLabel(current, index, label))
            }
            onSelectAdd={(rowIndex) =>
              setActive({ rowIndex, replaceId: null })
            }
            onSelectTeam={(rowIndex, teamId) =>
              setActive({ rowIndex, replaceId: teamId })
            }
            onRemoveTeam={(rowIndex, teamId) =>
              setRows((current) => removeTeamFromRow(current, rowIndex, teamId))
            }
            onPlaceTeam={(rowIndex, index, teamId) =>
              setRows((current) => placeTeamAt(current, rowIndex, index, teamId))
            }
          />
          <p className="sc-hint">
            Click a square to add a team. Tiers range from 3 to 10. Title and
            letters are editable. Downloads a 4:5 Instagram PNG — nothing is
            posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {active && pickerRow ? (
        <TeamPicker
          heading={`Pick team · ${pickerRow.label || "tier"}`}
          hint="Click a club to add it to this tier. Used teams move here."
          currentId={active.replaceId}
          usedLabels={usedLabelsForPicker(rows, active.rowIndex, active.replaceId)}
          clearLabel={active.replaceId ? "Remove from row" : "Clear slot"}
          onPick={(teamId) => {
            setRows((current) =>
              active.replaceId
                ? replaceTeamInRow(
                    current,
                    active.rowIndex,
                    active.replaceId,
                    teamId,
                  )
                : addTeamToRow(current, active.rowIndex, teamId),
            );
            setActive(null);
          }}
          onClear={
            active.replaceId
              ? () => {
                  setRows((current) =>
                    removeTeamFromRow(
                      current,
                      active.rowIndex,
                      active.replaceId as string,
                    ),
                  );
                  setActive(null);
                }
              : undefined
          }
          onClose={closePicker}
        />
      ) : null}
    </div>
  );
}
