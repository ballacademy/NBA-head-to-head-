import { useCallback, useEffect, useRef, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";
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
import { exportFilename, exportStandingsPng } from "./exportPng";
import { StandingsGraphic } from "./StandingsGraphic";
import { TeamPicker } from "./TeamPicker";
import "@fontsource/oswald/latin-600.css";
import "@fontsource/oswald/latin-700.css";
import "./standingsComposer.css";

const STORAGE_KEY = "ddgm:standings-composer";

interface ComposerDraft {
  brand: string;
  title: string;
  subtitle: string;
  slots: RankingSlots;
}

const loadDraft = (): ComposerDraft => {
  const stored = readJson<Partial<ComposerDraft>>(STORAGE_KEY);
  return {
    brand: stored?.brand?.trim() ? stored.brand : DEFAULT_BRAND,
    title: stored?.title?.trim() ? stored.title : DEFAULT_TITLE,
    subtitle: stored?.subtitle?.trim() ? stored.subtitle : DEFAULT_SUBTITLE,
    slots: isRankingSlots(stored?.slots) ? stored.slots : createEmptySlots(),
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

  useEffect(() => {
    const draft = loadDraft();
    setBrand(draft.brand);
    setTitle(draft.title);
    setSubtitle(draft.subtitle);
    setSlots(draft.slots);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, { brand, title, subtitle, slots });
  }, [brand, title, subtitle, slots, hydrated]);

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
      await exportStandingsPng(node, exportFilename(subtitle, title));
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
    setSlots(createEmptySlots());
    setActiveIndex(null);
    setStatus("Board cleared.");
  };

  return (
    <div className="sc-root">
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
            onChange={(event) => setBrand(event.target.value.toUpperCase())}
          />
        </label>
        <label className="sc-field sc-field--wide">
          Title
          <input
            value={title}
            maxLength={36}
            onChange={(event) => setTitle(event.target.value.toUpperCase())}
          />
        </label>
        <label className="sc-field">
          Subtitle
          <input
            value={subtitle}
            maxLength={28}
            onChange={(event) => setSubtitle(event.target.value.toUpperCase())}
          />
        </label>
        <div className="sc-toolbar__actions">
          <button type="button" className="sc-btn sc-btn--ghost" onClick={handleReset}>
            Reset
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
          slotIndex={activeIndex}
          slots={slots}
          onPick={(teamId) => {
            setSlots((current) => assignTeam(current, activeIndex, teamId));
            setActiveIndex(null);
          }}
          onClear={() => {
            setSlots((current) => clearSlot(current, activeIndex));
            setActiveIndex(null);
          }}
          onClose={closePicker}
        />
      ) : null}
    </div>
  );
}
