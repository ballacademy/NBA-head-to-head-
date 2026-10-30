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
  fillToLeaderRows,
  leaderRowName,
  leaderTitleFor,
  listNightLeaders,
  listSeasonLeaders,
  parseLeaderRowCount,
  patchLeaderRow,
  resizeLeaderRows,
  type LeaderRow,
} from "../leaderboardComposer/leaderboardFill";
import { LeaderSplitGraphic } from "./LeaderSplitGraphic";
import { exportLeaderSplitPng } from "./exportLeaderSplitPng";
import { renderLeaderSplitCanvas } from "./renderLeaderSplitCanvas";
import {
  applyLeaderSplitHero,
  DEFAULT_LEADER_SPLIT_TITLE,
  defaultLeaderSplitDraft,
  hasCustomSplitPhoto,
  isLeaderSplitDraft,
  LEADER_SPLIT_SAVES_KEY,
  LEADER_SPLIT_STORAGE_KEY,
  leaderSplitCaption,
  normalizeLeaderSplitDraft,
  setLeaderSplitPhoto,
  type LeaderSplitDraft,
} from "./leaderSplitState";
import "@fontsource/montserrat/latin-900.css";
import "./leaderSplitComposer.css";

const LOOK_KEY = "ddgm:leader-split-composer-look";

const loadDraft = (): LeaderSplitDraft => {
  const stored = readJson<Partial<LeaderSplitDraft>>(LEADER_SPLIT_STORAGE_KEY);
  if (isLeaderSplitDraft(stored)) {
    return normalizeLeaderSplitDraft(stored);
  }
  return defaultLeaderSplitDraft(everyTeamCurrentSeason());
};

export function LeaderSplitComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<LeaderSplitDraft>(() =>
    defaultLeaderSplitDraft(everyTeamCurrentSeason()),
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
  const { push, pop, canUndo } = useComposerUndo<LeaderSplitDraft>();
  const { range, setRange } = useComposerDateRange();

  useEffect(() => {
    document.title = "Leader split";
    void hydrateJsonStorage().then(() => {
      setDraft(loadDraft());
      setHydrated(true);
    });
    void loadEveryTeamRosters().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(LEADER_SPLIT_STORAGE_KEY, draft);
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
    setDraft((current) => applyLeaderSplitHero(current, player, keepPhoto));
    setKeepPrompt(null);
    setPickerOpen(false);
  };

  const fillBoard = () => {
    setFilling(true);
    const applyFills = (fills: ReturnType<typeof listSeasonLeaders>) => {
      setDraft((current) => {
        const rows = fillToLeaderRows(
          current.rows,
          fills,
          current.metric,
          current.windowKind,
        );
        const first = fills[0];
        const player = first ? getPlayer(first.playerId) : null;
        let next: LeaderSplitDraft = {
          ...current,
          rows,
          title:
            current.title === DEFAULT_LEADER_SPLIT_TITLE ||
            current.title === leaderTitleFor(current.metric, current.windowKind)
              ? leaderTitleFor(current.metric, current.windowKind)
              : current.title,
        };
        if (player) {
          next = applyLeaderSplitHero(next, player, hasCustomSplitPhoto(next));
        }
        setStatus(
          fills.length
            ? `Filled ${fills.length} from the real table.`
            : "No rows in that table — nothing invented.",
        );
        return next;
      });
    };
    if (draft.windowKind === "season") {
      void loadEveryTeamRosters()
        .then(() =>
          applyFills(
            listSeasonLeaders(
              draft.season || everyTeamCurrentSeason(),
              draft.metric,
              statsSample,
              draft.rows.length,
            ),
          ),
        )
        .finally(() => setFilling(false));
      return;
    }
    void fetchRangeProduction(range.from, range.to)
      .then((rows) =>
        applyFills(listNightLeaders(rows, draft.metric, draft.rows.length)),
      )
      .finally(() => setFilling(false));
  };

  const renderInput = () => ({ ...draft, look, purpleFlair, photoGrade });
  const filenameFor = () =>
    exportFilenameFromTitle(
      draft.title,
      "leader-split",
      draft.windowKind === "season" ? draft.season : draft.from,
      false,
      leaderRowName(draft.rows[0] ?? {
        firstName: "",
        lastName: "",
        playerId: null,
        teamId: null,
        value: "",
        rawValue: null,
        headshotUrl: null,
      }),
    );

  const handleExport = async (story = false, square = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    try {
      await exportLeaderSplitPng(node, filenameFor(), renderInput(), story, square);
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
        if (!dataUrl) {
          return;
        }
        event.preventDefault();
        setDraft((current) => setLeaderSplitPhoto(current, dataUrl));
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Leader split"
        identity={
          <label className="sc-field sc-field--wide">
            Title
            <input
              value={draft.title}
              maxLength={72}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
            />
          </label>
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
                <ComposerStatsSampleToggle
                  sample={statsSample}
                  onChange={setStatsSample}
                />
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
            <label className="sc-field">
              Stat
              <select
                value={draft.metric}
                aria-label="Leader stat"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    metric: parseEveryTeamStatMetric(event.target.value),
                  }))
                }
              >
                {EVERY_TEAM_STAT_METRICS.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </label>
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
              value={String(parseLeaderRowCount(draft.rows.length)) as "5" | "8" | "10"}
              options={[
                { value: "5", label: "5" },
                { value: "8", label: "8" },
                { value: "10", label: "10" },
              ]}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  rows: resizeLeaderRows(current.rows, Number(value)),
                }))
              }
            />
            <ComposerHudSelect
              label="Layout"
              ariaLabel="Photo side"
              value={draft.mirror ? "mirror" : "list-left"}
              options={[
                { value: "list-left", label: "List left" },
                { value: "mirror", label: "Photo left" },
              ]}
              onChange={(value) =>
                setDraft((current) => ({ ...current, mirror: value === "mirror" }))
              }
            />
            <ComposerHudSelect
              label="List faces"
              ariaLabel="List headshots"
              value={draft.showListHeadshots ? "on" : "off"}
              options={[
                { value: "off", label: "Logos" },
                { value: "on", label: "Headshots" },
              ]}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  showListHeadshots: value === "on",
                }))
              }
            />
            <ComposerHudSelect
              label="Name plates"
              ariaLabel="Team-color name plates"
              value={draft.namePlates !== false ? "on" : "off"}
              options={[
                { value: "on", label: "On" },
                { value: "off", label: "Off" },
              ]}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  namePlates: value === "on",
                }))
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
            storageKey={LEADER_SPLIT_SAVES_KEY}
            board={draft}
            onLoad={(next) => setDraft(normalizeLeaderSplitDraft(next))}
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
                  graphicCaption(draft.title, leaderSplitCaption(draft).slice(1)),
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
                setDraft(keepComposerPhotos(defaultLeaderSplitDraft(draft.season), draft));
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
                setDraft(defaultLeaderSplitDraft(everyTeamCurrentSeason()));
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
                      () => renderLeaderSplitCanvas(renderInput(), 2),
                      filename,
                      [
                        {
                          filename: storyFilename(filename),
                          render: () =>
                            renderLeaderSplitCanvas(
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
              <LeaderSplitGraphic
                ref={boardRef}
                draft={draft}
                look={look}
                purpleFlair={purpleFlair}
                photoGrade={photoGrade}
                exporting={exporting}
                story={storyCrop}
                onTitleChange={(title) => setDraft((current) => ({ ...current, title }))}
                onRowChange={(index, patch: Partial<LeaderRow>) =>
                  setDraft((current) => ({
                    ...current,
                    rows: patchLeaderRow(current.rows, index, patch),
                  }))
                }
                onPan={(pan) => setDraft((current) => ({ ...current, pan }))}
                onUpload={(dataUrl) =>
                  setDraft((current) => setLeaderSplitPhoto(current, dataUrl))
                }
                onPick={() => setPickerOpen(true)}
                onPickRow={(index) => {
                  const row = draft.rows[index];
                  if (!row?.playerId) return;
                  const player = getPlayer(row.playerId);
                  if (player) {
                    setDraft((current) =>
                      applyLeaderSplitHero(current, player, hasCustomSplitPhoto(current)),
                    );
                  }
                }}
              />
            </ComposerBoard>
            <StoryCropGuide on={storyCrop} />
          </div>
        </div>
      </main>
      {pickerOpen ? (
        <PlayerPicker
          heading="Pick leader photo"
          hint="Picking a name swaps the hero photo without rewriting the list."
          currentId={draft.playerId}
          usedLabels={
            draft.playerId ? { [draft.playerId]: "Photo" } : {}
          }
          onClose={closePicker}
          onClear={() => {
            setDraft((current) => ({
              ...current,
              playerId: null,
              teamId: null,
              photoSrc: hasCustomSplitPhoto(current) ? current.photoSrc : null,
              customPhoto: hasCustomSplitPhoto(current),
            }));
            closePicker();
          }}
          onPick={(playerId) => {
            if (hasCustomSplitPhoto(draft)) {
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
