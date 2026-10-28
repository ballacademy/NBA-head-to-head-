import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerDateRange } from "../instagramComposer/ComposerDateRange";
import { ComposerHudSelect } from "../instagramComposer/ComposerHudSelect";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import { confirmBlankPost } from "../instagramComposer/confirmBlankPost";
import { rememberComposerPlayer } from "../instagramComposer/composerCarry";
import { useComposerDateRange } from "../instagramComposer/composerDateRange";
import { useComposerLook, usePurpleFlair } from "../instagramComposer/composerLook";
import { keepComposerPhotos } from "../instagramComposer/composerPhotos";
import { exportFilenameFromTitle } from "../instagramComposer/composerPresets";
import { copyGraphicCaption, graphicCaption } from "../instagramComposer/graphicCaption";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import { usePhotoGrade } from "../instagramComposer/photoGrade";
import { ComposerStatsSampleToggle } from "../instagramComposer/ComposerStatsSampleToggle";
import { useComposerStatsSample } from "../instagramComposer/composerStatsSample";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { hydrateJsonStorage, readJson, writeJson } from "../lib/browserStorage";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { fetchRangeProduction } from "../playerOfTheDayComposer/nightStandouts";
import { GRAPHIC_HEIGHT, STORY_DESIGN_HEIGHT } from "../standingsComposer/rankingState";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  EVERY_TEAM_STAT_METRICS,
  everyTeamCurrentSeason,
  everyTeamSeasons,
  loadEveryTeamRosters,
  parseEveryTeamSeason,
  parseEveryTeamStatMetric,
} from "../everyTeamComposer/historicalRosters";
import {
  columnHeaderFor,
  fillToLeaderRows,
  leaderRowName,
  listNightLeaders,
  listSeasonLeaders,
  parseLeaderRowCount,
  patchLeaderRow,
  resizeLeaderRows,
  type LeaderRow,
} from "../leaderboardComposer/leaderboardFill";
import { DualRanksGraphic } from "./DualRanksGraphic";
import { exportDualRanksPng } from "./exportDualRanksPng";
import { renderDualRanksCanvas } from "./renderDualRanksCanvas";
import {
  applyDualRanksHero,
  defaultDualRanksDraft,
  dualCaptionLines,
  DUAL_RANKS_SAVES_KEY,
  DUAL_RANKS_STORAGE_KEY,
  hasCustomDualPhoto,
  isDualRanksDraft,
  normalizeDualRanksDraft,
  setDualRanksPhoto,
  type DualRanksDraft,
  type DualRanksLayout,
} from "./dualRanksState";
import "@fontsource/montserrat/latin-900.css";
import "./dualRanksComposer.css";

const LOOK_KEY = "ddgm:dual-ranks-composer-look";

const loadDraft = (): DualRanksDraft => {
  const stored = readJson<Partial<DualRanksDraft>>(DUAL_RANKS_STORAGE_KEY);
  if (isDualRanksDraft(stored)) {
    return normalizeDualRanksDraft(stored);
  }
  return defaultDualRanksDraft(everyTeamCurrentSeason());
};

const emptyRow = (): LeaderRow => ({
  playerId: null,
  teamId: null,
  firstName: "",
  lastName: "",
  value: "",
  rawValue: null,
  headshotUrl: null,
});

export function DualRanksComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<DualRanksDraft>(() =>
    defaultDualRanksDraft(everyTeamCurrentSeason()),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filling, setFilling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade, gradeIntensity, setGradeIntensity] =
    usePhotoGrade();
  const [statsSample, setStatsSample] = useComposerStatsSample();
  const [storyCrop, setStoryCrop] = useState(false);
  const [keepPrompt, setKeepPrompt] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<DualRanksDraft>();
  const { range, setRange } = useComposerDateRange();

  useEffect(() => {
    document.title = "Dual ranks";
    void hydrateJsonStorage().then(() => {
      setDraft(loadDraft());
      setHydrated(true);
    });
    void loadEveryTeamRosters().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(DUAL_RANKS_STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const commitPick = (playerId: string, keepPhoto: boolean) => {
    const player = getPlayer(playerId);
    if (!player) return;
    rememberComposerPlayer(playerId);
    push(draft);
    setDraft((current) => applyDualRanksHero(current, player, keepPhoto));
    setKeepPrompt(null);
    setPickerOpen(false);
  };

  const fillBoard = () => {
    setFilling(true);
    const run = async () => {
      if (draft.windowKind === "season") {
        await loadEveryTeamRosters();
        const left = listSeasonLeaders(
          draft.season || everyTeamCurrentSeason(),
          draft.leftMetric,
          statsSample,
          draft.leftRows.length,
        );
        const right = listSeasonLeaders(
          draft.season || everyTeamCurrentSeason(),
          draft.rightMetric,
          statsSample,
          draft.rightRows.length,
        );
        return { left, right };
      }
      const nights = await fetchRangeProduction(range.from, range.to);
      return {
        left: listNightLeaders(nights, draft.leftMetric, draft.leftRows.length),
        right: listNightLeaders(nights, draft.rightMetric, draft.rightRows.length),
      };
    };
    void run()
      .then(({ left, right }) => {
        setDraft((current) => {
          const leftRows = fillToLeaderRows(
            current.leftRows,
            left,
            current.leftMetric,
            current.windowKind,
          );
          const rightRows = fillToLeaderRows(
            current.rightRows,
            right,
            current.rightMetric,
            current.windowKind,
          );
          const first = left[0] ? getPlayer(left[0].playerId) : null;
          let next: DualRanksDraft = {
            ...current,
            leftRows,
            rightRows,
            leftHeader: current.leftHeader || columnHeaderFor(current.leftMetric),
            rightHeader: current.rightHeader || columnHeaderFor(current.rightMetric),
          };
          if (first) {
            next = applyDualRanksHero(next, first, hasCustomDualPhoto(next));
          }
          const missing =
            !left.length && !right.length
              ? "No rows in that table — nothing invented."
              : !right.length
                ? `Filled ${left.length} ${current.leftHeader}; ${current.rightHeader} isn’t on that sample.`
                : `Filled two real tables (${left.length} / ${right.length}).`;
          setStatus(missing);
          return next;
        });
      })
      .finally(() => setFilling(false));
  };

  const renderInput = () => ({ ...draft, look, purpleFlair, photoGrade });
  const filenameFor = () =>
    exportFilenameFromTitle(
      `${draft.leftHeader} ${draft.rightHeader}`,
      "dual-ranks",
      draft.windowKind === "season" ? draft.season : draft.from,
      false,
      leaderRowName(draft.leftRows[0] ?? emptyRow()),
    );

  const handleExport = async (story = false, square = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    try {
      await exportDualRanksPng(node, filenameFor(), renderInput(), story, square);
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
        setDraft((current) => setDualRanksPhoto(current, dataUrl));
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const metricSelect = (
    label: string,
    value: DualRanksDraft["leftMetric"],
    onChange: (metric: DualRanksDraft["leftMetric"]) => void,
  ) => (
    <label className="sc-field">
      {label}
      <select
        value={value}
        aria-label={label}
        onChange={(event) => onChange(parseEveryTeamStatMetric(event.target.value))}
      >
        {EVERY_TEAM_STAT_METRICS.map((metric) => (
          <option key={metric.id} value={metric.id}>
            {metric.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Dual ranks"
        identity={
          <>
            <label className="sc-field">
              Left title
              <input
                value={draft.leftHeader}
                maxLength={24}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, leftHeader: event.target.value }))
                }
              />
            </label>
            <label className="sc-field">
              Right title
              <input
                value={draft.rightHeader}
                maxLength={24}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, rightHeader: event.target.value }))
                }
              />
            </label>
          </>
        }
        data={
          <>
            <ComposerHudSelect
              label="Window"
              ariaLabel="Fill window"
              value={draft.windowKind}
              options={[
                { value: "season", label: "Season" },
                { value: "range", label: "Range" },
              ]}
              onChange={(windowKind) =>
                setDraft((current) => ({ ...current, windowKind }))
              }
            />
            {draft.windowKind === "season" ? (
              <>
                <label className="sc-field">
                  Season
                  <select
                    value={draft.season}
                    aria-label="Season"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        season: parseEveryTeamSeason(event.target.value),
                      }))
                    }
                  >
                    {everyTeamSeasons().map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <ComposerStatsSampleToggle sample={statsSample} onChange={setStatsSample} />
                <button type="button" className="sc-chip" disabled={filling} onClick={fillBoard}>
                  {filling ? "Loading…" : "Fill"}
                </button>
              </>
            ) : (
              <ComposerDateRange
                from={range.from}
                to={range.to}
                simpleSet="week"
                fillLabel={filling ? "Loading…" : "Fill"}
                filling={filling}
                onFill={fillBoard}
                onChange={(next) => {
                  setRange(next);
                  setDraft((current) => ({
                    ...current,
                    from: next.from,
                    to: next.to,
                    windowKind: "range",
                  }));
                }}
              />
            )}
            {metricSelect("Stat 1", draft.leftMetric, (leftMetric) =>
              setDraft((current) => ({
                ...current,
                leftMetric,
                leftHeader: columnHeaderFor(leftMetric),
              })),
            )}
            {metricSelect("Stat 2", draft.rightMetric, (rightMetric) =>
              setDraft((current) => ({
                ...current,
                rightMetric,
                rightHeader: columnHeaderFor(rightMetric),
              })),
            )}
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
              label="Rows"
              ariaLabel="Row count"
              value={String(parseLeaderRowCount(draft.leftRows.length)) as "5" | "8"}
              options={[
                { value: "5", label: "5" },
                { value: "8", label: "8" },
              ]}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  leftRows: resizeLeaderRows(current.leftRows, Number(value)),
                  rightRows: resizeLeaderRows(current.rightRows, Number(value)),
                }))
              }
            />
            <ComposerHudSelect
              label="Layout"
              ariaLabel="Dual layout"
              value={draft.layout}
              options={[
                { value: "side", label: "Photo left" },
                { value: "top", label: "Photo on top" },
                { value: "well", label: "Bottom well" },
              ]}
              onChange={(layout: DualRanksLayout) =>
                setDraft((current) => ({ ...current, layout }))
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
            storageKey={DUAL_RANKS_SAVES_KEY}
            board={draft}
            onLoad={(next) => setDraft(normalizeDualRanksDraft(next))}
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
                  graphicCaption(
                    `${draft.leftHeader} / ${draft.rightHeader}`,
                    dualCaptionLines(draft).slice(1),
                  ),
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
                setDraft(keepComposerPhotos(defaultDualRanksDraft(draft.season), draft));
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
                setDraft(defaultDualRanksDraft(everyTeamCurrentSeason()));
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
                      () => renderDualRanksCanvas(renderInput(), 2),
                      filename,
                      [
                        {
                          filename: storyFilename(filename),
                          render: () =>
                            renderDualRanksCanvas(
                              { ...renderInput(), story: true },
                              2,
                            ),
                        },
                      ],
                      { letterbox: false },
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
              <DualRanksGraphic
                ref={boardRef}
                draft={draft}
                look={look}
                purpleFlair={purpleFlair}
                photoGrade={photoGrade}
                exporting={exporting}
                story={storyCrop}
                onHeaderChange={(side, value) =>
                  setDraft((current) =>
                    side === "left"
                      ? { ...current, leftHeader: value }
                      : { ...current, rightHeader: value },
                  )
                }
                onRowChange={(side, index, patch) =>
                  setDraft((current) =>
                    side === "left"
                      ? { ...current, leftRows: patchLeaderRow(current.leftRows, index, patch) }
                      : { ...current, rightRows: patchLeaderRow(current.rightRows, index, patch) },
                  )
                }
                onPan={(pan) => setDraft((current) => ({ ...current, pan }))}
                onUpload={(dataUrl) =>
                  setDraft((current) => setDualRanksPhoto(current, dataUrl))
                }
                onPick={() => setPickerOpen(true)}
              />
            </ComposerBoard>
            <StoryCropGuide on={storyCrop} />
          </div>
        </div>
      </main>
      {pickerOpen ? (
        <PlayerPicker
          heading="Pick featured player"
          hint="Highlights that player in both lists if they are already on the table — never invents a rank."
          currentId={draft.playerId}
          usedLabels={draft.playerId ? { [draft.playerId]: "Featured" } : {}}
          onClose={closePicker}
          onClear={() => {
            setDraft((current) => ({
              ...current,
              playerId: null,
              featuredPlayerId: null,
              photoSrc: hasCustomDualPhoto(current) ? current.photoSrc : null,
              customPhoto: hasCustomDualPhoto(current),
            }));
            closePicker();
          }}
          onPick={(playerId) => {
            if (hasCustomDualPhoto(draft)) {
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
