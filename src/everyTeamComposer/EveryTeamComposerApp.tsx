import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import {
  EVERY_TEAM_LOOK_KEY,
  useComposerLook,
} from "../instagramComposer/composerLook";
import {
  EVERY_TEAM_TITLE_PRESETS,
  exportDateStamp,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  onComposerTextChange,
} from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import {
  ALL_PLAYER_FILTER,
  EMPTY_PLAYER_FILTERS,
  POSITION_FILTERS,
  getPlayer,
} from "../tierListComposer/nbaActivePlayers";
import { EveryTeamGraphic } from "./EveryTeamGraphic";
import { exportEveryTeamPng } from "./exportEveryTeamPng";
import {
  assignPlayerToTeam,
  clearEveryTeamTeam,
  createDefaultRankedOrder,
  createEmptyEveryTeamSlots,
  DEFAULT_EVERY_TEAM_TITLE,
  isEveryTeamDraft,
  nextEmptyEveryTeamSlot,
  normalizeRankedOrder,
  insertRankedOrder,
  slotIndexForTeam,
  teamAtSlot,
  usedEveryTeamLabels,
  type EveryTeamSlots,
} from "./everyTeamState";
import "@fontsource/montserrat/latin-900.css";
import "./everyTeamComposer.css";

const STORAGE_KEY = "ddgm:every-team-composer";

interface EveryTeamBoardSnapshot {
  slots: EveryTeamSlots;
  rankedOrder: string[];
}

interface EveryTeamComposerDraft {
  brand: string;
  title: string;
  slots: EveryTeamSlots;
  showBa?: boolean;
  ranked?: boolean;
  rankedOrder?: string[];
  showNames?: boolean;
}

const loadDraft = (): EveryTeamComposerDraft => {
  const stored = readJson<Partial<EveryTeamComposerDraft>>(STORAGE_KEY);
  if (isEveryTeamDraft(stored)) {
    return {
      brand: stored.brand.trim() || DEFAULT_BRAND,
      title: stored.title.trim() || DEFAULT_EVERY_TEAM_TITLE,
      slots: stored.slots,
      showBa: stored.showBa === true,
      ranked: stored.ranked === true,
      rankedOrder: normalizeRankedOrder(stored.rankedOrder),
      showNames: stored.showNames === true,
    };
  }
  return {
    brand: stored?.brand?.trim() ? stored.brand : DEFAULT_BRAND,
    title: stored?.title?.trim() ? stored.title : DEFAULT_EVERY_TEAM_TITLE,
    slots: createEmptyEveryTeamSlots(),
    showBa: stored?.showBa === true,
    ranked: stored?.ranked === true,
    rankedOrder: normalizeRankedOrder(stored?.rankedOrder),
    showNames: stored?.showNames === true,
  };
};

export function EveryTeamComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [title, setTitle] = useState(DEFAULT_EVERY_TEAM_TITLE);
  const [slots, setSlots] = useState<EveryTeamSlots>(createEmptyEveryTeamSlots);
  const [ranked, setRanked] = useState(false);
  const [rankedOrder, setRankedOrder] = useState<string[]>(createDefaultRankedOrder);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(EVERY_TEAM_LOOK_KEY);
  const [showBa, setShowBa] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [samePosition, setSamePosition] = useState(false);
  const [fillPosition, setFillPosition] = useState("PG");
  const { push, pop, canUndo } = useComposerUndo<EveryTeamBoardSnapshot>();

  useEffect(() => {
    document.title = "Every team graphic";
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    setBrand(draft.brand);
    setTitle(draft.title);
    setSlots(draft.slots);
    setShowBa(draft.showBa === true);
    setRanked(draft.ranked === true);
    setRankedOrder(normalizeRankedOrder(draft.rankedOrder));
    setShowNames(draft.showNames === true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, {
      brand,
      title,
      slots,
      showBa,
      ranked,
      rankedOrder,
      showNames,
    });
  }, [brand, title, slots, showBa, ranked, rankedOrder, showNames, hydrated]);

  const closePicker = useCallback(() => setActiveIndex(null), []);

  const filenameFor = (story = false) =>
    exportFilenameFromTitle(title, "every-nba-team", exportDateStamp(), story);

  const handleExport = async (story = false) => {
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
      await exportEveryTeamPng(
        node,
        filenameFor(story),
        { brand, title, slots, look, showBa, ranked, rankedOrder, showNames },
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
    push({ slots, rankedOrder });
    setBrand(DEFAULT_BRAND);
    setTitle(DEFAULT_EVERY_TEAM_TITLE);
    setSlots(createEmptyEveryTeamSlots());
    setRankedOrder(createDefaultRankedOrder());
    setActiveIndex(null);
    setStatus("Board cleared.");
  };

  const activeTeam =
    activeIndex != null ? teamAtSlot(activeIndex, ranked, rankedOrder) : null;
  const currentId =
    activeTeam != null
      ? (slots[slotIndexForTeam(activeTeam.id)] ?? null)
      : null;
  const lockedFilters =
    samePosition && fillPosition !== ALL_PLAYER_FILTER
      ? { ...EMPTY_PLAYER_FILTERS, position: fillPosition }
      : undefined;

  return (
    <div className="sc-composer">
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">Every team</h1>
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
          presets={EVERY_TEAM_TITLE_PRESETS}
          onChange={setTitle}
        />
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">Same position</span>
          <button
            type="button"
            className={samePosition ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={samePosition}
            aria-label="Same position on every team"
            onClick={() =>
              setSamePosition((current) => {
                if (!current && fillPosition === ALL_PLAYER_FILTER) {
                  setFillPosition("PG");
                }
                return !current;
              })
            }
          >
            {samePosition ? "On" : "Off"}
          </button>
        </label>
        {samePosition ? (
          <label className="sc-field">
            Position
            <select
              value={fillPosition}
              aria-label="Fill position"
              onChange={(event) => setFillPosition(event.target.value)}
            >
              {POSITION_FILTERS.filter((option) => option.id !== ALL_PLAYER_FILTER).map(
                (option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </label>
        ) : null}
        <div className="sc-look" role="group" aria-label="Board order">
          <span className="sc-look__label">Order</span>
          <button
            type="button"
            className={!ranked ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={!ranked}
            onClick={() => setRanked(false)}
          >
            Unranked
          </button>
          <button
            type="button"
            className={ranked ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={ranked}
            onClick={() => setRanked(true)}
          >
            Ranked
          </button>
        </div>
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">Names</span>
          <button
            type="button"
            className={showNames ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={showNames}
            aria-label="Show player names on cells"
            onClick={() => setShowNames((on) => !on)}
          >
            {showNames ? "On" : "Off"}
          </button>
        </label>
        <ComposerLookToggle look={look} onChange={setLook} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <ComposerSaves
          storageKey="ddgm:every-team-composer:saves"
          board={{
            brand,
            title,
            slots,
            showBa,
            ranked,
            rankedOrder,
            showNames,
          }}
          onLoad={(next) => {
            setBrand(next.brand);
            setTitle(next.title);
            setSlots(next.slots);
            setShowBa(next.showBa === true);
            setRanked(next.ranked === true);
            setRankedOrder(normalizeRankedOrder(next.rankedOrder));
            setShowNames(next.showNames === true);
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
                setSlots(previous.slots);
                setRankedOrder(normalizeRankedOrder(previous.rankedOrder));
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
            onClick={() => void handleExport(true)}
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
          <EveryTeamGraphic
            ref={boardRef}
            brand={brand}
            title={title}
            slots={slots}
            look={look}
            showBa={showBa}
            ranked={ranked}
            rankedOrder={rankedOrder}
            showNames={showNames}
            activeIndex={exporting ? null : activeIndex}
            exporting={exporting}
            onBrandChange={setBrand}
            onTitleChange={setTitle}
            onSelectSlot={setActiveIndex}
            onClearSlot={(index) => {
              const team = teamAtSlot(index, ranked, rankedOrder);
              if (!team) {
                return;
              }
              push({ slots, rankedOrder });
              setSlots((current) => clearEveryTeamTeam(current, team.id));
            }}
            onMoveSlots={
              ranked
                ? (fromIndex, toIndex) => {
                    if (fromIndex === toIndex) {
                      return;
                    }
                    push({ slots, rankedOrder });
                    setRankedOrder((current) =>
                      insertRankedOrder(current, fromIndex, toIndex),
                    );
                    setActiveIndex(null);
                    setStatus(
                      "Moved the team to that rank. Numbers stay put; the rest shift.",
                    );
                  }
                : undefined
            }
          />
          <p className="sc-hint">
            Each square is a fixed NBA team. Unranked is A–Z by city with no
            numbers. Ranked shows 1–30; drag a square to insert it at a new
            rank — everyone between shifts. Click without dragging to pick a
            player from that roster. Downloads a 4:5 Instagram PNG — nothing is
            posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null && activeTeam ? (
        <PlayerPicker
          key={activeTeam.id}
          heading={`Pick ${activeTeam.name} player`}
          hint={
            samePosition
              ? `Only ${fillPosition} on the ${activeTeam.name} roster. After you pick, the next empty team opens.`
              : `Only current ${activeTeam.name} roster players. Use Position to filter this list.`
          }
          currentId={currentId}
          usedLabels={usedEveryTeamLabels(slots, activeIndex, ranked, rankedOrder)}
          lockedTeam={activeTeam.id}
          lockedFilters={lockedFilters}
          onPick={(playerId) => {
            const player = getPlayer(playerId);
            if (!player || player.team !== activeTeam.id) {
              return;
            }
            push({ slots, rankedOrder });
            const nextSlots = assignPlayerToTeam(slots, activeTeam.id, playerId);
            setSlots(nextSlots);
            if (samePosition) {
              const nextIndex = nextEmptyEveryTeamSlot(
                nextSlots,
                activeIndex,
                ranked,
                rankedOrder,
              );
              setActiveIndex(nextIndex);
              setStatus(
                nextIndex == null
                  ? `Picked ${player.name}. Board filled.`
                  : `Picked ${player.name}. Next: ${teamAtSlot(nextIndex, ranked, rankedOrder)?.name}.`,
              );
            } else {
              setActiveIndex(null);
            }
          }}
          onClear={() => {
            push({ slots, rankedOrder });
            setSlots((current) => clearEveryTeamTeam(current, activeTeam.id));
            setActiveIndex(null);
          }}
          onClose={closePicker}
        />
      ) : null}
    </div>
  );
}
