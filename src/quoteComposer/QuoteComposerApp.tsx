import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import {
  QUOTE_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { downloadExportPack } from "../instagramComposer/exportPack";
import {
  copyGraphicCaption,
  graphicCaption,
} from "../instagramComposer/graphicCaption";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { exportFilenameFromTitle } from "../instagramComposer/composerPresets";
import { readJson, writeJson } from "../lib/browserStorage";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { fetchLastGame } from "../playerOfTheDayComposer/lastGame";
import { useComposerStatsSample } from "../instagramComposer/composerStatsSample";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { KeepQuoteDialog } from "./KeepQuoteDialog";
import { QuoteGraphic } from "./QuoteGraphic";
import { exportQuotePng } from "./exportQuotePng";
import { renderQuoteCanvas } from "./renderQuoteCanvas";
import {
  ATTRIB_MAX,
  defaultQuoteDraft,
  clearQuoteSpeaker,
  fillQuoteFromPlayer,
  hasCustomPhoto,
  isQuoteDraft,
  lastGameQuotePresets,
  QUOTE_MAX,
  SOURCE_MAX,
  type QuoteDraft,
} from "./quoteState";
import "@fontsource/montserrat/latin-900.css";
import "./quoteComposer.css";

const STORAGE_KEY = "ddgm:quote-composer";
const SAVES_KEY = "ddgm:quote-composer:saves";

const loadDraft = (): QuoteDraft => {
  const stored = readJson<Partial<QuoteDraft>>(STORAGE_KEY);
  if (isQuoteDraft(stored)) {
    return {
      ...stored,
      showBa: stored.showBa !== false,
      source: stored.source ?? "",
    };
  }
  return defaultQuoteDraft();
};

export function QuoteComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<QuoteDraft>(defaultQuoteDraft);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(QUOTE_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [statsSample] = useComposerStatsSample();
  const [storyCrop, setStoryCrop] = useState(false);
  const [gamePresets, setGamePresets] = useState<string[]>([]);
  const [keepPrompt, setKeepPrompt] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);
  const [quotePrompt, setQuotePrompt] = useState<{
    playerId: string;
    playerName: string;
    keepPhoto: boolean;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<QuoteDraft>();

  useEffect(() => {
    document.title = "Quote graphic";
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  const handleExport = async (filename?: string, story = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    try {
      await exportQuotePng(
        node,
        filename ?? exportFilenameFromTitle(draft.quote, "quote"),
        { ...draft, look, purpleFlair },
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

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const commitPick = (
    playerId: string,
    keepCustomPhoto: boolean,
    keepQuote?: boolean,
  ) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    if (keepQuote === undefined && draft.quote.trim()) {
      setQuotePrompt({
        playerId,
        playerName: player.name,
        keepPhoto: keepCustomPhoto,
      });
      setKeepPrompt(null);
      setPickerOpen(false);
      return;
    }
    push(draft);
    setDraft((current) =>
      fillQuoteFromPlayer(player, current, keepCustomPhoto, keepQuote !== false),
    );
    setPickerOpen(false);
    setKeepPrompt(null);
    setQuotePrompt(null);
    setStatus(
      keepQuote === false
        ? `Filled ${player.name} — quote cleared. Upload a photo.`
        : `Filled ${player.name} — upload a photo.`,
    );
    void fetchLastGame(player.id, statsSample).then((game) => {
      setGamePresets(lastGameQuotePresets(game));
    });
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void dataUrlFromClipboard(event).then((dataUrl) => {
        if (!dataUrl) {
          return;
        }
        event.preventDefault();
        setDraft((current) => ({
          ...current,
          photoSrc: dataUrl,
          customPhoto: true,
          showHeadshot: true,
        }));
        setStatus("Pasted photo into the frame.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Quote"
        identity={
          <>
        <label className="sc-field sc-field--wide">
          Quote
          <input
            value={draft.quote}
            maxLength={QUOTE_MAX}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                quote: event.target.value.slice(0, QUOTE_MAX),
              }))
            }
          />
        </label>
        <label className="sc-field">
          Name
          <input
            value={draft.attribution}
            maxLength={ATTRIB_MAX}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                attribution: event.target.value.slice(0, ATTRIB_MAX),
              }))
            }
          />
        </label>
        <label className="sc-field">
          Source
          <input
            value={draft.source}
            maxLength={SOURCE_MAX}
            placeholder="optional"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                source: event.target.value.slice(0, SOURCE_MAX),
              }))
            }
          />
        </label>
          </>
        }
        data={
          gamePresets.length ? (
            <div className="sc-look" role="group" aria-label="Last-game quote presets">
              <span className="sc-look__label">Last game</span>
              {gamePresets.map((line) => (
                <button
                  key={line}
                  type="button"
                  className="sc-chip"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      quote: line.slice(0, QUOTE_MAX),
                    }))
                  }
                >
                  {line}
                </button>
              ))}
            </div>
          ) : null
        }
        board={
          <>
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">Photo</span>
          <button
            type="button"
            className={draft.showHeadshot ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={draft.showHeadshot}
            onClick={() =>
              setDraft((current) => ({
                ...current,
                showHeadshot: !current.showHeadshot,
              }))
            }
          >
            {draft.showHeadshot ? "On" : "Off"}
          </button>
        </label>
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <BaMarkToggle
          on={draft.showBa !== false}
          onChange={(showBa) => setDraft((current) => ({ ...current, showBa }))}
        />
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">9:16 crop</span>
          <button
            type="button"
            className={storyCrop ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={storyCrop}
            aria-label="9:16 crop check"
            onClick={() => setStoryCrop((on) => !on)}
          >
            {storyCrop ? "On" : "Off"}
          </button>
        </label>
          </>
        }
        persist={
        <ComposerSaves
          storageKey={SAVES_KEY}
          board={draft}
          onLoad={(next) => {
            setDraft({ ...next, source: next.source ?? "" });
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
                setDraft(previous);
              }
            }}
            disabled={!canUndo}
          >
            Undo
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              push(draft);
              setDraft(defaultQuoteDraft());
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() =>
              void copyGraphicCaption(
                graphicCaption(draft.quote, [], [draft.attribution, draft.source]),
              )
            }
          >
            Copy caption
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() =>
              void handleExport(
                exportFilenameFromTitle(draft.quote, "quote", "", true),
                true,
              )
            }
            disabled={exporting}
          >
            Export 9:16
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              void (async () => {
                setExporting(true);
                try {
                  await downloadExportPack(
                    () => renderQuoteCanvas({ ...draft, look, purpleFlair }, 2),
                    exportFilenameFromTitle(draft.quote, "quote"),
                  );
                  setStatus("Pack download started (4:5 + 9:16).");
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
            <QuoteGraphic
              ref={boardRef}
              draft={draft}
              look={look}
              purpleFlair={purpleFlair}
              exporting={exporting}
              onQuoteChange={(quote) =>
                setDraft((current) => ({ ...current, quote }))
              }
              onSourceChange={(source) =>
                setDraft((current) => ({ ...current, source }))
              }
              onPan={(pan) => setDraft((current) => ({ ...current, pan }))}
              onUpload={(photoSrc) =>
                setDraft((current) => ({
                  ...current,
                  photoSrc,
                  customPhoto: true,
                  showHeadshot: true,
                }))
              }
              onPick={() => setPickerOpen(true)}
            />
            <StoryCropGuide on={storyCrop} />
          </ComposerBoard>
          <p className="sc-hint">
            Empty photo first — last-name masthead up top, pull-quote on the
            lower fade. Changing the player asks whether to keep the quote.
            Downloads a 4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>
      {pickerOpen ? (
        <PlayerPicker
          heading="Pick a speaker"
          hint="Sets the last-name masthead and team color. No mugshot — upload or paste the photo."
          currentId={draft.playerId}
          usedLabels={
            draft.playerId ? { [draft.playerId]: "Quote" } : {}
          }
          onPick={(playerId) => {
            const player = getPlayer(playerId);
            if (!player) {
              return;
            }
            if (hasCustomPhoto(draft)) {
              setKeepPrompt({ playerId, playerName: player.name });
              setPickerOpen(false);
              return;
            }
            commitPick(playerId, false);
          }}
          onClear={() => {
            push(draft);
            setDraft((current) => clearQuoteSpeaker(current));
            setPickerOpen(false);
          }}
          onClose={closePicker}
        />
      ) : null}
      {keepPrompt ? (
        <KeepCustomPhotoDialog
          playerName={keepPrompt.playerName}
          onKeep={() => commitPick(keepPrompt.playerId, true)}
          onReplace={() => commitPick(keepPrompt.playerId, false)}
          onClose={() => setKeepPrompt(null)}
        />
      ) : null}
      {quotePrompt ? (
        <KeepQuoteDialog
          playerName={quotePrompt.playerName}
          quote={draft.quote}
          onKeep={() =>
            commitPick(quotePrompt.playerId, quotePrompt.keepPhoto, true)
          }
          onClear={() =>
            commitPick(quotePrompt.playerId, quotePrompt.keepPhoto, false)
          }
          onClose={() => setQuotePrompt(null)}
        />
      ) : null}
    </div>
  );
}
