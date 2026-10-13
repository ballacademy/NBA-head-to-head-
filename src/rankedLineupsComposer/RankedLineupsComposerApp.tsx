import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  RANKED_LINEUPS_LOOK_KEY,
  useComposerLook,
} from "../instagramComposer/composerLook";
import {
  copyGraphicCaption,
  rankedLineupCaption,
} from "../instagramComposer/graphicCaption";
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
  clampActiveSlide,
  clearStrip,
  defaultRankedLineupsDraft,
  emptyLineupSlide,
  hasCustomPhoto,
  isRankedLineupsDraft,
  lineupPosition,
  nextRankPill,
  patchStrip,
  RANK_PILL_MAX,
  RANK_PILL_PRESETS,
  setStripPhoto,
  slidesFromDraft,
  usedLineupPlayerIds,
  withActiveSlide,
  type RankedLineupSlide,
  type RankedLineupStrip,
  type RankedLineupsDraft,
} from "./rankedLineupsState";
import "@fontsource/montserrat/latin-900.css";
import "@fontsource/montserrat/latin-900-italic.css";
import "./rankedLineupsComposer.css";

const STORAGE_KEY = "ddgm:ranked-lineups-composer";
const SAVES_KEY = "ddgm:ranked-lineups-composer:saves";

const loadDraft = (): RankedLineupsDraft => {
  const stored = readJson<Partial<RankedLineupsDraft>>(STORAGE_KEY);
  const empty = defaultRankedLineupsDraft();
  if (isRankedLineupsDraft(stored)) {
    const slides = slidesFromDraft(stored);
    return withActiveSlide(
      {
        ...empty,
        ...stored,
        showBa: stored.showBa === true,
        showFade: stored.showFade === true,
      },
      slides,
      stored.activeSlide ?? 0,
    );
  }
  return {
    ...empty,
    brand: stored?.brand?.trim() ? stored.brand : empty.brand,
    title: stored?.title?.trim() ? stored.title : empty.title,
    showBa: stored?.showBa === true,
    showFade: stored?.showFade === true,
  };
};

export function RankedLineupsComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultRankedLineupsDraft();
  const [brand, setBrand] = useState(empty.brand);
  const [title, setTitle] = useState(empty.title);
  const [rank, setRank] = useState(empty.rank);
  const [strips, setStrips] = useState<RankedLineupStrip[]>(empty.strips);
  const [slides, setSlides] = useState<RankedLineupSlide[]>(empty.slides ?? []);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [photoTarget, setPhotoTarget] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(RANKED_LINEUPS_LOOK_KEY);
  const [showBa, setShowBa] = useState(false);
  const [showFade, setShowFade] = useState(false);
  const [keepPrompt, setKeepPrompt] = useState<{
    index: number;
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<RankedLineupStrip[]>();

  const persistSlide = useCallback(
    (nextStrips: RankedLineupStrip[], nextRank = rank, index = activeSlide) => {
      setSlides((current) =>
        current.map((slide, slideIndex) =>
          slideIndex === index
            ? { rank: nextRank, strips: nextStrips }
            : slide,
        ),
      );
    },
    [activeSlide, rank],
  );

  useEffect(() => {
    document.title = "Ranked lineups graphic";
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    setBrand(draft.brand);
    setTitle(draft.title);
    setRank(draft.rank);
    setStrips(draft.strips);
    setSlides(slidesFromDraft(draft));
    setActiveSlide(draft.activeSlide ?? 0);
    setShowBa(draft.showBa === true);
    setShowFade(draft.showFade === true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, {
      brand,
      title,
      rank,
      strips,
      slides,
      activeSlide,
      showBa,
      showFade,
    });
  }, [brand, title, rank, strips, slides, activeSlide, showBa, showFade, hydrated]);

  const closePicker = useCallback(() => setActiveIndex(null), []);

  const applyDraft = (draft: RankedLineupsDraft) => {
    const next = withActiveSlide(
      draft,
      slidesFromDraft(draft),
      draft.activeSlide ?? 0,
    );
    setBrand(next.brand);
    setTitle(next.title);
    setRank(next.rank);
    setStrips(next.strips);
    setSlides(slidesFromDraft(next));
    setActiveSlide(next.activeSlide ?? 0);
    setShowBa(next.showBa === true);
    setShowFade(next.showFade === true);
    setActiveIndex(null);
  };

  const selectSlide = (index: number) => {
    const committed = slides.map((slide, slideIndex) =>
      slideIndex === activeSlide ? { rank, strips } : slide,
    );
    const nextIndex = clampActiveSlide(committed, index);
    const slide = committed[nextIndex];
    if (!slide) {
      return;
    }
    setSlides(committed);
    setActiveSlide(nextIndex);
    setRank(slide.rank);
    setStrips(slide.strips);
    setActiveIndex(null);
  };

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
        { brand, title, rank, strips, look, showBa, showFade },
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

  const handleExportAll = async () => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    setActiveIndex(null);
    try {
      for (const [index, slide] of slides.entries()) {
        setStatus(`Rendering slide ${index + 1} of ${slides.length}…`);
        await exportRankedLineupsPng(
          node,
          exportFilenameFromTitle(
            title,
            "ranked-lineups",
            slide.rank.toLowerCase(),
          ),
          {
            brand,
            title,
            rank: slide.rank,
            strips: slide.strips,
            look,
            showBa,
            showFade,
          },
        );
        await new Promise((resolve) => window.setTimeout(resolve, 280));
      }
      setStatus(`Exported ${slides.length} PNG${slides.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error(error);
      setStatus("Could not export all slides.");
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    const next = defaultRankedLineupsDraft();
    push(strips);
    applyDraft(next);
    setStatus("Board cleared.");
  };

  const handleNextSlide = () => {
    const nextRank = nextRankPill(rank);
    const next = emptyLineupSlide(nextRank);
    const nextSlides = [
      ...slides.slice(0, activeSlide),
      { rank, strips },
      next,
    ];
    push(strips);
    setSlides(nextSlides);
    setActiveSlide(nextSlides.length - 1);
    setRank(next.rank);
    setStrips(next.strips);
    setActiveIndex(null);
    setStatus(`Started ${next.rank} with the same title.`);
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
    setStrips((current) => {
      const next = applyPlayerPick(current, index, player, keepCustomPhoto);
      persistSlide(next);
      return next;
    });
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
        setStrips((current) => {
          const next = setStripPhoto(current, index, dataUrl);
          persistSlide(next);
          return next;
        });
        setStatus("Pasted photo into the strip.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [activeIndex, photoTarget, persistSlide]);

  const currentId =
    activeIndex != null ? strips[activeIndex]?.playerId ?? null : null;
  const activePos =
    activeIndex != null ? lineupPosition(activeIndex) : "PG";
  const board: RankedLineupsDraft = {
    brand,
    title,
    rank,
    strips,
    slides,
    activeSlide,
    showBa,
    showFade,
  };

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
                persistSlide(strips, event.target.value);
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
            onChange={(event) => {
              const next = event.target.value.slice(0, RANK_PILL_MAX);
              setRank(next);
              persistSlide(strips, next);
            }}
          />
        </label>
        <ComposerLookToggle look={look} onChange={setLook} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">Names in photo</span>
          <button
            type="button"
            className={showFade ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={showFade}
            aria-label="First and last name with team logo on the photo"
            onClick={() => setShowFade((on) => !on)}
          >
            {showFade ? "On" : "Off"}
          </button>
        </label>
        <ComposerSaves
          storageKey={SAVES_KEY}
          board={board}
          onLoad={(next) => {
            applyDraft(next);
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
                setStrips(previous);
                persistSlide(previous);
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
            onClick={handleNextSlide}
            disabled={exporting}
          >
            Next slide
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              void copyGraphicCaption(
                rankedLineupCaption(title, rank, strips),
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
            className="sc-btn sc-btn--ghost"
            onClick={() => void handleExportAll()}
            disabled={exporting || slides.length === 0}
          >
            Export all slides
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
            showFade={showFade}
            exporting={exporting}
            onBrandChange={setBrand}
            onTitleChange={setTitle}
            onRankChange={(value) => {
              setRank(value);
              persistSlide(strips, value);
            }}
            onHover={setPhotoTarget}
            onPick={(index) => {
              setPhotoTarget(index);
              setActiveIndex(index);
            }}
            onPan={(index, pan) => {
              setPhotoTarget(index);
              setStrips((current) => {
                const next = patchStrip(current, index, { pan });
                persistSlide(next);
                return next;
              });
            }}
            onUpload={(index, dataUrl) => {
              setPhotoTarget(index);
              setStrips((current) => {
                const next = setStripPhoto(current, index, dataUrl);
                persistSlide(next);
                return next;
              });
              setStatus(
                "Photo cropped inside the strip — pinch, scroll, or +/− to scale, drag to pan.",
              );
            }}
            onNameChange={(index, names) => {
              setStrips((current) => {
                const next = patchStrip(current, index, names);
                persistSlide(next);
                return next;
              });
            }}
          />
          <div className="rl-series" role="tablist" aria-label="Carousel slides">
            {slides.map((slide, index) => (
              <button
                key={`slide-${index}-${slide.rank}`}
                type="button"
                role="tab"
                className={
                  index === activeSlide ? "rl-series__thumb is-on" : "rl-series__thumb"
                }
                aria-selected={index === activeSlide}
                aria-label={`${slide.rank} slide`}
                onClick={() => selectSlide(index)}
              >
                <span className="rl-series__rank">{slide.rank}</span>
                <span className="rl-series__strips" aria-hidden="true">
                  {slide.strips.map((strip, stripIndex) => (
                    <span
                      key={`${slide.rank}-${stripIndex}`}
                      className="rl-series__strip"
                      style={
                        strip.photoSrc
                          ? { backgroundImage: `url(${strip.photoSrc})` }
                          : undefined
                      }
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>
          <p className="sc-hint">
            Five PG–C strips for one carousel part. Next slide keeps the title,
            bumps BEST to 2ND, and clears players. Paste or drop a photo onto a
            strip. Downloads a 4:5 Instagram PNG — nothing is posted.
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
            setStrips((current) => {
              const next = clearStrip(current, activeIndex);
              persistSlide(next);
              return next;
            });
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
