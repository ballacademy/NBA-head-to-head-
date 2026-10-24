import { useCallback, useEffect, useRef, useState } from "react";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  STANDINGS_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import {
  STANDINGS_TITLE_PRESETS,
  exportDateStamp,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { copyGraphicCaption, graphicCaption } from "../instagramComposer/graphicCaption";
import {
  downloadCanvasPng,
  toSquareCanvas,
} from "../instagramComposer/exportDownload";
import { squareFilename } from "../instagramComposer/exportPack";
import { renderStandingsCanvas } from "./renderStandingsCanvas";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  onComposerTextChange,
} from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { fetchConferenceStandingsBundle } from "./nbaStandings";
import {
  assignTeam,
  clearSlot,
  createEmptySlots,
  DEFAULT_BRAND,
  DEFAULT_SUBTITLE,
  DEFAULT_TITLE,
  isRankingSlots,
  LAST_WEEK_STORAGE_KEY,
  type RankingSlots,
  type StandingRecord,
} from "./rankingState";
import { exportStandingsPng } from "./exportPng";
import { StandingsGraphic } from "./StandingsGraphic";
import { TeamPicker } from "./TeamPicker";
import { getTeam } from "./teams";
import "@fontsource/montserrat/latin-900.css";
import "./standingsComposer.css";
import { confirmBlankPost } from "../instagramComposer/confirmBlankPost";

const STORAGE_KEY = "ddgm:standings-composer";
const SAVES_KEY = "ddgm:standings-composer:saves";

interface ComposerDraft {
  brand: string;
  title: string;
  subtitle: string;
  slots: RankingSlots;
  showBa?: boolean;
  showArrows?: boolean;
  showRecord?: boolean;
  showLast10?: boolean;
  showPlayoffCut?: boolean;
  records?: Record<string, StandingRecord>;
}

const loadDraft = (): ComposerDraft => {
  const stored = readJson<Partial<ComposerDraft>>(STORAGE_KEY);
  return {
    brand: stored?.brand?.trim() ? stored.brand : DEFAULT_BRAND,
    title: stored?.title?.trim() ? stored.title : DEFAULT_TITLE,
    subtitle: stored?.subtitle?.trim() ? stored.subtitle : DEFAULT_SUBTITLE,
    slots: isRankingSlots(stored?.slots) ? stored.slots : createEmptySlots(),
    showBa: stored?.showBa === true,
    showArrows: stored?.showArrows === true,
    showRecord: stored?.showRecord === true,
    showLast10: stored?.showLast10 === true,
    showPlayoffCut: stored?.showPlayoffCut === true,
    records:
      stored?.records && typeof stored.records === "object"
        ? stored.records
        : {},
  };
};

const loadLastWeek = (): RankingSlots | null => {
  const stored = readJson<unknown>(LAST_WEEK_STORAGE_KEY);
  return isRankingSlots(stored) ? stored : null;
};

export function StandingsComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE);
  const [slots, setSlots] = useState<RankingSlots>(createEmptySlots);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(STANDINGS_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [showBa, setShowBa] = useState(false);
  const [showArrows, setShowArrows] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [showLast10, setShowLast10] = useState(false);
  const [showPlayoffCut, setShowPlayoffCut] = useState(false);
  const [records, setRecords] = useState<Record<string, StandingRecord>>({});
  const [lastWeekSlots, setLastWeekSlots] = useState<RankingSlots | null>(null);
  const [filling, setFilling] = useState(false);
  const { push, pop, canUndo } = useComposerUndo<RankingSlots>();

  useEffect(() => {
    document.title = "Standings graphic";
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    setBrand(draft.brand);
    setTitle(draft.title);
    setSubtitle(draft.subtitle);
    setSlots(draft.slots);
    setShowBa(draft.showBa === true);
    setShowArrows(draft.showArrows === true);
    setShowRecord(draft.showRecord === true);
    setShowLast10(draft.showLast10 === true);
    setShowPlayoffCut(draft.showPlayoffCut === true);
    setRecords(draft.records ?? {});
    setLastWeekSlots(loadLastWeek());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, {
      brand,
      title,
      subtitle,
      slots,
      showBa,
      showArrows,
      showRecord,
      showLast10,
      showPlayoffCut,
      records,
    });
  }, [brand, title, subtitle, slots, showBa, showArrows, showRecord, showLast10, showPlayoffCut, records, hydrated]);

  const closePicker = useCallback(() => setActiveIndex(null), []);

  const handleExport = async () => {
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
      await exportStandingsPng(
        node,
        exportFilenameFromTitle(
          title,
          "nba-standings",
          `${subtitle} ${exportDateStamp()}`,
        ),
        {
          brand,
          title,
          subtitle,
          slots,
          look,
          purpleFlair,
          showBa,
          showArrows,
          showRecord,
          showLast10,
          showPlayoffCut,
          records,
          lastWeekSlots,
        },
      );
      setStatus("Download started.");
    } catch (error) {
      console.error(error);
      setStatus("Could not export PNG.");
    } finally {
      setExporting(false);
    }
  };

  const handleResetKeepPhotos = () => {
    setBrand(DEFAULT_BRAND);
    setTitle(DEFAULT_TITLE);
    setSubtitle(DEFAULT_SUBTITLE);
    setActiveIndex(null);
    setStatus("Reset — ranking kept.");
  };

  const handleReset = () => {
    if (!confirmBlankPost()) {
      return;
    }
    setBrand(DEFAULT_BRAND);
    setTitle(DEFAULT_TITLE);
    setSubtitle(DEFAULT_SUBTITLE);
    push(slots);
    setSlots(createEmptySlots());
    setActiveIndex(null);
    setStatus("Blank post.");
  };

  const fillConference = async (conference: "East" | "West") => {
    setFilling(true);
    setStatus(`Loading ${conference} standings…`);
    try {
      const next = await fetchConferenceStandingsBundle(conference);
      push(slots);
      setSlots(next.slots);
      setRecords((current) => ({ ...current, ...next.records }));
      setSubtitle(
        conference === "East" ? "EASTERN CONFERENCE" : "WESTERN CONFERENCE",
      );
      setStatus(`Filled ${conference} standings. Swap any team you want.`);
    } catch (error) {
      console.error(error);
      setStatus("Could not load NBA standings.");
    } finally {
      setFilling(false);
    }
  };

  const exportStory = async () => {
    const node = boardRef.current;
    if (!node) {
      return;
    }
    setExporting(true);
    try {
      await exportStandingsPng(
        node,
        exportFilenameFromTitle(
          title,
          "nba-standings",
          `${subtitle} ${exportDateStamp()}`,
          true,
        ),
        {
          brand,
          title,
          subtitle,
          slots,
          look,
          purpleFlair,
          showBa,
          showArrows,
          showRecord,
          showLast10,
          showPlayoffCut,
          records,
          lastWeekSlots,
        },
        true,
      );
      setStatus("Story PNG download started.");
    } catch (error) {
      console.error(error);
      setStatus("Could not export story PNG.");
    } finally {
      setExporting(false);
    }
  };

  const pickerLabels: Record<string, string> = {};
  if (activeIndex != null) {
    slots.forEach((id, index) => {
      if (!id) {
        return;
      }
      pickerLabels[id] =
        index === activeIndex ? "This slot" : `Now #${index + 1}`;
    });
  }

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Standings graphic"
        identity={
          <>
        <label className="sc-field">
          Brand
          <input
            value={brand}
            maxLength={24}
            onChange={(event) => onComposerTextChange(event, setBrand, 24)}
          />
        </label>
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
          presets={STANDINGS_TITLE_PRESETS}
          onChange={setTitle}
        />
        <label className="sc-field">
          Subtitle
          <input
            value={subtitle}
            maxLength={28}
            onChange={(event) => onComposerTextChange(event, setSubtitle, 28)}
          />
        </label>
          </>
        }
        data={
          <>
          <button
            type="button"
            className="sc-chip"
            onClick={() => void fillConference("East")}
            disabled={filling || exporting}
          >
            Fill East
          </button>
          <button
            type="button"
            className="sc-chip"
            onClick={() => void fillConference("West")}
            disabled={filling || exporting}
          >
            Fill West
          </button>
          </>
        }
        board={
          <>
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">Last-week arrows</span>
          <button
            type="button"
            className={showArrows ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={showArrows}
            aria-label="Last-week movement arrows"
            onClick={() => setShowArrows((on) => !on)}
          >
            {showArrows ? "On" : "Off"}
          </button>
        </label>
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">W–L</span>
          <button
            type="button"
            className={showRecord ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={showRecord}
            aria-label="Show wins and losses in each square"
            onClick={() => setShowRecord((on) => !on)}
          >
            {showRecord ? "On" : "Off"}
          </button>
        </label>
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">Last 10</span>
          <button
            type="button"
            className={showLast10 ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={showLast10}
            aria-label="Show last-10 record"
            onClick={() => setShowLast10((on) => !on)}
          >
            {showLast10 ? "On" : "Off"}
          </button>
        </label>
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">Playoff cut</span>
          <button
            type="button"
            className={showPlayoffCut ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={showPlayoffCut}
            aria-label="Show playoff cut line"
            onClick={() => setShowPlayoffCut((on) => !on)}
          >
            {showPlayoffCut ? "On" : "Off"}
          </button>
        </label>
          </>
        }
        persist={
        <ComposerSaves
          storageKey={SAVES_KEY}
          board={{
            brand,
            title,
            subtitle,
            slots,
            showBa,
            showArrows,
            showRecord,
            showLast10,
            showPlayoffCut,
            records,
          }}
          onLoad={(next) => {
            setBrand(next.brand);
            setTitle(next.title);
            setSubtitle(next.subtitle);
            setSlots(next.slots);
            setShowBa(next.showBa === true);
            setShowArrows(next.showArrows === true);
            setShowRecord(next.showRecord === true);
            setShowLast10(next.showLast10 === true);
            setShowPlayoffCut(next.showPlayoffCut === true);
            setRecords(next.records ?? {});
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
                setSlots(previous);
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
            onClick={() => {
              writeJson(LAST_WEEK_STORAGE_KEY, slots);
              setLastWeekSlots(slots.slice());
              setStatus("Saved this ranking as last week.");
            }}
          >
            Save as last week
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() =>
              void copyGraphicCaption(
                graphicCaption(
                  title,
                  slots
                    .map((id) => (id ? getTeam(id)?.name ?? id : ""))
                    .filter(Boolean),
                  [subtitle],
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
            onClick={() => void exportStory()}
            disabled={exporting}
          >
            Export 9:16
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost sc-btn--aside sc-hud-full-only"
            aria-label="Export 1:1"
            disabled={exporting}
            onClick={() => {
              void (async () => {
                setExporting(true);
                try {
                  const feed = exportFilenameFromTitle(
                    title,
                    "nba-standings",
                    `${subtitle} ${exportDateStamp()}`,
                  );
                  const canvas = await renderStandingsCanvas(
                    {
                      brand,
                      title,
                      subtitle,
                      slots,
                      look,
                      purpleFlair,
                      showBa,
                      showArrows,
                      showRecord,
                      showLast10,
                      showPlayoffCut,
                      records,
                      lastWeekSlots,
                    },
                    2,
                  );
                  await downloadCanvasPng(
                    await toSquareCanvas(canvas),
                    squareFilename(feed),
                  );
                  setStatus("1:1 PNG download started.");
                } catch (error) {
                  console.error(error);
                  setStatus("Could not export 1:1 PNG.");
                } finally {
                  setExporting(false);
                }
              })();
            }}
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
          <StandingsGraphic
            ref={boardRef}
            brand={brand}
            title={title}
            subtitle={subtitle}
            slots={slots}
            lastWeekSlots={lastWeekSlots}
            showArrows={showArrows}
            showRecord={showRecord}
            showLast10={showLast10}
            showPlayoffCut={showPlayoffCut}
            records={records}
            look={look}
            purpleFlair={purpleFlair}
            showBa={showBa}
            activeIndex={exporting ? null : activeIndex}
            exporting={exporting}
            onBrandChange={setBrand}
            onTitleChange={setTitle}
            onSubtitleChange={setSubtitle}
            onSelectSlot={setActiveIndex}
          />
          </ComposerBoard>
          <p className="sc-hint">
            Click a numbered slot to pick a team. Header text is editable on the
            graphic or in the bar above. Downloads a 4:5 Instagram PNG — nothing
            is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null ? (
        <TeamPicker
          heading={`Pick team · #${activeIndex + 1}`}
          currentId={slots[activeIndex]}
          usedLabels={pickerLabels}
          onPick={(teamId) => {
            push(slots);
            setSlots((current) => assignTeam(current, activeIndex, teamId));
            setActiveIndex(null);
          }}
          onClear={() => {
            push(slots);
            setSlots((current) => clearSlot(current, activeIndex));
            setActiveIndex(null);
          }}
          onClose={closePicker}
        />
      ) : null}
    </div>
  );
}
