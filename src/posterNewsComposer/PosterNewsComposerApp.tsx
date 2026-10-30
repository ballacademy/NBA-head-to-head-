import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerHudSelect } from "../instagramComposer/ComposerHudSelect";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { LetterGradeHud } from "../instagramComposer/LetterGradeHud";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import { confirmBlankPost } from "../instagramComposer/confirmBlankPost";
import { rememberComposerPlayer } from "../instagramComposer/composerCarry";
import { useComposerLook, usePurpleFlair } from "../instagramComposer/composerLook";
import { keepComposerPhotos } from "../instagramComposer/composerPhotos";
import { exportFilenameFromTitle } from "../instagramComposer/composerPresets";
import { copyGraphicCaption, graphicCaption } from "../instagramComposer/graphicCaption";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import { usePhotoGrade } from "../instagramComposer/photoGrade";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { DEFAULT_LETTER_GRADE, parseLetterGrade } from "../lib/letterGrade";
import { hydrateJsonStorage, readJson, writeJson } from "../lib/browserStorage";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_HEIGHT, STORY_DESIGN_HEIGHT } from "../standingsComposer/rankingState";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { PosterNewsGraphic } from "./PosterNewsGraphic";
import { exportPosterNewsPng } from "./exportPosterNewsPng";
import { renderPosterNewsCanvas } from "./renderPosterNewsCanvas";
import {
  applyPosterNewsPlayer,
  defaultPosterNewsDraft,
  hasCustomPosterPhoto,
  isPosterNewsDraft,
  normalizePosterNewsDraft,
  POSTER_KICKER_PRESETS,
  POSTER_NEWS_SAVES_KEY,
  POSTER_NEWS_STORAGE_KEY,
  parsePosterKicker,
  posterCaptionLines,
  setPosterNewsPhoto,
  type PosterNameMode,
  type PosterNewsDraft,
} from "./posterNewsState";
import "@fontsource/montserrat/latin-900.css";
import "./posterNewsComposer.css";

const LOOK_KEY = "ddgm:poster-news-composer-look";

const loadDraft = (): PosterNewsDraft => {
  const stored = readJson<Partial<PosterNewsDraft>>(POSTER_NEWS_STORAGE_KEY);
  if (isPosterNewsDraft(stored)) {
    return normalizePosterNewsDraft(stored);
  }
  return defaultPosterNewsDraft();
};

export function PosterNewsComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<PosterNewsDraft>(defaultPosterNewsDraft);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade, gradeIntensity, setGradeIntensity] =
    usePhotoGrade();
  const [storyCrop, setStoryCrop] = useState(false);
  const [keepPrompt, setKeepPrompt] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<PosterNewsDraft>();

  useEffect(() => {
    document.title = "Poster news";
    void hydrateJsonStorage().then(() => {
      setDraft(loadDraft());
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(POSTER_NEWS_STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const commitPick = (playerId: string, keepPhoto: boolean) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    rememberComposerPlayer(playerId);
    push(draft);
    setDraft((current) => applyPosterNewsPlayer(current, player, keepPhoto));
    setKeepPrompt(null);
    setPickerOpen(false);
    setStatus("Photo set — headline left alone.");
  };

  const renderInput = () => ({ ...draft, look, purpleFlair, photoGrade });
  const filenameFor = () =>
    exportFilenameFromTitle(
      `${draft.kicker} ${draft.family || draft.line1}`,
      "poster-news",
      draft.datePip,
      false,
      draft.family || draft.given,
    );

  const handleExport = async (story = false, square = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    try {
      await exportPosterNewsPng(node, filenameFor(), renderInput(), story, square);
      setStatus("Download started.");
    } catch (error) {
      console.error(error);
      setStatus("Could not export.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void dataUrlFromClipboard(event).then((dataUrl) => {
        if (!dataUrl) return;
        event.preventDefault();
        setDraft((current) => setPosterNewsPhoto(current, dataUrl));
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Poster news"
        identity={
          <label className="sc-field">
            Kicker
            <select
              value={parsePosterKicker(draft.kicker)}
              aria-label="Poster kicker"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  kicker: event.target.value,
                }))
              }
            >
              {POSTER_KICKER_PRESETS.map((kicker) => (
                <option key={kicker} value={kicker}>
                  {kicker}
                </option>
              ))}
            </select>
          </label>
        }
        data={
          <>
            <button type="button" className="sc-chip" onClick={() => setPickerOpen(true)}>
              Pick photo
            </button>
            <ComposerLookToggle look={look} onChange={setLook} />
            <BaMarkToggle
              on={draft.showBa !== false}
              onChange={(showBa) => setDraft((current) => ({ ...current, showBa }))}
            />
          </>
        }
        board={
          <>
            <ComposerHudSelect
              label="Stack"
              ariaLabel="Headline stack"
              value={draft.nameMode}
              options={[
                { value: "name-stack", label: "Name + headline" },
                { value: "even", label: "Three-line headline" },
              ]}
              onChange={(nameMode: PosterNameMode) =>
                setDraft((current) => ({ ...current, nameMode }))
              }
            />
            <ComposerHudSelect
              label="Date pip"
              ariaLabel="Date pip"
              value={draft.showDatePip ? "on" : "off"}
              options={[
                { value: "off", label: "Off" },
                { value: "on", label: "On" },
              ]}
              onChange={(value) =>
                setDraft((current) => ({ ...current, showDatePip: value === "on" }))
              }
            />
            <label className="sc-field sc-hud-full-only">
              Source
              <input
                value={draft.source}
                placeholder="Off"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, source: event.target.value }))
                }
              />
            </label>
            <LetterGradeHud
              on={draft.showLetterGrade === true}
              grade={parseLetterGrade(draft.letterGrade ?? DEFAULT_LETTER_GRADE)}
              reason={draft.letterGradeReason ?? ""}
              onToggle={(showLetterGrade) =>
                setDraft((current) => ({ ...current, showLetterGrade }))
              }
              onGrade={(letterGrade) =>
                setDraft((current) => ({ ...current, letterGrade }))
              }
              onReason={(letterGradeReason) =>
                setDraft((current) => ({ ...current, letterGradeReason }))
              }
            />
            <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
            <PhotoGradeToggle
              on={photoGrade}
              onChange={setPhotoGrade}
              intensity={gradeIntensity}
              onIntensityChange={setGradeIntensity}
            />
            <label className="sc-field">
              <span className="sc-toolbar__eyebrow">Story crop</span>
              <button
                type="button"
                className={storyCrop ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={storyCrop}
                onClick={() => setStoryCrop((on) => !on)}
              >
                {storyCrop ? "On" : "Off"}
              </button>
            </label>
          </>
        }
        persist={
          <ComposerSaves
            storageKey={POSTER_NEWS_SAVES_KEY}
            board={draft}
            onLoad={(next) => setDraft(normalizePosterNewsDraft(next))}
          />
        }
        actions={
          <>
            <button type="button" className="sc-chip" disabled={!canUndo} onClick={() => {
              const prev = pop();
              if (prev) setDraft(prev);
            }}>
              Undo
            </button>
            <button
              type="button"
              className="sc-chip"
              onClick={() =>
                copyGraphicCaption(
                  graphicCaption(draft.kicker, posterCaptionLines(draft).slice(1)),
                ).then(() => setStatus("Caption copied."))
              }
            >
              Copy caption
            </button>
            <button
              type="button"
              className="sc-chip"
              onClick={() => {
                push(draft);
                setDraft(keepComposerPhotos(defaultPosterNewsDraft(), draft));
                setStatus("Reset — photos kept.");
              }}
            >
              Reset keep photos
            </button>
            <button
              type="button"
              className="sc-chip"
              onClick={() => {
                if (!confirmBlankPost()) return;
                push(draft);
                setDraft(defaultPosterNewsDraft());
                setStatus("Blank post.");
              }}
            >
              Blank post
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              disabled={exporting}
              onClick={() => {
                void (async () => {
                  setExporting(true);
                  try {
                    const filename = filenameFor();
                    await downloadExportPack(
                      () => renderPosterNewsCanvas(renderInput(), 2),
                      filename,
                      [
                        {
                          filename: storyFilename(filename),
                          render: () =>
                            renderPosterNewsCanvas(
                              { ...renderInput(), story: true },
                              2,
                            ),
                        },
                      ],
                    );
                    setStatus("Pack download started (4:5 + 9:16 + 1:1).");
                  } catch (error) {
                    console.error(error);
                    setStatus("Could not export pack.");
                  } finally {
                    setExporting(false);
                  }
                })();
              }}
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
      {status ? <p className="sc-status">{status}</p> : null}
      <main className="sc-stage">
        <div className="sc-stage__frame">
          <div className="sc-board-wrap">
            <ComposerBoard height={storyCrop ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT}>
              <PosterNewsGraphic
                ref={boardRef}
                draft={draft}
                look={look}
                purpleFlair={purpleFlair}
                photoGrade={photoGrade}
                exporting={exporting}
                onKickerChange={(kicker) => setDraft((current) => ({ ...current, kicker }))}
                onGivenChange={(given) => setDraft((current) => ({ ...current, given }))}
                onFamilyChange={(family) => setDraft((current) => ({ ...current, family }))}
                onLineChange={(key, value) =>
                  setDraft((current) => ({ ...current, [key]: value }))
                }
                onDateChange={(datePip) => setDraft((current) => ({ ...current, datePip }))}
                onSourceChange={(source) => setDraft((current) => ({ ...current, source }))}
                onPan={(pan) => setDraft((current) => ({ ...current, pan }))}
                onUpload={(dataUrl) =>
                  setDraft((current) => setPosterNewsPhoto(current, dataUrl))
                }
                onPick={() => setPickerOpen(true)}
                onLetterGradeChange={(letterGrade) =>
                  setDraft((current) => ({ ...current, letterGrade }))
                }
                onLetterGradeReasonChange={(letterGradeReason) =>
                  setDraft((current) => ({ ...current, letterGradeReason }))
                }
              />
            </ComposerBoard>
            <StoryCropGuide on={storyCrop} />
          </div>
        </div>
      </main>
      {pickerOpen ? (
        <PlayerPicker
          heading="Pick poster photo"
          hint="Picking a name never writes the headline."
          currentId={draft.playerId}
          usedLabels={draft.playerId ? { [draft.playerId]: "Photo" } : {}}
          includeCoaches
          onClose={closePicker}
          onClear={() => {
            setDraft((current) => ({
              ...current,
              playerId: null,
              teamId: null,
              photoSrc: hasCustomPosterPhoto(current) ? current.photoSrc : null,
              customPhoto: hasCustomPosterPhoto(current),
            }));
            closePicker();
          }}
          onPick={(playerId) => {
            if (hasCustomPosterPhoto(draft)) {
              const player = getPlayer(playerId);
              setKeepPrompt({ playerId, playerName: player?.name ?? "this player" });
              setPickerOpen(false);
              return;
            }
            commitPick(playerId, false);
          }}
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
