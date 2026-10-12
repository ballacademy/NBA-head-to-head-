import { useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import {
  POTD_LEADERBOARD_LOOK_KEY,
  useComposerLook,
} from "../instagramComposer/composerLook";
import {
  LEADERBOARD_TITLE_PRESETS,
  exportDateStamp,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  onComposerTextChange,
} from "../instagramComposer/titleLayout";
import { exportPotdLeaderboardPng } from "./exportPotdLeaderboardPng";
import { PotdLeaderboardGraphic } from "./PotdLeaderboardGraphic";
import {
  addLeaderboardEntry,
  defaultLeaderboardDraft,
  LEADERBOARD_MAX_ROWS,
  patchLeaderboardEntry,
  readLeaderboardDraft,
  removeLeaderboardEntry,
  writeLeaderboardDraft,
  type LeaderboardEntry,
} from "./potdLeaderboardState";
import "@fontsource/montserrat/latin-900.css";
import "./potdLeaderboardComposer.css";

export function PotdLeaderboardComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultLeaderboardDraft();
  const [title, setTitle] = useState(empty.title);
  const [entries, setEntries] = useState<LeaderboardEntry[]>(empty.entries);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(POTD_LEADERBOARD_LOOK_KEY);
  const [showBa, setShowBa] = useState(false);
  const { push, pop, canUndo } = useComposerUndo<LeaderboardEntry[]>();

  useEffect(() => {
    document.title = "POTD Leaderboard graphic";
  }, []);

  useEffect(() => {
    const draft = readLeaderboardDraft();
    setTitle(draft.title);
    setEntries(draft.entries);
    setShowBa(draft.showBa === true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeLeaderboardDraft({ title, entries, showBa });
  }, [title, entries, showBa, hydrated]);

  const filenameFor = (story = false) =>
    exportFilenameFromTitle(title, "potd-leaderboard", exportDateStamp(), story);

  const handleExport = async (story = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    setStatus("Rendering PNG…");
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await exportPotdLeaderboardPng(
        node,
        filenameFor(story),
        { title, entries, look, showBa },
        story,
      );
      setStatus(story ? "Story PNG download started." : "Download started.");
    } catch (error) {
      console.error(error);
      setStatus("Could not export PNG.");
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    const next = defaultLeaderboardDraft();
    push(entries);
    setTitle(next.title);
    setEntries(next.entries);
    setStatus("Board cleared.");
  };

  return (
    <div className="sc-composer">
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">POTD Leaderboard</h1>
        </div>
        <label className="sc-field sc-field--wide">
          Title
          <input
            value={title}
            maxLength={COMPOSER_TITLE_MAX_LENGTH}
            onChange={(event) => onComposerTextChange(event, setTitle)}
          />
        </label>
        <TitlePresetSelect
          value={title}
          presets={LEADERBOARD_TITLE_PRESETS}
          onChange={setTitle}
        />
        <ComposerLookToggle look={look} onChange={setLook} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <div className="sc-toolbar__actions">
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              push(entries);
              setEntries((current) => addLeaderboardEntry(current));
            }}
            disabled={entries.length >= LEADERBOARD_MAX_ROWS}
          >
            Add player
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              const previous = pop();
              if (previous) {
                setEntries(previous);
                setStatus("Undid last change.");
              }
            }}
            disabled={!canUndo}
          >
            Undo
          </button>
          <button type="button" className="sc-btn sc-btn--ghost" onClick={handleReset}>
            Reset
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => void handleExport(true)}
            disabled={exporting}
          >
            Export 9:16
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
          <PotdLeaderboardGraphic
            ref={boardRef}
            title={title}
            entries={entries}
            look={look}
            showBa={showBa}
            exporting={exporting}
            onTitleChange={setTitle}
            onNameChange={(id, name) =>
              setEntries((current) => patchLeaderboardEntry(current, id, { name }))
            }
            onWinsChange={(id, wins) =>
              setEntries((current) => patchLeaderboardEntry(current, id, { wins }))
            }
            onRemove={(id) => {
              push(entries);
              setEntries((current) => removeLeaderboardEntry(current, id));
            }}
          />
          <p className="sc-hint">
            Add names and win totals. Ranks (and T for ties) fill in
            automatically. Player of the Day TOTAL uses these counts.
            Downloads a 4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>
    </div>
  );
}
