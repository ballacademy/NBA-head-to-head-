import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerNamesToggle } from "../instagramComposer/ComposerNamesToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerStatsSampleToggle } from "../instagramComposer/ComposerStatsSampleToggle";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  PLOT_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { useComposerStatsSample } from "../instagramComposer/composerStatsSample";
import {
  copyGraphicCaption,
  graphicCaption,
} from "../instagramComposer/graphicCaption";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  onComposerTextChange,
} from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import {
  PLOT_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import {
  EVERY_TEAM_STAT_METRICS,
  everyTeamCurrentSeason,
  everyTeamSeasons,
  isEveryTeamRostersReady,
  loadEveryTeamRosters,
  matchingTeamIds,
  parseEveryTeamSeason,
  parseEveryTeamStatMetric,
  type EveryTeamStatMetric,
} from "../everyTeamComposer/historicalRosters";
import { PlayerFilterBar } from "../tierListComposer/PlayerFilterBar";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { TeamPicker } from "../standingsComposer/TeamPicker";
import {
  EMPTY_PLAYER_FILTERS,
  getPlayer,
  searchPlayers,
  type PlayerSearchFilters,
} from "../tierListComposer/nbaActivePlayers";
import { STORY_DESIGN_HEIGHT } from "../standingsComposer/rankingState";
import { PlotGraphic } from "./PlotGraphic";
import { exportPlotPng } from "./exportPlotPng";
import { renderPlotCanvas } from "./renderPlotCanvas";
import {
  autoPlotTitle,
  DEFAULT_PLOT_QUADRANTS,
  defaultPlotDraft,
  isPlotDraft,
  normalizePlotDraft,
  parsePlotSizeMetric,
  pinPlotPlayer,
  plotCaptionNames,
  plotMetricLabel,
  populatePlotPoints,
  togglePlotId,
  unpinPlotPlayer,
  type PlotDraft,
  type PlotPoint,
  type PlotQuadrants,
  type PlotSubject,
} from "./plotState";
import "@fontsource/montserrat/latin-900.css";
import "./plotComposer.css";

const STORAGE_KEY = "ddgm:plot-composer";
const SAVES_KEY = "ddgm:plot-composer:saves";

const isAutoTitle = (title: string) => {
  const stripped = title.replace(/\s*·\s*TEAMS$/i, "").trim().toUpperCase();
  if (stripped === "PTS VS AST") {
    return true;
  }
  return EVERY_TEAM_STAT_METRICS.some((xMetric) =>
    EVERY_TEAM_STAT_METRICS.some(
      (yMetric) => stripped === `${xMetric.label} VS ${yMetric.label}`,
    ),
  );
};

const loadDraft = (): PlotDraft => {
  const stored = readJson<Partial<PlotDraft>>(STORAGE_KEY);
  if (isPlotDraft(stored) || (stored && typeof stored.title === "string")) {
    return normalizePlotDraft(stored ?? {}, parseEveryTeamSeason(stored?.season));
  }
  return defaultPlotDraft(everyTeamCurrentSeason());
};

export function PlotComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultPlotDraft(everyTeamCurrentSeason());
  const [brand, setBrand] = useState(empty.brand);
  const [title, setTitle] = useState(empty.title);
  const [subject, setSubject] = useState<PlotSubject>(empty.subject);
  const [xMetric, setXMetric] = useState<EveryTeamStatMetric>(empty.xMetric);
  const [yMetric, setYMetric] = useState<EveryTeamStatMetric>(empty.yMetric);
  const [season, setSeason] = useState(empty.season);
  const [points, setPoints] = useState<PlotPoint[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [sizeMetric, setSizeMetric] = useState<EveryTeamStatMetric | "none">("none");
  const [populated, setPopulated] = useState(false);
  const [quadrants, setQuadrants] = useState<PlotQuadrants>({
    ...DEFAULT_PLOT_QUADRANTS,
  });
  const [highlighting, setHighlighting] = useState(false);
  const [filters, setFilters] = useState<PlayerSearchFilters>({
    ...EMPTY_PLAYER_FILTERS,
  });
  const [showBa, setShowBa] = useState(true);
  const [showNames, setShowNames] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [rostersReady, setRostersReady] = useState(isEveryTeamRostersReady);
  const [look, setLook] = useComposerLook(PLOT_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [statsSample, setStatsSample] = useComposerStatsSample();
  const [storyCrop, setStoryCrop] = useState(false);
  const [pinning, setPinning] = useState(false);
  const { push, pop, canUndo } = useComposerUndo<PlotPoint[]>();

  useEffect(() => {
    document.title = "Plot graphic";
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    setBrand(draft.brand);
    setTitle(draft.title);
    setSubject(draft.subject);
    setXMetric(draft.xMetric);
    setYMetric(draft.yMetric);
    setSeason(draft.season || everyTeamCurrentSeason());
    setPoints(draft.points);
    setPinnedIds(draft.pinnedIds);
    setHighlightedIds(draft.highlightedIds ?? []);
    setSizeMetric(parsePlotSizeMetric(draft.sizeMetric));
    setQuadrants(draft.quadrants ?? { ...DEFAULT_PLOT_QUADRANTS });
    setFilters(draft.filters ?? { ...EMPTY_PLAYER_FILTERS });
    setShowBa(draft.showBa !== false);
    setShowNames(draft.showNames !== false);
    setPopulated(draft.points.length > 0);
    setHydrated(true);
    void loadEveryTeamRosters()
      .then(() => {
        setRostersReady(true);
        setSeason((current) => parseEveryTeamSeason(current));
      })
      .catch((error: unknown) => {
        console.error(error);
      });
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, {
      brand,
      title,
      subject,
      xMetric,
      yMetric,
      season,
      points,
      pinnedIds,
      highlightedIds,
      sizeMetric,
      quadrants,
      showBa,
      showNames,
      filters,
    } satisfies PlotDraft);
  }, [
    brand,
    title,
    subject,
    xMetric,
    yMetric,
    season,
    points,
    pinnedIds,
    highlightedIds,
    sizeMetric,
    quadrants,
    showBa,
    showNames,
    filters,
    hydrated,
  ]);

  const applyDraft = (draft: PlotDraft) => {
    const next = normalizePlotDraft(draft, parseEveryTeamSeason(draft.season));
    setBrand(next.brand);
    setTitle(next.title);
    setSubject(next.subject);
    setXMetric(next.xMetric);
    setYMetric(next.yMetric);
    setSeason(next.season);
    setPoints(next.points);
    setPinnedIds(next.pinnedIds);
    setHighlightedIds(next.highlightedIds ?? []);
    setSizeMetric(parsePlotSizeMetric(next.sizeMetric));
    setQuadrants(next.quadrants ?? { ...DEFAULT_PLOT_QUADRANTS });
    setFilters(next.filters ?? { ...EMPTY_PLAYER_FILTERS });
    setShowBa(next.showBa !== false);
    setShowNames(next.showNames !== false);
    setPopulated(next.points.length > 0);
  };

  const skipLivePlot = useRef(true);

  const applyPlot = useCallback(
    (announce: boolean) => {
      const next = populatePlotPoints(
        subject,
        season,
        xMetric,
        yMetric,
        filters,
        pinnedIds,
        statsSample,
        sizeMetric,
      );
      const labelX = plotMetricLabel(xMetric);
      const labelY = plotMetricLabel(yMetric);
      if (next.length === 0) {
        setPoints([]);
        if (announce) {
          setStatus(`No ${labelX}/${labelY} for ${season}.`);
        }
        return next;
      }
      setPoints(next);
      setTitle((current) =>
        isAutoTitle(current) ? autoPlotTitle(xMetric, yMetric, subject) : current,
      );
      const pinNote =
        subject === "players" && pinnedIds.length
          ? ` (${pinnedIds.length} pinned)`
          : "";
      setStatus(
        `Plotted ${next.length} ${subject}${pinNote} on ${labelX} vs ${labelY}.`,
      );
      return next;
    },
    [
      subject,
      season,
      xMetric,
      yMetric,
      filters,
      pinnedIds,
      statsSample,
      sizeMetric,
    ],
  );

  useEffect(() => {
    if (!hydrated || !rostersReady || !populated) {
      return;
    }
    if (skipLivePlot.current) {
      skipLivePlot.current = false;
      return;
    }
    applyPlot(false);
  }, [hydrated, rostersReady, populated, applyPlot]);

  const handlePopulate = () => {
    setPopulated(true);
    skipLivePlot.current = false;
    push(points);
    applyPlot(true);
  };

  const swapAxes = () => {
    const nextX = yMetric;
    const nextY = xMetric;
    setXMetric(nextX);
    setYMetric(nextY);
    setTitle((current) =>
      isAutoTitle(current) ? autoPlotTitle(nextX, nextY, subject) : current,
    );
  };

  const renderInput = {
    brand,
    title,
    subject,
    xMetric,
    yMetric,
    points,
    highlightedIds,
    quadrants,
    look,
    purpleFlair,
    showBa,
    showNames,
  };

  const handleExport = async (filename?: string, story = false, square = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    setStatus("Rendering PNG…");
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await exportPlotPng(
        node,
        filename ?? exportFilenameFromTitle(title, "plot"),
        renderInput,
        story,
        square,
      );
      setStatus(
        square
          ? "1:1 PNG download started."
          : story
            ? "Story PNG download started."
            : "Download started.",
      );
    } catch (error) {
      console.error(error);
      setStatus("Could not export PNG.");
    } finally {
      setExporting(false);
    }
  };

  const closePin = useCallback(() => setPinning(false), []);
  const matchCount =
    subject === "teams"
      ? matchingTeamIds({
          team: filters.team,
          division: filters.division,
          conference: filters.conference,
        }).length
      : searchPlayers("", filters).length;

  const usedPins: Record<string, string> = {};
  pinnedIds.forEach((id) => {
    usedPins[id] = "Pinned";
  });

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Plot"
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
          presets={PLOT_TITLE_PRESETS}
          onChange={setTitle}
        />
          </>
        }
        data={
          <>
        <label className="sc-field">
          Season
          <select
            value={season}
            aria-label="Plot season"
            disabled={!rostersReady}
            onChange={(event) =>
              setSeason(parseEveryTeamSeason(event.target.value))
            }
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
        <div className="sc-look" role="group" aria-label="Plot subject">
          <span className="sc-look__label">Dots</span>
          <button
            type="button"
            className={subject === "teams" ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={subject === "teams"}
            onClick={() => setSubject("teams")}
          >
            Teams
          </button>
          <button
            type="button"
            className={subject === "players" ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={subject === "players"}
            onClick={() => setSubject("players")}
          >
            Players
          </button>
        </div>
        <label className="sc-field">
          X
          <select
            value={xMetric}
            aria-label="X axis stat"
            onChange={(event) =>
              setXMetric(parseEveryTeamStatMetric(event.target.value))
            }
          >
            {EVERY_TEAM_STAT_METRICS.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.label}
              </option>
            ))}
          </select>
        </label>
        <label className="sc-field">
          Y
          <select
            value={yMetric}
            aria-label="Y axis stat"
            onChange={(event) =>
              setYMetric(parseEveryTeamStatMetric(event.target.value))
            }
          >
            {EVERY_TEAM_STAT_METRICS.map((metric) => (
              <option key={`y-${metric.id}`} value={metric.id}>
                {metric.label}
              </option>
            ))}
          </select>
        </label>
        <label className="sc-field">
          Size
          <select
            value={sizeMetric}
            aria-label="Size dots by a third stat"
            onChange={(event) =>
              setSizeMetric(parsePlotSizeMetric(event.target.value))
            }
          >
            <option value="none">Off</option>
            {EVERY_TEAM_STAT_METRICS.map((metric) => (
              <option key={`size-${metric.id}`} value={metric.id}>
                {metric.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="sc-chip"
          aria-label="Swap X and Y"
          onClick={swapAxes}
        >
          Swap
        </button>
        <button
          type="button"
          className="sc-chip"
          onClick={handlePopulate}
          disabled={!rostersReady}
        >
          Populate
        </button>
          </>
        }
        filters={
          <>
        <PlayerFilterBar
          filters={filters}
          matchCount={matchCount}
          onChange={setFilters}
          onReset={() => setFilters({ ...EMPTY_PLAYER_FILTERS })}
          variant={subject === "teams" ? "teams" : "players"}
        />
        {subject === "players" ? (
          <div className="sc-look" role="group" aria-label="Pin players">
            <span className="sc-look__label">Pin</span>
            <button
              type="button"
              className="sc-chip"
              onClick={() => setPinning(true)}
            >
              Pin player
            </button>
            {pinnedIds.length ? (
              <button
                type="button"
                className="sc-chip"
                onClick={() => setPinnedIds([])}
              >
                Clear pins
              </button>
            ) : null}
          </div>
        ) : null}
        {subject === "players" && pinnedIds.length ? (
          <div className="sc-look" role="list" aria-label="Pinned players">
            {pinnedIds.map((id) => (
              <button
                key={id}
                type="button"
                className="sc-chip is-on"
                role="listitem"
                onClick={() =>
                  setPinnedIds((current) => unpinPlotPlayer(current, id))
                }
              >
                {getPlayer(id)?.name ?? id} ×
              </button>
            ))}
          </div>
        ) : null}
        <div className="sc-look" role="group" aria-label="Highlight dots">
          <span className="sc-look__label">Glow</span>
          <button
            type="button"
            className="sc-chip"
            onClick={() => setHighlighting(true)}
          >
            Highlight {subject === "teams" ? "teams" : "players"}
          </button>
          {highlightedIds.length ? (
            <button
              type="button"
              className="sc-chip"
              onClick={() => setHighlightedIds([])}
            >
              Clear glow
            </button>
          ) : null}
        </div>
        {highlightedIds.length ? (
          <div className="sc-look" role="list" aria-label="Highlighted dots">
            {highlightedIds.map((id) => (
              <button
                key={`hot-${id}`}
                type="button"
                className="sc-chip is-on"
                role="listitem"
                onClick={() =>
                  setHighlightedIds((current) => togglePlotId(current, id))
                }
              >
                {getPlayer(id)?.name ?? id} ×
              </button>
            ))}
          </div>
        ) : null}
          </>
        }
        board={
          <>
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <ComposerNamesToggle
          on={showNames}
          onChange={setShowNames}
          label="Labels"
          ariaLabel="Show names on the plot"
        />
        <label className="sc-field">
          TL
          <input
            value={quadrants.tl}
            maxLength={18}
            aria-label="Top-left quadrant"
            onChange={(event) =>
              setQuadrants((current) => ({ ...current, tl: event.target.value }))
            }
          />
        </label>
        <label className="sc-field">
          TR
          <input
            value={quadrants.tr}
            maxLength={18}
            aria-label="Top-right quadrant"
            onChange={(event) =>
              setQuadrants((current) => ({ ...current, tr: event.target.value }))
            }
          />
        </label>
        <label className="sc-field">
          BL
          <input
            value={quadrants.bl}
            maxLength={18}
            aria-label="Bottom-left quadrant"
            onChange={(event) =>
              setQuadrants((current) => ({ ...current, bl: event.target.value }))
            }
          />
        </label>
        <label className="sc-field">
          BR
          <input
            value={quadrants.br}
            maxLength={18}
            aria-label="Bottom-right quadrant"
            onChange={(event) =>
              setQuadrants((current) => ({ ...current, br: event.target.value }))
            }
          />
        </label>
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
          board={{
            brand,
            title,
            subject,
            xMetric,
            yMetric,
            season,
            points,
            pinnedIds,
            highlightedIds,
            sizeMetric,
            quadrants,
            showBa,
            showNames,
            filters,
          }}
          onLoad={(next) => {
            applyDraft(next);
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
                setPoints(previous);
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
              push(points);
              skipLivePlot.current = true;
              setPopulated(false);
              applyDraft(
                defaultPlotDraft(season),
              );
              setStatus("Blank post.");
            }}
          >
            Blank post
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              void copyGraphicCaption(
                graphicCaption(title, plotCaptionNames(points), [
                  `${plotMetricLabel(xMetric)} vs ${plotMetricLabel(yMetric)}`,
                ]),
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
                exportFilenameFromTitle(title, "plot", "", true),
                true,
              )
            }
            disabled={exporting}
          >
            Export 9:16
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost sc-btn--aside"
            onClick={() => void handleExport(undefined, false, true)}
            disabled={exporting}
            aria-label="Export 1:1"
          >
            Export 1:1
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              void (async () => {
                setExporting(true);
                setStatus("Rendering pack…");
                try {
                  await downloadExportPack(
                    () => renderPlotCanvas(renderInput, 2),
                    exportFilenameFromTitle(title, "plot"),
                    [
                      {
                        filename: storyFilename(
                          exportFilenameFromTitle(title, "plot"),
                        ),
                        render: () =>
                          renderPlotCanvas({ ...renderInput, story: true }, 2),
                      },
                    ],
                    { letterbox: false },
                  );
                  setStatus("Pack download started (4:5 + 9:16).");
                } catch (error) {
                  console.error(error);
                  setStatus("Could not export pack.");
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
        <div className={storyCrop ? "sc-stage__frame is-story" : "sc-stage__frame"}>
          <ComposerBoard height={storyCrop ? STORY_DESIGN_HEIGHT : undefined}>
            <PlotGraphic
              ref={boardRef}
              brand={brand}
              title={title}
              subject={subject}
              xMetric={xMetric}
              yMetric={yMetric}
              points={points}
              highlightedIds={highlightedIds}
              quadrants={quadrants}
              look={look}
              purpleFlair={purpleFlair}
              showBa={showBa}
              showNames={showNames}
              exporting={exporting}
              story={storyCrop}
              onBrandChange={setBrand}
              onTitleChange={setTitle}
            />
            <StoryCropGuide on={storyCrop} />
          </ComposerBoard>
          <p className="sc-hint">
            Scatter of teams or players on two season stats. Empty until you
            Populate; after that, X/Y, season, size-by, filters, pins, and Swap
            re-plot live. Highlight several players or teams so they glow.
            Quadrant labels sit in the corners. Downloads a 4:5 Instagram PNG —
            nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {pinning ? (
        <PlayerPicker
          heading="Pin a player"
          hint="Pinned players are the only dots when you Populate. Leave pins empty to plot everyone matching the filters."
          currentId={null}
          usedLabels={usedPins}
          onPick={(playerId) => {
            setPinnedIds((current) => pinPlotPlayer(current, playerId));
            const player = getPlayer(playerId);
            setStatus(
              populated
                ? `Pinned ${player?.name ?? "player"}.`
                : `Pinned ${player?.name ?? "player"}. Populate to plot.`,
            );
          }}
          onClear={() => {
            if (pinnedIds[0]) {
              setPinnedIds((current) => unpinPlotPlayer(current, current[0]!));
            }
          }}
          onClose={closePin}
        />
      ) : null}
      {highlighting && subject === "players" ? (
        <PlayerPicker
          heading="Highlight players"
          hint="Highlighted players glow on the plot. Pin several — not only one."
          currentId={null}
          usedLabels={Object.fromEntries(
            highlightedIds.map((id) => [id, "Glowing"]),
          )}
          onPick={(playerId) => {
            setHighlightedIds((current) => togglePlotId(current, playerId));
            const player = getPlayer(playerId);
            setStatus(`Highlighted ${player?.name ?? "player"}.`);
          }}
          onClear={() => setHighlightedIds([])}
          onClose={() => setHighlighting(false)}
        />
      ) : null}
      {highlighting && subject === "teams" ? (
        <TeamPicker
          heading="Highlight teams"
          hint="Highlighted teams glow on the plot. Pin several."
          currentId={null}
          usedLabels={Object.fromEntries(
            highlightedIds.map((id) => [id, "Glowing"]),
          )}
          onPick={(teamId) => {
            setHighlightedIds((current) => togglePlotId(current, teamId));
            setStatus(`Highlighted ${teamId}.`);
          }}
          onClose={() => setHighlighting(false)}
        />
      ) : null}
    </div>
  );
}
