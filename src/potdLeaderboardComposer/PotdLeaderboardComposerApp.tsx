import { useEffect, useRef, useState } from "react";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import {
  POTD_LEADERBOARD_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import {
  LEADERBOARD_TITLE_PRESETS,
  exportDateStamp,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { copyGraphicCaption, graphicCaption } from "../instagramComposer/graphicCaption";
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
  readPotdPairKeys,
  removeLeaderboardEntry,
  writeLeaderboardDraft,
  type LeaderboardEntry,
} from "./potdLeaderboardState";
import "@fontsource/montserrat/latin-900.css";
import "./potdLeaderboardComposer.css";
import { confirmBlankPost } from "../instagramComposer/confirmBlankPost";

export function PotdLeaderboardComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultLeaderboardDraft();
  const [title, setTitle] = useState(empty.title);
  const [entries, setEntries] = useState<LeaderboardEntry[]>(empty.entries);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(POTD_LEADERBOARD_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [showBa, setShowBa] = useState(false);
  const [showPips, setShowPips] = useState(true);
  const [potdKeys, setPotdKeys] = useState<string[]>([]);
  const { push, pop, canUndo } = useComposerUndo<LeaderboardEntry[]>();

  useEffect(() => {
    document.title = "POTD Leaderboard graphic";
  }, []);

  useEffect(() => {
    const draft = readLeaderboardDraft();
    setTitle(draft.title);
    setEntries(draft.entries);
    setShowBa(draft.showBa === true);
    setShowPips(draft.showPips !== false);
    setPotdKeys(readPotdPairKeys());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeLeaderboardDraft({ title, entries, showBa, showPips });
  }, [title, entries, showBa, showPips, hydrated]);

  const filenameFor = (story = false) =>
    exportFilenameFromTitle(title, "potd-leaderboard", exportDateStamp(), story);

  const handleExport = async (story = false, square = false) => {
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
        { title, entries, look, purpleFlair, showBa, showPips, potdKeys },
        story,
        square,
      );
      setStatus(
        square
          ? "1:1 PNG download started."
          : story
            ? "Story PNG download started."
            : "Download started.",
      );
    } catch (error) {
      console.error(error);
      setStatus("Could not export PNG.");
    } finally {
      setExporting(false);
    }
  };

  const handleResetKeepPhotos = () => {
    const next = defaultLeaderboardDraft();
    push(entries);
    setTitle(next.title);
    setStatus("Reset — ranking kept.");
  };

  const handleReset = () => {
    if (!confirmBlankPost()) {
      return;
    }
    const next = defaultLeaderboardDraft();
    push(entries);
    setTitle(next.title);
    setEntries(next.entries);
    setShowPips(next.showPips !== false);
    setStatus("Blank post.");
  };

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="POTD Leaderboard"
        identity={
          <>
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
          </>
        }
        data={
          <button
            type="button"
            className="sc-chip"
            onClick={() => {
              push(entries);
              setEntries((current) => addLeaderboardEntry(current));
            }}
            disabled={entries.length >= LEADERBOARD_MAX_ROWS}
          >
            Add player
          </button>
        }
        board={
          <>
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">Team pip</span>
          <button
            type="button"
            className={showPips ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={showPips}
            aria-label="Team pip"
            onClick={() => setShowPips((on) => !on)}
          >
            {showPips ? "On" : "Off"}
          </button>
        </label>
          </>
        }
        persist={
        <ComposerSaves
          storageKey="ddgm:potd-leaderboard-composer:saves"
          board={{ title, entries, showBa, showPips }}
          onLoad={(next) => {
            setTitle(next.title);
            setEntries(next.entries);
            setShowBa(next.showBa === true);
            setShowPips(next.showPips !== false);
            setStatus("Loaded named graphic.");
          }}
        />
        }
        actions={
          <>
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
          <button type="button" className="sc-btn sc-btn--ghost" onClick={handleResetKeepPhotos}>
            Reset keep photos
          </button>
          <button type="button" className="sc-btn sc-btn--ghost" onClick={handleReset}>
            Blank post
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() =>
              void copyGraphicCaption(
                graphicCaption(
                  title,
                  entries.map((entry) => entry.name).filter(Boolean),
                ),
              ).then(
                () => setStatus("Caption copied."),
                () => setStatus("Could not copy caption."),
              )
            }
          >
            Copy caption
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost sc-hud-full-only"
            onClick={() => void handleExport(true)}
            disabled={exporting}
          >
            Export 9:16
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost sc-btn--aside sc-hud-full-only"
            onClick={() => void handleExport(false, true)}
            disabled={exporting}
            aria-label="Export 1:1"
          >
            Export 1:1
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--primary"
            onClick={() => void handleExport()}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Export PNG"}
          </button>
          </>
        }
      />

      <main className="sc-stage">
        <div className="sc-stage__frame">
          <ComposerBoard>
          <PotdLeaderboardGraphic
            ref={boardRef}
            title={title}
            entries={entries}
            look={look}
            purpleFlair={purpleFlair}
            showBa={showBa}
            showPips={showPips}
            potdKeys={potdKeys}
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
          </ComposerBoard>
          <p className="sc-hint">
            Add names and win totals. Ranks (and T for ties) fill in
            automatically. Team pip adds a small logo; off is all yellow.
            Today’s Player of the Day pair is highlighted. Downloads a 4:5
            Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>
    </div>
  );
}
