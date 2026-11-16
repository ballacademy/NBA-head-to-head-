import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  exportPotdLeaderboardPack,
  exportPotdLeaderboardPng,
} from "./exportPotdLeaderboardPng";
import { PotdLeaderboardGraphic } from "./PotdLeaderboardGraphic";
import {
  addLeaderboardEntry,
  addNamedLeaderboardEntries,
  clampLeaderboardPage,
  defaultLeaderboardDraft,
  LEADERBOARD_MAX_ROWS,
  leaderboardPageCount,
  packLeaderboardPages,
  patchLeaderboardEntry,
  renameLeaderboardEntry,
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
  const [pageIndex, setPageIndex] = useState(0);
  const [draftName, setDraftName] = useState("");
  const { push, pop, canUndo } = useComposerUndo<LeaderboardEntry[]>();
  const pageCount = useMemo(
    () => leaderboardPageCount(entries),
    [entries],
  );
  const safePage = clampLeaderboardPage(pageIndex, entries);

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

  useEffect(() => {
    setPageIndex((current) => clampLeaderboardPage(current, entries));
  }, [entries, pageCount]);

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
      const input = {
        title,
        entries,
        look,
        purpleFlair,
        showBa,
        showPips,
        potdKeys,
        pageIndex: safePage,
      };
      await exportPotdLeaderboardPng(
        node,
        filenameFor(story),
        input,
        story,
        square,
      );
      const pages = packLeaderboardPages(entries).length;
      setStatus(
        pages > 1
          ? square
            ? `1:1 PNG download started (page ${safePage + 1} of ${pages}).`
            : story
              ? `Story PNG download started (page ${safePage + 1} of ${pages}).`
              : `Download started (page ${safePage + 1} of ${pages}).`
          : square
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
    setPageIndex(0);
    setDraftName("");
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
          <>
          <label className="sc-field sc-hud-simple-keep">
            Name
            <input
              value={draftName}
              maxLength={40}
              placeholder="Add a player"
              aria-label="Add player name"
              title={draftName || "Add a player"}
              onChange={(event) =>
                setDraftName(event.target.value.replace(/[\r\n]+/g, " "))
              }
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }
                event.preventDefault();
                const trimmed = draftName.replace(/\s+/g, " ").trim();
                if (!trimmed) {
                  return;
                }
                push(entries);
                setEntries(addNamedLeaderboardEntries([trimmed]));
                setDraftName("");
              }}
            />
          </label>
          <button
            type="button"
            className="sc-chip sc-hud-simple-keep"
            onClick={() => {
              const trimmed = draftName.replace(/\s+/g, " ").trim();
              push(entries);
              if (trimmed) {
                setEntries(addNamedLeaderboardEntries([trimmed]));
                setDraftName("");
                return;
              }
              setEntries((current) => addLeaderboardEntry(current));
            }}
            disabled={entries.length >= LEADERBOARD_MAX_ROWS}
          >
            Add player
          </button>
          {pageCount > 1 ? (
            <div
              className="sc-look sc-hud-simple-keep"
              role="group"
              aria-label="Leaderboard page"
            >
              <span className="sc-look__label">Page</span>
              {Array.from({ length: pageCount }, (_, index) => (
                <button
                  key={`plb-page-${index + 1}`}
                  type="button"
                  className={safePage === index ? "sc-chip is-on" : "sc-chip"}
                  aria-pressed={safePage === index}
                  aria-label={`Page ${index + 1}`}
                  onClick={() => setPageIndex(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          ) : null}
          </>
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
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              void (async () => {
                setExporting(true);
                setStatus("Rendering pack…");
                try {
                  await exportPotdLeaderboardPack(filenameFor(), {
                    title,
                    entries,
                    look,
                    purpleFlair,
                    showBa,
                    showPips,
                    potdKeys,
                  });
                  const pages = packLeaderboardPages(entries).length;
                  setStatus(
                    pages > 1
                      ? `Pack download started (${pages} linked pages).`
                      : "Pack download started (4:5 + 9:16 + 1:1).",
                  );
                } catch (error) {
                  console.error(error);
                  setStatus("Could not export pack.");
                } finally {
                  setExporting(false);
                }
              })();
            }}
            disabled={exporting}
          >
            Export pack
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
            pageIndex={safePage}
            onTitleChange={setTitle}
            onNameChange={(id, name) =>
              setEntries((current) => renameLeaderboardEntry(current, id, name))
            }
            onWinsChange={(id, wins) =>
              setEntries((current) => patchLeaderboardEntry(current, id, { wins }))
            }
            onRemove={(id) => {
              push(entries);
              setEntries((current) => removeLeaderboardEntry(current, id));
            }}
            onNextPage={() =>
              setPageIndex((current) =>
                clampLeaderboardPage(current + 1, entries),
              )
            }
          />
          </ComposerBoard>
          <p className="sc-hint">
            Add names and win totals. Ranks (and T for ties) fill in
            automatically. Overflow continues on page 2, 3… with the same
            list. Team pip adds a small logo; off is all yellow. Today’s
            Player of the Day pair is highlighted. Downloads a 4:5 Instagram
            PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>
    </div>
  );
}
