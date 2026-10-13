import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  RANKED_LINEUPS_LOOK_KEY,
  useComposerLook,
} from "../instagramComposer/composerLook";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  onComposerTextChange,
} from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  RANKED_LINEUP_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { RankedLineupsGraphic } from "./RankedLineupsGraphic";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { exportRankedLineupsPng } from "./exportRankedLineupsPng";
import {
  applyPlayerPick,
  clearStrip,
  defaultRankedLineupsDraft,
  hasCustomPhoto,
  isRankedLineupsDraft,
  lineupPosition,
  patchStrip,
  RANK_PILL_MAX,
  RANK_PILL_PRESETS,
  setStripPhoto,
  usedLineupPlayerIds,
  type RankedLineupStrip,
  type RankedLineupsDraft,
} from "./rankedLineupsState";
import "@fontsource/montserrat/latin-900.css";
import "@fontsource/montserrat/latin-900-italic.css";
import "./rankedLineupsComposer.css";

const STORAGE_KEY = "ddgm:ranked-lineups-composer";

const loadDraft = (): RankedLineupsDraft => {
  const stored = readJson<Partial<RankedLineupsDraft>>(STORAGE_KEY);
  if (isRankedLineupsDraft(stored)) {
    return stored;
  }
  const empty = defaultRankedLineupsDraft();
  return {
    brand: stored?.brand?.trim() ? stored.brand : empty.brand,
    title: stored?.title?.trim() ? stored.title : empty.title,
    rank: stored?.rank?.trim() ? stored.rank : empty.rank,
    strips: empty.strips,
    showBa: stored?.showBa === true,
  };
};

export function RankedLineupsComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultRankedLineupsDraft();
  const [brand, setBrand] = useState(empty.brand);
  const [title, setTitle] = useState(empty.title);
  const [rank, setRank] = useState(empty.rank);
  const [strips, setStrips] = useState<RankedLineupStrip[]>(empty.strips);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [photoTarget, setPhotoTarget] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(RANKED_LINEUPS_LOOK_KEY);
  const [showBa, setShowBa] = useState(false);
  const [keepPrompt, setKeepPrompt] = useState<{
    index: number;
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<RankedLineupStrip[]>();

  useEffect(() => {
    document.title = "Ranked lineups graphic";
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    setBrand(draft.brand);
    setTitle(draft.title);
    setRank(draft.rank);
    setStrips(draft.strips);
    setShowBa(draft.showBa === true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, { brand, title, rank, strips, showBa });
  }, [brand, title, rank, strips, showBa, hydrated]);

  const closePicker = useCallback(() => setActiveIndex(null), []);

  const handleExport = async (filename?: string, story = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    setStatus("Rendering PNG…");
    setActiveIndex(null);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await exportRankedLineupsPng(
        node,
        filename ??
          exportFilenameFromTitle(title, "ranked-lineups", rank.toLowerCase()),
        { brand, title, rank, strips, look, showBa },
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
    const next = defaultRankedLineupsDraft();
    push(strips);
    setBrand(next.brand);
    setTitle(next.title);
    setRank(next.rank);
    setStrips(next.strips);
    setActiveIndex(null);
    setStatus("Board cleared.");
  };

  const commitPick = (
    index: number,
    playerId: string,
    keepCustomPhoto: boolean,
  ) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    push(strips);
    setStrips((current) =>
      applyPlayerPick(current, index, player, keepCustomPhoto),
    );
    setActiveIndex(null);
    setKeepPrompt(null);
    setStatus(
      keepCustomPhoto
        ? `Kept the photo for ${player.name} at ${lineupPosition(index)}.`
        : `Filled ${player.name} at ${lineupPosition(index)}.`,
    );
  };

  const handlePick = (playerId: string) => {
    if (activeIndex == null) {
      return;
    }
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    const current = strips[activeIndex];
    if (current && hasCustomPhoto(current)) {
      setKeepPrompt({
        index: activeIndex,
        playerId: player.id,
        playerName: player.name,
      });
      setActiveIndex(null);
      return;
    }
    commitPick(activeIndex, player.id, false);
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void dataUrlFromClipboard(event).then((dataUrl) => {
        if (!dataUrl) {
          return;
        }
        event.preventDefault();
        const index = activeIndex ?? photoTarget;
        setStrips((current) => setStripPhoto(current, index, dataUrl));
        setStatus("Pasted photo into the strip.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [activeIndex, photoTarget]);

  const currentId =
    activeIndex != null ? strips[activeIndex]?.playerId ?? null : null;
  const activePos =
    activeIndex != null ? lineupPosition(activeIndex) : "PG";

  return (
    <div className="sc-composer">
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">Ranked lineups</h1>
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
          presets={RANKED_LINEUP_TITLE_PRESETS}
          onChange={setTitle}
        />
        <label className="sc-field">
          Rank
          <select
            value={
              (RANK_PILL_PRESETS as readonly string[]).includes(
                rank.toUpperCase(),
              )
                ? rank.toUpperCase()
                : ""
            }
            aria-label="Rank pill preset"
            onChange={(event) => {
              if (event.target.value) {
                setRank(event.target.value);
              }
            }}
          >
            <option value="">Custom</option>
            {RANK_PILL_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        </label>
        <label className="sc-field">
          Pill
          <input
            value={rank}
            maxLength={RANK_PILL_MAX}
            aria-label="Rank pill text"
            onChange={(event) =>
              setRank(event.target.value.slice(0, RANK_PILL_MAX))
            }
          />
        </label>
        <ComposerLookToggle look={look} onChange={setLook} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <div className="sc-toolbar__actions">
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              const previous = pop();
              if (previous) {
                setStrips(previous);
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
            onClick={() =>
              void handleExport(
                exportFilenameFromTitle(
                  title,
                  "ranked-lineups",
                  rank.toLowerCase(),
                  true,
                ),
                true,
              )
            }
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
          <RankedLineupsGraphic
            ref={boardRef}
            brand={brand}
            title={title}
            rank={rank}
            strips={strips}
            look={look}
            showBa={showBa}
            exporting={exporting}
            onBrandChange={setBrand}
            onTitleChange={setTitle}
            onRankChange={setRank}
            onPick={(index) => {
              setPhotoTarget(index);
              setActiveIndex(index);
            }}
            onPan={(index, pan) => {
              setPhotoTarget(index);
              setStrips((current) => patchStrip(current, index, { pan }));
            }}
            onUpload={(index, dataUrl) => {
              setPhotoTarget(index);
              setStrips((current) => setStripPhoto(current, index, dataUrl));
              setStatus(
                "Photo cropped inside the strip — pinch, scroll, or +/− to scale, drag to pan.",
              );
            }}
            onNameChange={(index, names) => {
              setStrips((current) => patchStrip(current, index, names));
            }}
          />
          <p className="sc-hint">
            Five PG–C strips for one carousel part. Edit the rank pill (BEST,
            2ND, 3RD…) for the next slide. Pick a player, then upload or paste a
            photo — pan and zoom like Team of the Week. Downloads a 4:5
            Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null ? (
        <PlayerPicker
          heading={`Pick ${activePos}`}
          hint={`Only one player per strip. We’ll drop their headshot into ${activePos} — upload your own photo to replace it.`}
          currentId={currentId}
          usedLabels={usedLineupPlayerIds(strips)}
          onPick={handlePick}
          onClear={() => {
            push(strips);
            setStrips((current) => clearStrip(current, activeIndex));
            setActiveIndex(null);
          }}
          onClose={closePicker}
        />
      ) : null}
      {keepPrompt ? (
        <KeepCustomPhotoDialog
          playerName={keepPrompt.playerName}
          onKeep={() => commitPick(keepPrompt.index, keepPrompt.playerId, true)}
          onReplace={() =>
            commitPick(keepPrompt.index, keepPrompt.playerId, false)
          }
          onClose={() => setKeepPrompt(null)}
        />
      ) : null}
    </div>
  );
}
