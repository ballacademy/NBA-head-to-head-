import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import {
  copyGraphicCaption,
  graphicCaption,
} from "../instagramComposer/graphicCaption";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  HEADLINE_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  HEADLINE_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { NBA_TEAMS } from "../standingsComposer/teams";
import { HeadlineGraphic } from "./HeadlineGraphic";
import { exportHeadlinePng } from "./exportHeadlinePng";
import {
  clearHeadlineSubject,
  clipHeadlineBody,
  defaultHeadlineDraft,
  fillHeadlineFromPlayer,
  hasCustomPhoto,
  HEADLINE_BODY_MAX,
  isHeadlineDraft,
  setHeadlinePhoto,
  type HeadlineDraft,
} from "./headlineState";
import "@fontsource/montserrat/latin-900.css";
import "@fontsource/montserrat/latin-900-italic.css";
import "./headlineComposer.css";

const STORAGE_KEY = "ddgm:headline-composer";
const SAVES_KEY = "ddgm:headline-composer:saves";

const loadDraft = (): HeadlineDraft => {
  const stored = readJson<Partial<HeadlineDraft>>(STORAGE_KEY);
  if (isHeadlineDraft(stored)) {
    return { ...stored, showBa: stored.showBa !== false };
  }
  return defaultHeadlineDraft();
};

export function HeadlineComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultHeadlineDraft();
  const [draft, setDraft] = useState<HeadlineDraft>(empty);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(HEADLINE_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [keepPrompt, setKeepPrompt] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<HeadlineDraft>();

  useEffect(() => {
    document.title = "Headline graphic";
  }, []);

  useEffect(() => {
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, draft);
  }, [draft, hydrated]);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const handleExport = async (filename?: string, story = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    setStatus("Rendering PNG…");
    setPickerOpen(false);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await exportHeadlinePng(
        node,
        filename ?? exportFilenameFromTitle(draft.headline, "headline"),
        {
          headline: draft.headline,
          body: draft.body,
          teamId: draft.teamId,
          photoSrc: draft.photoSrc,
          pan: draft.pan,
          look,
          purpleFlair,
          showBa: draft.showBa,
        },
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

  const commitPick = (playerId: string, keepCustomPhoto: boolean) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    push(draft);
    setDraft((current) => fillHeadlineFromPlayer(player, current, keepCustomPhoto));
    setPickerOpen(false);
    setKeepPrompt(null);
    setStatus(
      keepCustomPhoto
        ? `Kept the photo for ${player.name}.`
        : `Filled ${player.name}.`,
    );
  };

  const handlePick = (playerId: string) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    if (hasCustomPhoto(draft)) {
      setKeepPrompt({ playerId: player.id, playerName: player.name });
      setPickerOpen(false);
      return;
    }
    commitPick(player.id, false);
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void dataUrlFromClipboard(event).then((dataUrl) => {
        if (!dataUrl) {
          return;
        }
        event.preventDefault();
        setDraft((current) => setHeadlinePhoto(current, dataUrl));
        setStatus("Pasted photo into the frame.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="sc-composer">
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">Headline</h1>
        </div>
        <label className="sc-field sc-field--wide">
          Headline
          <input
            value={draft.headline}
            maxLength={32}
            onChange={(event) =>
              onComposerTextChange(
                event,
                (headline) => setDraft((current) => ({ ...current, headline })),
                32,
              )
            }
          />
        </label>
        <TitlePresetSelect
          value={draft.headline}
          presets={HEADLINE_TITLE_PRESETS}
          onChange={(headline) => setDraft((current) => ({ ...current, headline }))}
        />
        <label className="sc-field sc-field--wide">
          Body
          <input
            value={draft.body}
            maxLength={HEADLINE_BODY_MAX}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                body: clipHeadlineBody(event.target.value),
              }))
            }
          />
        </label>
        <label className="sc-field">
          Team
          <select
            value={draft.teamId ?? ""}
            aria-label="Team watermark"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                teamId: event.target.value || null,
              }))
            }
          >
            <option value="">None</option>
            {NBA_TEAMS.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <BaMarkToggle
          on={draft.showBa !== false}
          onChange={(showBa) => setDraft((current) => ({ ...current, showBa }))}
        />
        <ComposerSaves
          storageKey={SAVES_KEY}
          board={draft}
          onLoad={(next) => {
            setDraft(next);
            setStatus("Loaded named graphic.");
          }}
        />
        <div className="sc-toolbar__actions">
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              const previous = pop();
              if (previous) {
                setDraft(previous);
                setStatus("Undid last change.");
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
              setDraft(defaultHeadlineDraft());
              setStatus("Board cleared.");
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              void copyGraphicCaption(
                graphicCaption(draft.headline, [], [draft.body]),
              ).then(
                () => setStatus("Caption copied."),
                () => setStatus("Could not copy caption."),
              );
            }}
          >
            Copy caption
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() =>
              void handleExport(
                exportFilenameFromTitle(draft.headline, "headline", "", true),
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
          <HeadlineGraphic
            ref={boardRef}
            headline={draft.headline}
            body={draft.body}
            teamId={draft.teamId}
            photoSrc={draft.photoSrc}
            customPhoto={draft.customPhoto}
            pan={draft.pan}
            look={look}
            purpleFlair={purpleFlair}
            showBa={draft.showBa !== false}
            exporting={exporting}
            onHeadlineChange={(headline) =>
              setDraft((current) => ({ ...current, headline }))
            }
            onBodyChange={(body) => setDraft((current) => ({ ...current, body }))}
            onPan={(pan) => setDraft((current) => ({ ...current, pan }))}
            onUpload={(dataUrl) => {
              setDraft((current) => setHeadlinePhoto(current, dataUrl));
              setStatus(
                "Photo cropped inside the frame — pinch, scroll, or +/− to scale, drag to pan.",
              );
            }}
            onPick={() => setPickerOpen(true)}
          />
          <p className="sc-hint">
            Full-bleed photo with a headline plate and body line. Pick a team
            for the watermark, then upload or paste a photo and pan/zoom like
            Player of the Day. Downloads a 4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {pickerOpen ? (
        <PlayerPicker
          heading="Pick a player"
          hint="Optional — drops their headshot in. Upload or paste a custom action photo anytime."
          currentId={draft.playerId}
          usedLabels={
            draft.playerId ? { [draft.playerId]: "Headline" } : {}
          }
          onPick={handlePick}
          onClear={() => {
            push(draft);
            setDraft((current) => clearHeadlineSubject(current));
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
    </div>
  );
}
