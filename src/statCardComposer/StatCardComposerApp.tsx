import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerHudExtras } from "../instagramComposer/ComposerHudExtras";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerStatsSampleToggle } from "../instagramComposer/ComposerStatsSampleToggle";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { StatCardFlipToggle } from "./StatCardFlipToggle";
import { usePhotoGrade } from "../instagramComposer/photoGrade";
import { useComposerStatsSample } from "../instagramComposer/composerStatsSample";
import {
  STAT_CARD_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { ComposerDateRange } from "../instagramComposer/ComposerDateRange";
import {
  lastNightRange,
  matchDateRangePreset,
  useStatCoverDateRange,
} from "../instagramComposer/composerDateRange";
import { ComposerPhotoHud } from "../instagramComposer/ComposerPhotoHud";
import { WatermarkToggle } from "../instagramComposer/WatermarkToggle";
import {
  nightStandoutPickerRows,
  useComposerNight,
} from "../instagramComposer/composerNight";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import { GRAPHIC_HEIGHT, STORY_DESIGN_HEIGHT } from "../standingsComposer/rankingState";
import { nextStatsLeft } from "./statCardLayout";
import {
  copyGraphicCaption,
  statCardLineCaption,
} from "../instagramComposer/graphicCaption";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { keepComposerPhotos } from "../instagramComposer/composerPhotos";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { exportFilenameFromTitle } from "../instagramComposer/composerPresets";
import { readJson, writeJson } from "../lib/browserStorage";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import {
  aggregateLastGames,
  fetchLastGame,
  fetchRecentGames,
  gamesInInclusiveRange,
  isoDateOnly,
  type LastGame,
} from "../playerOfTheDayComposer/lastGame";
import {
  completedNightRows,
  fetchDudsInRange,
  fetchStandoutsInRange,
  isRoughNight,
  usualLineFor,
} from "../playerOfTheDayComposer/nightStandouts";
import type { NightStandout } from "../playerOfTheDayComposer/nightStandouts";
import {
  everyTeamCurrentSeason,
  everyTeamSeasons,
  loadEveryTeamRosters,
  previousSeason,
} from "../everyTeamComposer/historicalRosters";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { StatCardGraphic } from "./StatCardGraphic";
import { exportStatCardPng } from "./exportStatCardPng";
import { renderStatCardCanvas } from "./renderStatCardCanvas";
import {
  addStatCardLine,
  applyPlayerName,
  clipStatLabel,
  clipStatMatchup,
  clearStatCardSubject,
  defaultStatCardDraft,
  fillStatCardFromGame,
  fillStatCardFromPlayer,
  fillStatCardFromSeason,
  applyStatCardHighs,
  fillStatCardFromStandout,
  fillStatCardFromRoughNight,
  formatStatCardMatchup,
  hasCustomPhoto,
  isStatCardDraft,
  STAT_CARD_STORAGE_KEY,
  normalizeStatCardDraft,
  persistStatCardStatsLeft,
  peekStatCardStatsLeft,
  parseStatCardKey,
  parseStatCardSource,
  playerName,
  moveStatCardLine,
  removeStatCardLine,
  setStatCardLineKey,
  setStatCardPhoto,
  nextStatCardLine,
  STAT_CARD_LINE_OPTIONS,
  STC_STAT_COUNT,
  STC_STAT_MAX,
  type StatCardDraft,
  type StatCardLine,
  type StatCardSource,
} from "./statCardState";
import "@fontsource/montserrat/latin-900.css";
import "./statCardComposer.css";
import { confirmBlankPost } from "../instagramComposer/confirmBlankPost";
import { carriedPlayerId } from "../instagramComposer/composerCarry";

const STORAGE_KEY = STAT_CARD_STORAGE_KEY;
const SAVES_KEY = "ddgm:stat-card-composer:saves";

const loadDraft = (): StatCardDraft => {
  const stored = readJson<Partial<StatCardDraft>>(STORAGE_KEY);
  const base = isStatCardDraft(stored)
    ? normalizeStatCardDraft(stored)
    : defaultStatCardDraft();
  if (base.playerId) {
    return base;
  }
  const player = getPlayer(carriedPlayerId());
  return player ? fillStatCardFromPlayer(player, base) : base;
};

export function StatCardComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultStatCardDraft();
  const [draft, setDraft] = useState<StatCardDraft>(empty);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(STAT_CARD_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade, gradeIntensity, setGradeIntensity] = usePhotoGrade();
  const [statsSample, setStatsSample] = useComposerStatsSample();
  const [rostersReady, setRostersReady] = useState(false);
  const [keepPrompt, setKeepPrompt] = useState<{
    playerId: string;
    playerName: string;
    recs?: "standouts" | "rough-night";
  } | null>(null);
  const [storyCrop, setStoryCrop] = useState(false);
  const lastGameRef = useRef<LastGame | null>(null);
  const seasonGamesRef = useRef<LastGame[]>([]);
  const priorGamesRef = useRef<LastGame[]>([]);
  const rangeAggregateRef = useRef(false);
  const fillSeq = useRef(0);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const { push, pop, canUndo } = useComposerUndo<StatCardDraft>();
  const night = useComposerNight();
  const { range, setRange } = useStatCoverDateRange();
  const [rangeStandouts, setRangeStandouts] = useState<NightStandout[]>([]);
  const [rangeDuds, setRangeDuds] = useState<NightStandout[]>([]);
  const [standoutsLoading, setStandoutsLoading] = useState(false);
  const [dudsLoading, setDudsLoading] = useState(false);
  const source = parseStatCardSource(draft.source);
  const todayIso = night.todayIso;
  const yesterdayIso = night.yesterdayIso;
  const gameDate = range.to;

  useEffect(() => {
    document.title = "Stat card graphic";
    void loadEveryTeamRosters()
      .then(() => setRostersReady(true))
      .catch((error: unknown) => {
        console.error(error);
      })
      .finally(() => {
        setDraft(loadDraft());
        setHydrated(true);
      });
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const markHighs = (next: StatCardDraft) =>
    applyStatCardHighs(
      next,
      seasonGamesRef.current,
      priorGamesRef.current,
      { rangeAggregate: rangeAggregateRef.current },
    );

  const loadHighGames = async (
    playerId: string,
    sample: typeof statsSample,
  ) => {
    const season = everyTeamCurrentSeason();
    const [recent, prior] = await Promise.all([
      fetchRecentGames(playerId, sample, season),
      fetchRecentGames(playerId, "regular", previousSeason(season)),
    ]);
    seasonGamesRef.current = recent;
    priorGamesRef.current = prior;
    return recent;
  };

  const setHighPip = (showHighPip: boolean) => {
    const next = markHighs({ ...draftRef.current, showHighPip });
    setDraft(next);
    if (!showHighPip) {
      setStatus("High pip off.");
      return;
    }
    if (parseStatCardSource(next.source) === "season") {
      setStatus("High pip marks a last-game season or career high.");
      return;
    }
    if (!next.playerId) {
      setStatus("Pick a player — high pip marks a last-game season or career high.");
      return;
    }
    const marked = next.stats.some((line) => line.high);
    if (marked) {
      setStatus("High pip on — SZN HIGH or CAREER HIGH on the matching stat.");
      return;
    }
    if (!seasonGamesRef.current.length) {
      void (async () => {
        await loadHighGames(next.playerId!, statsSample);
        const refreshed = markHighs(draftRef.current);
        setDraft(refreshed);
        setStatus(
          refreshed.stats.some((line) => line.high)
            ? "High pip on — SZN HIGH or CAREER HIGH on the matching stat."
            : "High pip on — none of these slots is a season or career high.",
        );
      })();
      return;
    }
    setStatus("High pip on — none of these slots is a season or career high.");
  };

  const fillStats = async (
    next: StatCardDraft,
    sample = statsSample,
  ) => {
    if (!next.playerId) {
      return;
    }
    const seq = fillSeq.current;
    const source = parseStatCardSource(next.source);
    try {
      if (source === "season") {
        await loadEveryTeamRosters();
        setDraft((current) =>
          seq === fillSeq.current && current.playerId === next.playerId
            ? markHighs(fillStatCardFromSeason(current, next.season, sample))
            : current,
        );
        return;
      }
      const recent = await loadHighGames(next.playerId, sample);
      const inRange = gamesInInclusiveRange(recent, range.from, range.to);
      rangeAggregateRef.current = inRange.length > 1;
      const game =
        inRange.length > 1
          ? aggregateLastGames(inRange)
          : inRange[0] ??
            (await fetchLastGame(
              next.playerId,
              sample,
              parseStatCardSource(next.source) === "last-game"
                ? next.gameDate || range.to
                : null,
            ));
      if (seq !== fillSeq.current) {
        return;
      }
      if (game) {
        lastGameRef.current = game;
      }
      setDraft((current) => {
        if (seq !== fillSeq.current || current.playerId !== next.playerId) {
          return current;
        }
        if (!game) {
          return current;
        }
        return markHighs(fillStatCardFromGame(current, game));
      });
    } catch {
      /* still editable */
    }
  };

  const fillPickedLastGame = async (
    next: StatCardDraft,
    recs?: "standouts" | "rough-night",
  ) => {
    const playerId = next.playerId;
    if (!playerId) {
      return;
    }
    const seq = fillSeq.current;
    try {
      const recent = await loadHighGames(playerId, statsSample);
      const inRange = gamesInInclusiveRange(recent, range.from, range.to);
      rangeAggregateRef.current = inRange.length > 1;
      const game =
        inRange.length > 1
          ? aggregateLastGames(inRange)
          : inRange[0] ??
            (await fetchLastGame(
              playerId,
              statsSample,
              next.gameDate || range.to,
            ));
      if (!game || seq !== fillSeq.current) {
        return;
      }
      lastGameRef.current = game;
      const usual = usualLineFor(playerId);
      setDraft((current) => {
        if (seq !== fillSeq.current || current.playerId !== playerId) {
          return current;
        }
        const useDud =
          recs === "rough-night" ||
          (recs !== "standouts" &&
            isRoughNight(game.stats, usual, playerId));
        const filled = useDud
          ? fillStatCardFromRoughNight(current, game)
          : fillStatCardFromStandout(current, game);
        return markHighs(filled);
      });
    } catch {
      /* still editable */
    }
  };

  const applyHudStats = (current: StatCardDraft, stats: StatCardLine[]) => {
    const next = { ...current, stats };
    if (parseStatCardSource(current.source) === "season") {
      return markHighs(fillStatCardFromSeason(next, next.season, statsSample));
    }
    const game = lastGameRef.current;
    return markHighs(game ? fillStatCardFromGame(next, game) : next);
  };

  const commitHudStats = (stats: StatCardLine[]) => {
    const next = applyHudStats(draftRef.current, stats);
    setDraft(next);
    if (
      parseStatCardSource(next.source) === "last-game" &&
      next.playerId &&
      !lastGameRef.current
    ) {
      void fillStats(next);
    }
  };

  const setSource = (nextSource: StatCardSource) => {
    const next = { ...draft, source: nextSource };
    setDraft(next);
    void fillStats(next);
  };

  const setGameDate = (iso: string) => {
    const nextDate = isoDateOnly(iso) || todayIso;
    night.setDate(nextDate);
    const next = { ...draft, gameDate: nextDate };
    setDraft(next);
    void fillStats(next);
  };

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const current = draftRef.current;
    if (!current.playerId) {
      return;
    }
    if (
      parseStatCardSource(current.source) === "last-game" &&
      current.gameDate !== range.to
    ) {
      const next = {
        ...current,
        gameDate: range.to,
        statsLeft: peekStatCardStatsLeft(range.to),
      };
      setDraft(next);
      void fillStats(next);
      return;
    }
    void fillStats(current);
    // Player picks fill in commitPick / fillPickedLastGame. Re-running
    // fillStats on playerId would restore default PTS/REB/AST keys.
  }, [hydrated, range.from, range.to, source]);

  useEffect(() => {
    if (!pickerOpen || source !== "last-game") {
      return;
    }
    let cancelled = false;
    setStandoutsLoading(true);
    setDudsLoading(true);
    void fetchStandoutsInRange(range.from, range.to)
      .then((rows) => {
        if (!cancelled) {
          setRangeStandouts(rows);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStandoutsLoading(false);
        }
      });
    void fetchDudsInRange(range.from, range.to)
      .then((rows) => {
        if (!cancelled) {
          setRangeDuds(rows);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDudsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pickerOpen, source, range.from, range.to]);

  const handleExport = async (
    filename?: string,
    story = false,
    square = false,
  ) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    setStatus("Rendering PNG…");
    setPickerOpen(false);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await exportStatCardPng(
        node,
        filename ??
          exportFilenameFromTitle(playerName(draft) || "stat-card", "stat-card"),
        { ...draft, look, purpleFlair, photoGrade },
        story,
        square,
      );
      setDraft((current) => {
        const statsLeft = nextStatsLeft(Boolean(current.statsLeft));
        persistStatCardStatsLeft(statsLeft, current.gameDate);
        return { ...current, statsLeft };
      });
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

  const commitPick = (
    playerId: string,
    keepCustomPhoto: boolean,
    recs?: "standouts" | "rough-night",
  ) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    fillSeq.current += 1;
    push(draft);
    let next = fillStatCardFromPlayer(player, draft, keepCustomPhoto);
    const standout = completedNightRows(rangeStandouts).find(
      (row) => row.athleteId === playerId,
    );
    const dud = completedNightRows(rangeDuds).find(
      (row) => row.athleteId === playerId,
    );
    let filledFromRecs = false;
    if (parseStatCardSource(next.source) === "last-game") {
      const fromRoughNight = recs === "rough-night";
      const fromStandouts = recs === "standouts";
      if (fromRoughNight && dud) {
        lastGameRef.current = dud.game;
        next = fillStatCardFromRoughNight(next, dud.game);
        filledFromRecs = true;
      } else if (fromStandouts && standout) {
        lastGameRef.current = standout.game;
        next = fillStatCardFromStandout(next, standout.game);
        filledFromRecs = true;
      } else if (dud && !fromStandouts) {
        lastGameRef.current = dud.game;
        next = fillStatCardFromRoughNight(next, dud.game);
        filledFromRecs = true;
      } else if (standout && !fromRoughNight) {
        lastGameRef.current = standout.game;
        next = fillStatCardFromStandout(next, standout.game);
        filledFromRecs = true;
      }
    }
    setDraft(next);
    setPickerOpen(false);
    setKeepPrompt(null);
    setStatus(
      keepCustomPhoto
        ? `Kept the photo for ${player.name}.`
        : `Filled ${player.name}. Headshot is in — paste or upload an action photo if you want.`,
    );
    if (parseStatCardSource(next.source) === "last-game") {
      if (!filledFromRecs) {
        void fillPickedLastGame(next, recs);
      }
      return;
    }
    void fillStats(next);
  };

  const handlePick = (
    playerId: string,
    recs?: "standouts" | "rough-night",
  ) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    const samePlayer = player.id === draft.playerId;
    if (hasCustomPhoto(draft) && !samePlayer) {
      setKeepPrompt({
        playerId: player.id,
        playerName: player.name,
        recs,
      });
      setPickerOpen(false);
      return;
    }
    commitPick(player.id, samePlayer && hasCustomPhoto(draft), recs);
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void dataUrlFromClipboard(event).then((dataUrl) => {
        if (!dataUrl) {
          return;
        }
        event.preventDefault();
        setDraft((current) => setStatCardPhoto(current, dataUrl));
        setStatus("Pasted photo into the frame.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const stem = playerName(draft) || "stat-card";
  const nextLine = nextStatCardLine(draft.stats);

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Stat card"
        identity={
          <label className="sc-field sc-field--wide">
            Name
            <input
              value={playerName(draft)}
              maxLength={32}
              onChange={(event) =>
                setDraft((current) =>
                  applyPlayerName(current, event.target.value),
                )
              }
            />
          </label>
        }
        data={
          <>
          <div className="sc-stat-slots" role="group" aria-label="On-card stats">
            <span className="sc-toolbar__eyebrow">On-card stats</span>
            <button
              type="button"
              className="sc-chip sc-stat-slots__add"
              disabled={draft.stats.length >= STC_STAT_MAX || !nextLine}
              aria-label={nextLine ? `Add ${nextLine.label} slot` : "8 stats"}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const current = draftRef.current;
                const stats = addStatCardLine(current.stats);
                if (stats.length === current.stats.length) {
                  return;
                }
                commitHudStats(stats);
              }}
            >
              {nextLine ? `Add ${nextLine.label}` : "8 stats"}
            </button>
            <p className="sc-hint">Drag a row on the graphic to reorder these slots.</p>
            {draft.stats.map((line, index) => (
              <div
                key={`slot-${index}`}
                className="sc-field sc-field--stat-slot"
              >
                {`Stat ${index + 1}`}
                <div className="sc-stat-slot">
                  <select
                    value={line.key}
                    aria-label={`Stat ${index + 1} on card`}
                    onChange={(event) => {
                      const key = parseStatCardKey(event.target.value);
                      const current = draftRef.current;
                      commitHudStats(
                        setStatCardLineKey(
                          current.stats,
                          index,
                          key,
                          parseStatCardSource(current.source),
                          lastGameRef.current?.stats,
                        ),
                      );
                    }}
                  >
                    {STAT_CARD_LINE_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {draft.stats.length > 1 ? (
                    <button
                      type="button"
                      className="sc-chip sc-stat-slot__remove"
                      aria-label={`Remove stat ${index + 1} ${line.label}`}
                      onClick={() =>
                        commitHudStats(
                          removeStatCardLine(draftRef.current.stats, index),
                        )
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        <div className="sc-look" role="group" aria-label="Stat source">
          <span className="sc-look__label">Stats</span>
          <button
            type="button"
            className={
              parseStatCardSource(draft.source) === "last-game"
                ? "sc-chip is-on"
                : "sc-chip"
            }
            aria-pressed={parseStatCardSource(draft.source) === "last-game"}
            onClick={() => setSource("last-game")}
          >
            Last game
          </button>
          <button
            type="button"
            className={
              parseStatCardSource(draft.source) === "season"
                ? "sc-chip is-on"
                : "sc-chip"
            }
            aria-pressed={parseStatCardSource(draft.source) === "season"}
            onClick={() => setSource("season")}
          >
            Season avg
          </button>
        </div>
        <div className="sc-look" role="group" aria-label="High pip">
          <span className="sc-look__label">High pip</span>
          <button
            type="button"
            className={draft.showHighPip ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={Boolean(draft.showHighPip)}
            aria-label="Season and career high pip"
            title="Marks a last-game season or career high on that stat. Off by default."
            onClick={() => setHighPip(!draft.showHighPip)}
          >
            {draft.showHighPip ? "On" : "Off"}
          </button>
        </div>
        <ComposerStatsSampleToggle
          sample={statsSample}
          onChange={(nextSample) => {
            setStatsSample(nextSample);
            void fillStats(draft, nextSample);
          }}
        />
        {source === "last-game" ? (
        <ComposerDateRange
          from={range.from}
          to={range.to}
          simpleSet="night"
          onChange={(next) => {
            const written = setRange(next);
            setGameDate(written.to);
          }}
        />
        ) : (
        <label className="sc-field">
          Season
          <select
            value={draft.season || everyTeamCurrentSeason()}
            aria-label="Stat card season"
            disabled={!rostersReady}
            onChange={(event) => {
              const next = { ...draft, season: event.target.value };
              setDraft(next);
              void fillStats(next);
            }}
          >
            {everyTeamSeasons().map((option) => (
              <option key={option} value={option}>
                {option}
                {option === everyTeamCurrentSeason() ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
        )}
          <ComposerPhotoHud
            onPick={() => setPickerOpen(true)}
            onUpload={(dataUrl) => {
              setDraft((current) => setStatCardPhoto(current, dataUrl));
              setStatus("Photo cropped inside the frame — pinch or drag.");
            }}
            onUploadMany={(urls) => {
              const first = urls[0];
              if (!first) {
                return;
              }
              setDraft((current) => setStatCardPhoto(current, first));
              setStatus("Photo cropped inside the frame — pinch or drag.");
            }}
          />
          </>
        }
        board={
          <>
            <ComposerLookToggle look={look} onChange={setLook} />
            {photoGrade ? (
              <PhotoGradeToggle
                on={photoGrade}
                onChange={setPhotoGrade}
                intensity={gradeIntensity}
                onIntensityChange={setGradeIntensity}
                slidersOnly
              />
            ) : null}
            <StatCardFlipToggle
              statsLeft={Boolean(draft.statsLeft)}
              onChange={(statsLeft) => {
                persistStatCardStatsLeft(statsLeft, draft.gameDate);
                setDraft((current) => ({ ...current, statsLeft }));
              }}
            />
            <BaMarkToggle
              on={draft.showBa !== false}
              onChange={(showBa) =>
                setDraft((current) => ({ ...current, showBa }))
              }
            />
            <WatermarkToggle
              value={draft.watermark}
              onChange={(watermark) =>
                setDraft((current) => ({ ...current, watermark }))
              }
            />
            <ComposerHudExtras
              label="Board extras"
              ariaLabel="Stat board extras"
              items={[
                {
                  key: "photo-look",
                  label: "Photo look",
                  on: photoGrade,
                  onChange: setPhotoGrade,
                },
                {
                  key: "matchup",
                  label: "Matchup",
                  on: Boolean(draft.showMatchup),
                  onChange: (showMatchup) => {
                    setDraft((current) => {
                      const matchup =
                        showMatchup && !clipStatMatchup(current.matchup ?? "")
                          ? formatStatCardMatchup(lastGameRef.current)
                          : current.matchup;
                      return { ...current, showMatchup, matchup };
                    });
                  },
                },
                {
                  key: "purple",
                  label: "Purple",
                  on: purpleFlair,
                  onChange: setPurpleFlair,
                },
                {
                  key: "story-crop",
                  label: "Story crop",
                  on: storyCrop,
                  onChange: setStoryCrop,
                },
              ]}
            />
          </>
        }
        persist={
          <ComposerSaves
            storageKey={SAVES_KEY}
            board={draft}
            onLoad={(next) => {
              const loaded = normalizeStatCardDraft(next);
              setDraft(loaded);
              setStatus("Loaded named graphic.");
              void fillStats(loaded);
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
                setDraft(previous);
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
              push(draft);
              setDraft(keepComposerPhotos(defaultStatCardDraft(), draft));
              setStatus("Reset — photos kept.");
            }}
          >
            Reset keep photos
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
                if (!confirmBlankPost()) {
                  return;
                }
              push(draft);
              setDraft(defaultStatCardDraft());
              setStatus("Blank post.");
            }}
          >
            Blank post
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              void copyGraphicCaption(statCardLineCaption(draft)).then(
                () => setStatus("Caption copied."),
                () => setStatus("Could not copy caption."),
              );
            }}
          >
            Copy caption
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost sc-hud-full-only"
            onClick={() =>
              void handleExport(
                exportFilenameFromTitle(stem, "stat-card", "", true),
                true,
              )
            }
            disabled={exporting}
          >
            Export 9:16
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost sc-btn--aside sc-hud-full-only"
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
                  const feed = exportFilenameFromTitle(stem, "stat-card");
                  await downloadExportPack(
                    () =>
                      renderStatCardCanvas(
                        { ...draft, look, purpleFlair, photoGrade },
                        2,
                      ),
                    feed,
                    [
                      {
                        filename: storyFilename(feed),
                        render: () =>
                          renderStatCardCanvas(
                            {
                              ...draft,
                              look,
                              purpleFlair,
                              photoGrade,
                              story: true,
                            },
                            2,
                          ),
                      },
                    ],
                    { letterbox: false },
                  );
                  setDraft((current) => {
                    const statsLeft = nextStatsLeft(Boolean(current.statsLeft));
                    persistStatCardStatsLeft(statsLeft, current.gameDate);
                    return { ...current, statsLeft };
                  });
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
          <ComposerBoard
            height={storyCrop ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT}
          >
            <StatCardGraphic
              ref={boardRef}
              draft={draft}
              look={look}
              purpleFlair={purpleFlair}
              photoGrade={photoGrade}
              exporting={exporting}
              story={storyCrop}
              onNameChange={(value) =>
                setDraft((current) => applyPlayerName(current, value))
              }
              onStatValue={(index, value) =>
                setDraft((current) =>
                  markHighs({
                    ...current,
                    stats: current.stats.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, value } : row,
                    ),
                  }),
                )
              }
              onStatLabel={(index, value) =>
                setDraft((current) => ({
                  ...current,
                  stats: current.stats.map((row, rowIndex) =>
                    rowIndex === index
                      ? { ...row, label: clipStatLabel(value) }
                      : row,
                  ),
                }))
              }
              onPan={(pan) => setDraft((current) => ({ ...current, pan }))}
              onUpload={(dataUrl) => {
                setDraft((current) => setStatCardPhoto(current, dataUrl));
                setStatus("Photo cropped inside the frame — pinch or drag.");
              }}
              onPick={() => setPickerOpen(true)}
              onRemoveStat={(index) => {
                setDraft((current) => ({
                  ...current,
                  stats: removeStatCardLine(current.stats, index),
                }));
              }}
              onMoveStat={(fromIndex, toIndex) => {
                setDraft((current) => ({
                  ...current,
                  stats: moveStatCardLine(current.stats, fromIndex, toIndex),
                }));
              }}
              onMatchupChange={(matchup) =>
                setDraft((current) => ({ ...current, matchup }))
              }
            />
            <StoryCropGuide on={storyCrop} />
          </ComposerBoard>
          <p className="sc-hint">
            Empty photo first — pick a player for the team-color name bar and
            3 huge stats on a light panel, then upload the action shot. 9:16 is a
            real story board (photo on top, stats in a row), not a letterboxed
            4:5. Drag a stat row on the graphic to reorder Stat 1–8 in the HUD.
            Downloads a 4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {pickerOpen ? (
        <PlayerPicker
          heading="Pick a player"
          hint="Fills the name bar, team color, and stats. No mugshot — upload or paste the action photo."
          currentId={draft.playerId}
          usedLabels={draft.playerId ? { [draft.playerId]: "Stat card" } : {}}
          suggested={
            source === "last-game"
              ? nightStandoutPickerRows(completedNightRows(rangeStandouts))
              : []
          }
          suggestedHeading={source === "last-game" ? "Standouts" : undefined}
          suggestedLoading={source === "last-game" && standoutsLoading}
          extraSuggested={
            source === "last-game"
              ? nightStandoutPickerRows(completedNightRows(rangeDuds))
              : []
          }
          extraSuggestedHeading={
            source === "last-game" ? "Rough night" : undefined
          }
          extraSuggestedLoading={source === "last-game" && dudsLoading}
          extraSuggestedEmpty="No rough nights for this slate yet."
          onJumpLastNight={
            source === "last-game" &&
            matchDateRangePreset(range.from, range.to) === "tonight"
              ? () => {
                  const written = setRange(lastNightRange());
                  setGameDate(written.to);
                }
              : undefined
          }
          onPick={handlePick}
          onClear={() => {
            push(draft);
            setDraft((current) => clearStatCardSubject(current));
            setPickerOpen(false);
          }}
          onClose={closePicker}
        />
      ) : null}
      {keepPrompt ? (
        <KeepCustomPhotoDialog
          playerName={keepPrompt.playerName}
          onKeep={() =>
            commitPick(keepPrompt.playerId, true, keepPrompt.recs)
          }
          onReplace={() =>
            commitPick(keepPrompt.playerId, false, keepPrompt.recs)
          }
          onClose={() => setKeepPrompt(null)}
        />
      ) : null}
    </div>
  );
}
