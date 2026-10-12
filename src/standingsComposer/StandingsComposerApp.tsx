import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  STANDINGS_LOOK_KEY,
  useComposerLook,
} from "../instagramComposer/composerLook";
import {
  STANDINGS_TITLE_PRESETS,
  exportDateStamp,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  onComposerTextChange,
} from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { fetchConferenceStandings } from "./nbaStandings";
import {
  assignTeam,
  clearSlot,
  createEmptySlots,
  DEFAULT_BRAND,
  DEFAULT_SUBTITLE,
  DEFAULT_TITLE,
  isRankingSlots,
  type RankingSlots,
} from "./rankingState";
import { exportStandingsPng } from "./exportPng";
import { StandingsGraphic } from "./StandingsGraphic";
import { TeamPicker } from "./TeamPicker";
import "@fontsource/montserrat/latin-900.css";
import "./standingsComposer.css";

const STORAGE_KEY = "ddgm:standings-composer";

interface ComposerDraft {
  brand: string;
  title: string;
  subtitle: string;
  slots: RankingSlots;
  showBa?: boolean;
}

const loadDraft = (): ComposerDraft => {
  const stored = readJson<Partial<ComposerDraft>>(STORAGE_KEY);
  return {
    brand: stored?.brand?.trim() ? stored.brand : DEFAULT_BRAND,
    title: stored?.title?.trim() ? stored.title : DEFAULT_TITLE,
    subtitle: stored?.subtitle?.trim() ? stored.subtitle : DEFAULT_SUBTITLE,
    slots: isRankingSlots(stored?.slots) ? stored.slots : createEmptySlots(),
    showBa: stored?.showBa === true,
  };
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
  const [showBa, setShowBa] = useState(false);
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
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, { brand, title, subtitle, slots, showBa });
  }, [brand, title, subtitle, slots, showBa, hydrated]);

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
        { brand, title, subtitle, slots, look, showBa },
      );
      setStatus("Download started.");
    } catch (error) {
      console.error(error);
      setStatus("Could not export PNG.");
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    setBrand(DEFAULT_BRAND);
    setTitle(DEFAULT_TITLE);
    setSubtitle(DEFAULT_SUBTITLE);
    push(slots);
    setSlots(createEmptySlots());
    setActiveIndex(null);
    setStatus("Board cleared.");
  };

  const fillConference = async (conference: "East" | "West") => {
    setFilling(true);
    setStatus(`Loading ${conference} standings…`);
    try {
      const next = await fetchConferenceStandings(conference);
      push(slots);
      setSlots(next);
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
        { brand, title, subtitle, slots, look, showBa },
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
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">Standings graphic</h1>
        </div>
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
        <ComposerLookToggle look={look} onChange={setLook} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <div className="sc-toolbar__actions">
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => void fillConference("East")}
            disabled={filling || exporting}
          >
            Fill East
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => void fillConference("West")}
            disabled={filling || exporting}
          >
            Fill West
          </button>
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
          <button type="button" className="sc-btn sc-btn--ghost" onClick={handleReset}>
            Reset
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => void exportStory()}
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
          <StandingsGraphic
            ref={boardRef}
            brand={brand}
            title={title}
            subtitle={subtitle}
            slots={slots}
            look={look}
            showBa={showBa}
            activeIndex={exporting ? null : activeIndex}
            exporting={exporting}
            onBrandChange={setBrand}
            onTitleChange={setTitle}
            onSubtitleChange={setSubtitle}
            onSelectSlot={setActiveIndex}
          />
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
