import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerStatsSampleToggle } from "../instagramComposer/ComposerStatsSampleToggle";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { ComposerNightDate } from "../instagramComposer/ComposerNightDate";
import { useComposerNight } from "../instagramComposer/composerNight";
import { useComposerStatsSample } from "../instagramComposer/composerStatsSample";
import {
  EVERY_TEAM_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
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
} from "../tierListComposer/nbaActivePlayers";
import { EveryTeamGraphic } from "./EveryTeamGraphic";
import { exportEveryTeamPng } from "./exportEveryTeamPng";
import {
  assignPlayerToTeam,
  autoFillEveryTeamSlots,
  autoSortMetricLabel,
  autoSortRankedOrder,
  rankedMetricValues,
  clearEveryTeamTeam,
  createDefaultRankedOrder,
  createEmptyEveryTeamSlots,
  DEFAULT_EVERY_TEAM_TITLE,
  fillEveryTeamFromNight,
  isEveryTeamDraft,
  nextEmptyEveryTeamSlot,
  normalizeRankedOrder,
  insertRankedOrder,
  pruneSlotsToSeasons,
  slotIndexForTeam,
  teamAtSlot,
  usedEveryTeamLabels,
  type EveryTeamNightMetric,
  type EveryTeamSlots,
} from "./everyTeamState";
import {
  EVERY_TEAM_SORT_KEY,
  EVERY_TEAM_STAT_METRICS,
  everyTeamCurrentSeason,
  everyTeamSeasons,
  getRosterPlayer,
  historyLabel,
  isEveryTeamRostersReady,
  isMissingSeason,
  loadEveryTeamRosters,
  missingSeasonReason,
  parseCellSeasons,
  parseEveryTeamSeason,
  parseEveryTeamStatMetric,
  rosterAsTierPlayers,
  rosterHasPlayer,
  seasonForTeam,
  setCellSeason,
  type EveryTeamStatMetric,
} from "./historicalRosters";
import "@fontsource/montserrat/latin-900.css";
import "./everyTeamComposer.css";

const STORAGE_KEY = "ddgm:every-team-composer";

interface EveryTeamBoardSnapshot {
  slots: EveryTeamSlots;
  rankedOrder: string[];
  season: string;
  cellSeasons: Record<string, string>;
}

interface EveryTeamComposerDraft {
  brand: string;
  title: string;
  slots: EveryTeamSlots;
  showBa?: boolean;
  ranked?: boolean;
  rankedOrder?: string[];
  showNames?: boolean;
  showHistoricalLogos?: boolean;
  season?: string;
  cellSeasons?: Record<string, string>;
}

const loadDraft = (): EveryTeamComposerDraft => {
  const stored = readJson<Partial<EveryTeamComposerDraft>>(STORAGE_KEY);
  const season = parseEveryTeamSeason(stored?.season);
  const cellSeasons = parseCellSeasons(stored?.cellSeasons);
  const slots = isEveryTeamDraft(stored)
    ? pruneSlotsToSeasons(stored.slots, season, cellSeasons)
    : createEmptyEveryTeamSlots();
  return {
    brand: stored?.brand?.trim() ? stored.brand : DEFAULT_BRAND,
    title: stored?.title?.trim() ? stored.title : DEFAULT_EVERY_TEAM_TITLE,
    slots,
    showBa: stored?.showBa === true,
    ranked: stored?.ranked === true,
    rankedOrder: normalizeRankedOrder(stored?.rankedOrder),
    showNames: stored?.showNames === true,
    showHistoricalLogos: stored?.showHistoricalLogos === true,
    season,
    cellSeasons,
  };
};

export function EveryTeamComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [title, setTitle] = useState(DEFAULT_EVERY_TEAM_TITLE);
  const [slots, setSlots] = useState<EveryTeamSlots>(createEmptyEveryTeamSlots);
  const [ranked, setRanked] = useState(false);
  const [rankedOrder, setRankedOrder] = useState<string[]>(createDefaultRankedOrder);
  const [season, setSeason] = useState(everyTeamCurrentSeason);
  const [cellSeasons, setCellSeasons] = useState<Record<string, string>>({});
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [rostersReady, setRostersReady] = useState(isEveryTeamRostersReady);
  const [look, setLook] = useComposerLook(EVERY_TEAM_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [statsSample, setStatsSample] = useComposerStatsSample();
  const [showBa, setShowBa] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [showHistoricalLogos, setShowHistoricalLogos] = useState(false);
  const [fillMetric, setFillMetric] = useState<EveryTeamStatMetric>("points");
  const [sortMetric, setSortMetric] = useState<EveryTeamStatMetric>("pra");
  const [nightMetric, setNightMetric] = useState<EveryTeamNightMetric>("pts");
  const night = useComposerNight();
  const [samePosition, setSamePosition] = useState(false);
  const [fillPosition, setFillPosition] = useState("PG");
  const { push, pop, canUndo } = useComposerUndo<EveryTeamBoardSnapshot>();

  useEffect(() => {
    document.title = "Every team graphic";
  }, []);

  useEffect(() => {
    void loadEveryTeamRosters()
      .then(() => {
        setRostersReady(true);
        const draft = loadDraft();
        setBrand(draft.brand);
        setTitle(draft.title);
        setSlots(draft.slots);
        setShowBa(draft.showBa === true);
        setRanked(draft.ranked === true);
        setRankedOrder(normalizeRankedOrder(draft.rankedOrder));
        setShowNames(draft.showNames === true);
        setShowHistoricalLogos(draft.showHistoricalLogos === true);
        setSeason(draft.season ?? everyTeamCurrentSeason());
        setCellSeasons(draft.cellSeasons ?? {});
        setHydrated(true);
      })
      .catch((error: unknown) => {
        console.error(error);
        setStatus("Could not load historical rosters.");
        setHydrated(true);
      });
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
      showHistoricalLogos,
      season,
      cellSeasons,
    });
  }, [
    brand,
    title,
    slots,
    showBa,
    ranked,
    rankedOrder,
    showNames,
    showHistoricalLogos,
    season,
    cellSeasons,
    hydrated,
  ]);

  const closePicker = useCallback(() => setActiveIndex(null), []);

  const snapshot = (): EveryTeamBoardSnapshot => ({
    slots,
    rankedOrder,
    season,
    cellSeasons,
  });

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
        {
          brand,
          title,
          slots,
          look,
          purpleFlair,
          showBa,
          ranked,
          rankedOrder,
          showNames,
          showHistoricalLogos,
          season,
          cellSeasons,
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

  const handleReset = () => {
    push(snapshot());
    setBrand(DEFAULT_BRAND);
    setTitle(DEFAULT_EVERY_TEAM_TITLE);
    setSlots(createEmptyEveryTeamSlots());
    setRankedOrder(createDefaultRankedOrder());
    setSeason(everyTeamCurrentSeason());
    setCellSeasons({});
    setActiveIndex(null);
    setStatus("Board cleared.");
  };

  const changeBoardSeason = (nextSeason: string) => {
    if (nextSeason === season) {
      return;
    }
    push(snapshot());
    const nextCells = { ...cellSeasons };
    Object.keys(nextCells).forEach((teamId) => {
      if (nextCells[teamId] === nextSeason) {
        delete nextCells[teamId];
      }
    });
    setSeason(nextSeason);
    setCellSeasons(nextCells);
    setSlots((current) => pruneSlotsToSeasons(current, nextSeason, nextCells));
    setStatus(`Board year ${nextSeason}. Cells without that roster cleared.`);
  };

  const handleAutoSort = (metric: EveryTeamStatMetric) => {
    const teams = ranked
      ? normalizeRankedOrder(rankedOrder)
      : createDefaultRankedOrder();
    const values = rankedMetricValues(
      teams,
      slots,
      season,
      cellSeasons,
      metric,
      statsSample,
    );
    const result = autoSortRankedOrder(teams, values);
    const label = autoSortMetricLabel(metric);
    push(snapshot());
    setRanked(true);
    setRankedOrder(result.order);
    if (result.ranked === 0) {
      setStatus(
        `No ${label} yet — last season’s table is used when this year has none. Fill players first, then sort.`,
      );
      return;
    }
    setStatus(
      result.held
        ? `Sorted ${result.ranked} by ${label}. ${result.held} empty or without stats stayed at the bottom.`
        : `Sorted 1–${result.ranked} by ${label}. Drag still overrides.`,
    );
  };

  const handleAutoFill = (metric: EveryTeamStatMetric) => {
    const next = autoFillEveryTeamSlots(
      season,
      cellSeasons,
      metric,
      statsSample,
    );
    const filled = next.filter(Boolean).length;
    const label = autoSortMetricLabel(metric);
    if (filled === 0) {
      setStatus(`No ${label} leaders for this board’s seasons.`);
      return;
    }
    const teams = ranked
      ? normalizeRankedOrder(rankedOrder)
      : createDefaultRankedOrder();
    const result = autoSortRankedOrder(
      teams,
      rankedMetricValues(teams, next, season, cellSeasons, metric, statsSample),
    );
    push(snapshot());
    setSlots(next);
    setRanked(true);
    setRankedOrder(result.order);
    setStatus(
      result.held
        ? `Filled ${filled} ${label} leaders and sorted ${result.ranked}. ${result.held} without stats stayed at the bottom.`
        : `Filled ${filled} teams with the ${label} leader and sorted 1–${result.ranked}. Current year uses last season until this year’s table exists.`,
    );
  };

  const handleNightFill = async (metric: EveryTeamNightMetric) => {
    setStatus("Loading last night’s box scores…");
    const rows = await night.ensureStandouts();
    const result = fillEveryTeamFromNight(slots, rows, metric);
    if (result.filled === 0) {
      setStatus("No last-night lines for this date.");
      return;
    }
    push(snapshot());
    setSlots(result.slots);
    setStatus(
      `Filled ${result.filled} teams with last night’s ${metric === "pra" ? "PRA" : "PTS"} leader.`,
    );
  };

  const activeTeam =
    activeIndex != null ? teamAtSlot(activeIndex, ranked, rankedOrder) : null;
  const activeSeason = activeTeam
    ? seasonForTeam(activeTeam.id, season, cellSeasons)
    : season;
  const currentId =
    activeTeam != null
      ? (slots[slotIndexForTeam(activeTeam.id)] ?? null)
      : null;
  const lockedFilters =
    samePosition && fillPosition !== ALL_PLAYER_FILTER
      ? { ...EMPTY_PLAYER_FILTERS, position: fillPosition }
      : undefined;
  const rosterPlayers = useMemo(
    () =>
      activeTeam ? rosterAsTierPlayers(activeTeam.id, activeSeason) : [],
    [activeTeam, activeSeason],
  );
  const missingActive =
    activeTeam != null && isMissingSeason(activeTeam.id, activeSeason);

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Every team"
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
          presets={EVERY_TEAM_TITLE_PRESETS}
          onChange={setTitle}
        />
          </>
        }
        data={
          <>
        <label className="sc-field">
          Board year
          <select
            value={season}
            aria-label="Board season"
            disabled={!rostersReady}
            onChange={(event) => changeBoardSeason(event.target.value)}
          >
            {everyTeamSeasons().map((option) => (
              <option key={option} value={option}>
                {option}
                {option === everyTeamCurrentSeason() ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
        <ComposerStatsSampleToggle
          sample={statsSample}
          onChange={setStatsSample}
        />
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
        <div className="sc-look sc-look--sort" role="group" aria-label="Auto-fill every team">
          <span className="sc-look__label">Auto-fill</span>
          <select
            value={fillMetric}
            aria-label="Auto-fill stat"
            onChange={(event) =>
              setFillMetric(parseEveryTeamStatMetric(event.target.value))
            }
          >
            {EVERY_TEAM_STAT_METRICS.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="sc-chip"
            onClick={() => handleAutoFill(fillMetric)}
          >
            Fill leaders
          </button>
        </div>
        <ComposerNightDate
          date={night.date}
          todayIso={night.todayIso}
          yesterdayIso={night.yesterdayIso}
          onChange={night.setDate}
        />
        <div className="sc-look sc-look--sort" role="group" aria-label="Fill last night">
          <span className="sc-look__label">Last night</span>
          <select
            value={nightMetric}
            aria-label="Last-night fill stat"
            onChange={(event) =>
              setNightMetric(
                event.target.value === "pra" ? "pra" : "pts",
              )
            }
          >
            <option value="pts">PTS</option>
            <option value="pra">PRA</option>
          </select>
          <button
            type="button"
            className="sc-chip"
            onClick={() => void handleNightFill(nightMetric)}
          >
            Fill last night
          </button>
        </div>
        <div className="sc-look sc-look--sort" role="group" aria-label="Auto-sort ranked board">
          <span className="sc-look__label">Auto-sort</span>
          <select
            value={sortMetric}
            aria-label="Auto-sort stat"
            onChange={(event) =>
              setSortMetric(parseEveryTeamStatMetric(event.target.value))
            }
          >
            {EVERY_TEAM_STAT_METRICS.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="sc-chip"
            onClick={() => handleAutoSort(sortMetric)}
          >
            Sort 1–30
          </button>
        </div>
          </>
        }
        filters={
          <>
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
                  {POSITION_FILTERS.filter(
                    (option) => option.id !== ALL_PLAYER_FILTER,
                  ).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </>
        }
        board={
          <>
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
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">Historical logos</span>
          <button
            type="button"
            className={showHistoricalLogos ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={showHistoricalLogos}
            aria-label="Use historical team logos"
            onClick={() => setShowHistoricalLogos((on) => !on)}
          >
            {showHistoricalLogos ? "On" : "Off"}
          </button>
        </label>
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
          </>
        }
        persist={
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
            showHistoricalLogos,
            season,
            cellSeasons,
          }}
          onLoad={(next) => {
            const nextSeason = parseEveryTeamSeason(next.season);
            const nextCells = parseCellSeasons(next.cellSeasons);
            setBrand(next.brand);
            setTitle(next.title);
            setSlots(pruneSlotsToSeasons(next.slots, nextSeason, nextCells));
            setShowBa(next.showBa === true);
            setRanked(next.ranked === true);
            setRankedOrder(normalizeRankedOrder(next.rankedOrder));
            setShowNames(next.showNames === true);
            setShowHistoricalLogos(next.showHistoricalLogos === true);
            setSeason(nextSeason);
            setCellSeasons(nextCells);
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
                setSlots(previous.slots);
                setRankedOrder(normalizeRankedOrder(previous.rankedOrder));
                setSeason(previous.season);
                setCellSeasons(previous.cellSeasons);
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
          </>
        }
      />

      <main className="sc-stage">
        <div className="sc-stage__frame">
          <ComposerBoard>
          <EveryTeamGraphic
            ref={boardRef}
            brand={brand}
            title={title}
            slots={slots}
            look={look}
            purpleFlair={purpleFlair}
            showBa={showBa}
            ranked={ranked}
            rankedOrder={rankedOrder}
            showNames={showNames}
            showHistoricalLogos={showHistoricalLogos}
            season={season}
            cellSeasons={cellSeasons}
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
              push(snapshot());
              setSlots((current) => clearEveryTeamTeam(current, team.id));
            }}
            onMoveSlots={
              ranked
                ? (fromIndex, toIndex) => {
                    if (fromIndex === toIndex) {
                      return;
                    }
                    push(snapshot());
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
          </ComposerBoard>
          <p className="sc-hint">
            Each square is a fixed NBA franchise. Board year applies that
            season’s roster to every cell; a cell can override the year. Unranked
            is A–Z by city. Ranked shows 1–30 — auto-fill by a chosen stat, then
            auto-sort, or drag to insert. Downloads a 4:5 Instagram PNG — nothing is
            posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null && activeTeam ? (
        <PlayerPicker
          key={`${activeTeam.id}-${activeSeason}`}
          heading={`Pick ${activeSeason} ${historyLabel(activeTeam.id, activeSeason)}`}
          hint={
            missingActive
              ? missingSeasonReason(activeTeam.id, activeSeason)
              : samePosition
                ? `Only ${fillPosition} on the ${activeSeason} ${historyLabel(activeTeam.id, activeSeason)} full roster, depth-chart order first. After you pick, the next empty team opens.`
                : `The ${activeSeason} ${historyLabel(activeTeam.id, activeSeason)} full roster (camp / two-way / end of bench included). Depth-chart sort is starter PG–C, then backups, then everyone else.`
          }
          currentId={currentId}
          usedLabels={usedEveryTeamLabels(slots, activeIndex, ranked, rankedOrder)}
          lockedTeam={activeTeam.id}
          lockedFilters={lockedFilters}
          rosterPlayers={rosterPlayers}
          simple
          showDepthSort
          defaultSort="depth"
          sortStorageKey={EVERY_TEAM_SORT_KEY}
          scoringLabel={`${activeSeason} per game`}
          onPick={(playerId) => {
            if (!rosterHasPlayer(activeTeam.id, activeSeason, playerId)) {
              return;
            }
            const player = getRosterPlayer(activeTeam.id, activeSeason, playerId);
            push(snapshot());
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
                  ? `Picked ${player?.name ?? "player"}. Board filled.`
                  : `Picked ${player?.name ?? "player"}. Next: ${teamAtSlot(nextIndex, ranked, rankedOrder)?.name}.`,
              );
            } else {
              setActiveIndex(null);
            }
          }}
          onClear={() => {
            push(snapshot());
            setSlots((current) => clearEveryTeamTeam(current, activeTeam.id));
            setActiveIndex(null);
          }}
          onClose={closePicker}
          toolbarExtra={
            <label className="sc-field">
              Cell year
              <select
                value={activeSeason}
                aria-label={`${activeTeam.id} season override`}
                onChange={(event) => {
                  const nextSeason = event.target.value;
                  const nextCells = setCellSeason(
                    cellSeasons,
                    activeTeam.id,
                    nextSeason,
                    season,
                  );
                  push(snapshot());
                  setCellSeasons(nextCells);
                  const playerId = slots[slotIndexForTeam(activeTeam.id)];
                  if (
                    playerId &&
                    !rosterHasPlayer(activeTeam.id, nextSeason, playerId)
                  ) {
                    setSlots((current) =>
                      clearEveryTeamTeam(current, activeTeam.id),
                    );
                  }
                  setStatus(
                    nextSeason === season
                      ? `${activeTeam.name} uses the board year ${season}.`
                      : `${activeTeam.name} overridden to ${nextSeason}.`,
                  );
                }}
              >
                {everyTeamSeasons().map((option) => (
                  <option key={option} value={option}>
                    {option}
                    {option === season ? " (board)" : ""}
                  </option>
                ))}
              </select>
            </label>
          }
        />
      ) : null}
    </div>
  );
}
