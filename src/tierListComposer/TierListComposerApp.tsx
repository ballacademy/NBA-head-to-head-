import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerStatsSampleToggle } from "../instagramComposer/ComposerStatsSampleToggle";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { useComposerStatsSample } from "../instagramComposer/composerStatsSample";
import {
  TIER_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import {
  TIER_TITLE_PRESETS,
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
import { TeamPicker } from "../standingsComposer/TeamPicker";
import { autoSortMetricLabel } from "../everyTeamComposer/everyTeamState";
import {
  EVERY_TEAM_STAT_METRICS,
  everyTeamCurrentSeason,
  loadEveryTeamRosters,
  matchingTeamIds,
  parseEveryTeamStatMetric,
  playerStatValue,
  teamStatValue,
  withRosterDepth,
  type EveryTeamStatMetric,
} from "../everyTeamComposer/historicalRosters";
import { exportTierListPng } from "./exportTierPng";
import { PlayerFilterBar } from "./PlayerFilterBar";
import { PlayerPicker } from "./PlayerPicker";
import {
  TierListGraphic,
  type TierPickerTarget,
} from "./TierListGraphic";
import {
  EMPTY_PLAYER_FILTERS,
  NBA_ACTIVE_PLAYERS,
  PLAYER_FILTERS_KEY,
  getPlayer,
  parsePlayerSearchFilters,
  searchPlayers,
  type PlayerSearchFilters,
} from "./nbaActivePlayers";
import {
  addTeamToRow,
  addTier,
  createDefaultRows,
  DEFAULT_TIER_TITLE,
  fillMatchingIds,
  groupIdsByValues,
  isTierDraft,
  MAX_TIERS,
  MIN_TIERS,
  placeTeamAt,
  removeLastTier,
  removeTeamFromRow,
  replaceTeamInRow,
  setTierColor,
  setTierLabel,
  usedLabelsForPicker,
  usedTeamIds,
  type TierRow,
  type TierSplit,
  type TierSubject,
} from "./tierState";
import "@fontsource/montserrat/latin-900.css";
import "./tierListComposer.css";

const TEAM_STORAGE_KEY = "ddgm:tier-list-composer";
const PLAYER_STORAGE_KEY = "ddgm:tier-list-composer-players";
const SUBJECT_STORAGE_KEY = "ddgm:tier-list-subject";

interface TierComposerDraft {
  title: string;
  rows: TierRow[];
  showBa?: boolean;
  showNames?: boolean;
}

const storageKeyFor = (subject: TierSubject) =>
  subject === "players" ? PLAYER_STORAGE_KEY : TEAM_STORAGE_KEY;

const readSubject = (): TierSubject => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subject")?.toLowerCase() === "players") {
      return "players";
    }
  } catch {
    // ignore
  }
  const stored = readJson<string>(SUBJECT_STORAGE_KEY);
  return stored === "players" ? "players" : "teams";
};

const writeSubject = (subject: TierSubject) => {
  writeJson(SUBJECT_STORAGE_KEY, subject);
  try {
    const url = new URL(window.location.href);
    if (subject === "players") {
      url.searchParams.set("subject", "players");
    } else {
      url.searchParams.delete("subject");
    }
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== next) {
      window.history.replaceState({}, "", next);
    }
  } catch {
    // ignore
  }
};

const loadDraft = (subject: TierSubject): TierComposerDraft => {
  const stored = readJson<Partial<TierComposerDraft>>(storageKeyFor(subject));
  if (isTierDraft(stored)) {
    return {
      title: stored.title.trim() || DEFAULT_TIER_TITLE,
      rows: stored.rows,
      showBa: stored.showBa !== false,
      showNames: stored.showNames === true,
    };
  }
  return {
    title: stored?.title?.trim() ? stored.title : DEFAULT_TIER_TITLE,
    rows: createDefaultRows(),
    showBa: stored?.showBa !== false,
    showNames: stored?.showNames === true,
  };
};

export function TierListComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [subject, setSubject] = useState<TierSubject>("teams");
  const [title, setTitle] = useState(DEFAULT_TIER_TITLE);
  const [rows, setRows] = useState<TierRow[]>(createDefaultRows);
  const [active, setActive] = useState<TierPickerTarget | null>(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [playerFilters, setPlayerFilters] =
    useState<PlayerSearchFilters>(EMPTY_PLAYER_FILTERS);
  const [filterEpoch, setFilterEpoch] = useState(0);
  const [rostersReady, setRostersReady] = useState(false);
  const [groupMetric, setGroupMetric] = useState<EveryTeamStatMetric>("points");
  const [tierSplit, setTierSplit] = useState<TierSplit>("even");
  const [look, setLook] = useComposerLook(TIER_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [statsSample, setStatsSample] = useComposerStatsSample();
  const [showBa, setShowBa] = useState(true);
  const [showNames, setShowNames] = useState(false);
  const { push, pop, canUndo } = useComposerUndo<TierRow[]>();
  const matchingIds = useMemo(
    () =>
      subject === "players"
        ? searchPlayers(
            "",
            playerFilters,
            withRosterDepth(NBA_ACTIVE_PLAYERS),
          ).map((player) => player.id)
        : matchingTeamIds(playerFilters),
    [subject, playerFilters, rostersReady],
  );
  const filteredPlayerCount = matchingIds.length;

  const resetPlayerFilters = () => {
    setPlayerFilters({ ...EMPTY_PLAYER_FILTERS });
    setFilterEpoch((value) => value + 1);
  };

  useEffect(() => {
    document.title =
      subject === "players" ? "Player tier list graphic" : "Tier list graphic";
  }, [subject]);

  useEffect(() => {
    const initial = readSubject();
    const draft = loadDraft(initial);
    setSubject(initial);
    setTitle(draft.title);
    setRows(draft.rows);
    setShowBa(draft.showBa !== false);
    setShowNames(draft.showNames === true);
    setPlayerFilters(parsePlayerSearchFilters(readJson(PLAYER_FILTERS_KEY)));
    setHydrated(true);
    void loadEveryTeamRosters()
      .then(() => setRostersReady(true))
      .catch(() => {
        setRostersReady(false);
      });
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(storageKeyFor(subject), { title, rows, showBa, showNames });
  }, [title, rows, showBa, showNames, subject, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(PLAYER_FILTERS_KEY, playerFilters);
  }, [playerFilters, hydrated]);

  const selectSubject = (next: TierSubject) => {
    if (next === subject) {
      return;
    }
    writeJson(storageKeyFor(subject), { title, rows, showBa, showNames });
    const draft = loadDraft(next);
    setSubject(next);
    setTitle(draft.title);
    setRows(draft.rows);
    setShowBa(draft.showBa !== false);
    setShowNames(draft.showNames === true);
    setActive(null);
    writeSubject(next);
  };

  const closePicker = useCallback(() => setActive(null), []);

  const handleExport = async () => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    setStatus("Rendering PNG…");
    setActive(null);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await exportTierListPng(
        node,
        exportFilenameFromTitle(title, "nba-tier-list", exportDateStamp()),
        {
          title,
          rows,
          subject,
          look,
          purpleFlair,
          showBa,
          showNames,
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

  const handleReset = () => {
    push(rows);
    setTitle(DEFAULT_TIER_TITLE);
    setRows(createDefaultRows());
    setActive(null);
    setStatus("Board cleared.");
  };

  const handlePopulateMatching = () => {
    const result = fillMatchingIds(rows, matchingIds);
    if (result.added === 0) {
      setStatus(
        matchingIds.length
          ? "All matching names are already on the board."
          : "No names match the current filters.",
      );
      return;
    }
    push(rows);
    setRows(result.rows);
    setActive(null);
    setStatus(
      `Filled ${result.added} matching ${noun}${
        result.added === 1 ? "" : "s"
      }. Group by a stat to rank them into S–F.`,
    );
  };

  const handleGroupByStat = (metric: EveryTeamStatMetric) => {
    const season = everyTeamCurrentSeason();
    const used = [...usedTeamIds(rows)];
    if (!used.length) {
      setStatus("Populate matching names first, then group by a stat.");
      return;
    }
    const values = new Map<string, number | null>();
    used.forEach((id) => {
      if (subject === "teams") {
        values.set(id, teamStatValue(id, season, metric, statsSample));
        return;
      }
      const player = getPlayer(id);
      values.set(
        id,
        playerStatValue(id, season, metric, player?.team ?? null, statsSample),
      );
    });
    const scored = used.filter((id) => values.get(id) != null).length;
    const label = autoSortMetricLabel(metric);
    push(rows);
    setRows(groupIdsByValues(rows, values, tierSplit));
    setActive(null);
    if (scored === 0) {
      setStatus(
        `No ${label} yet — last season’s table is used when this year has none.`,
      );
      return;
    }
    setStatus(
      `Grouped ${scored} by ${label} into ${rows.length} tiers (highest in ${rows[0]?.label || "S"}).`,
    );
  };

  const handleExportStory = async () => {
    const node = boardRef.current;
    if (!node) {
      return;
    }
    setExporting(true);
    setActive(null);
    try {
      await exportTierListPng(
        node,
        exportFilenameFromTitle(title, "nba-tier-list", exportDateStamp(), true),
        { title, rows, subject, look, purpleFlair, showBa, showNames },
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

  const pickerRow = active ? rows[active.rowIndex] : null;
  const noun = subject === "players" ? "player" : "team";

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title={subject === "players" ? "Player tier list" : "Team tier list"}
        identity={
          <>
        <div className="sc-subject" role="tablist" aria-label="Tier list subject">
          <button
            type="button"
            role="tab"
            className={subject === "teams" ? "sc-chip is-on" : "sc-chip"}
            aria-selected={subject === "teams"}
            onClick={() => selectSubject("teams")}
          >
            Teams
          </button>
          <button
            type="button"
            role="tab"
            className={subject === "players" ? "sc-chip is-on" : "sc-chip"}
            aria-selected={subject === "players"}
            onClick={() => selectSubject("players")}
          >
            Players
          </button>
        </div>
        <label className="sc-field sc-field--wide">
          Title
          <input
            value={title}
            maxLength={COMPOSER_TITLE_MAX_LENGTH}
            onChange={(event) =>
              onComposerTextChange(event, setTitle, COMPOSER_TITLE_MAX_LENGTH)
            }
          />
        </label>
        <TitlePresetSelect
          value={title}
          presets={TIER_TITLE_PRESETS}
          onChange={setTitle}
        />
          </>
        }
        data={
          <>
        <ComposerStatsSampleToggle
          sample={statsSample}
          onChange={setStatsSample}
        />
        <div className="sc-look sc-look--sort" role="group" aria-label="Populate matching filters">
          <span className="sc-look__label">Board</span>
          <button
            type="button"
            className="sc-chip"
            onClick={handlePopulateMatching}
          >
            Populate matching
          </button>
        </div>
        <div className="sc-look sc-look--sort" role="group" aria-label="Group board by stat">
          <span className="sc-look__label">Group by</span>
          <select
            value={groupMetric}
            aria-label="Group-by stat"
            onChange={(event) =>
              setGroupMetric(parseEveryTeamStatMetric(event.target.value))
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
            className={tierSplit === "fat-s" ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={tierSplit === "fat-s"}
            onClick={() =>
              setTierSplit((current) => (current === "fat-s" ? "even" : "fat-s"))
            }
          >
            Fat S
          </button>
          <button
            type="button"
            className="sc-chip"
            onClick={() => handleGroupByStat(groupMetric)}
          >
            Sort into tiers
          </button>
        </div>
        <button
          type="button"
          className="sc-chip"
          onClick={() => {
            push(rows);
            setRows((current) => addTier(current));
          }}
          disabled={rows.length >= MAX_TIERS}
        >
          Add tier
        </button>
        <button
          type="button"
          className="sc-chip"
          onClick={() => {
            push(rows);
            setRows((current) => removeLastTier(current));
          }}
          disabled={rows.length <= MIN_TIERS}
        >
          Remove tier
        </button>
          </>
        }
        filters={
          <PlayerFilterBar
            variant={subject}
            filters={playerFilters}
            matchCount={filteredPlayerCount}
            onChange={setPlayerFilters}
            onReset={resetPlayerFilters}
          />
        }
        board={
          <>
            <label className="sc-field">
              <span className="sc-toolbar__eyebrow">Names</span>
              <button
                type="button"
                className={showNames ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={showNames}
                aria-label="Show names on cells"
                onClick={() => setShowNames((on) => !on)}
              >
                {showNames ? "On" : "Off"}
              </button>
            </label>
            <ComposerLookToggle look={look} onChange={setLook} />
            <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
            <BaMarkToggle on={showBa} onChange={setShowBa} />
          </>
        }
        persist={
        <ComposerSaves
          storageKey={
            subject === "players"
              ? "ddgm:tier-list-composer-players:saves"
              : "ddgm:tier-list-composer:saves"
          }
          board={{ title, rows, showBa, showNames }}
          onLoad={(next) => {
            setTitle(next.title);
            setRows(next.rows);
            setShowBa(next.showBa !== false);
            setShowNames(next.showNames === true);
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
                setRows(previous);
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
            onClick={() => void handleExportStory()}
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
          <TierListGraphic
            ref={boardRef}
            title={title}
            rows={rows}
            subject={subject}
            look={look}
            purpleFlair={purpleFlair}
            showBa={showBa}
            showNames={showNames}
            active={exporting ? null : active}
            exporting={exporting}
            onTitleChange={setTitle}
            onLabelChange={(index, label) =>
              setRows((current) => setTierLabel(current, index, label))
            }
            onColorChange={(index, color) =>
              setRows((current) => setTierColor(current, index, color))
            }
            onSelectAdd={(rowIndex) =>
              setActive({ rowIndex, replaceId: null })
            }
            onSelectTeam={(rowIndex, teamId) =>
              setActive({ rowIndex, replaceId: teamId })
            }
            onRemoveTeam={(rowIndex, teamId) => {
              push(rows);
              setRows((current) => removeTeamFromRow(current, rowIndex, teamId));
            }}
            onPlaceTeam={(rowIndex, index, teamId) => {
              push(rows);
              setRows((current) => placeTeamAt(current, rowIndex, index, teamId));
            }}
          />
          </ComposerBoard>
          <p className="sc-hint">
            Click a square to add a {noun}, or Populate matching to fill from the
            current filters. Group by a stat ranks the board into S–A–… .
            Tiers range from 3 to 10. Downloads a 4:5 Instagram PNG — nothing is
            posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {active && pickerRow && subject === "teams" ? (
        <TeamPicker
          heading={`Pick team · ${pickerRow.label || "tier"}`}
          hint="Click a club to add it to this tier. Used teams move here."
          currentId={active.replaceId}
          usedLabels={usedLabelsForPicker(rows, active.rowIndex, active.replaceId)}
          clearLabel={active.replaceId ? "Remove from row" : "Clear slot"}
          onPick={(teamId) => {
            push(rows);
            setRows((current) =>
              active.replaceId
                ? replaceTeamInRow(
                    current,
                    active.rowIndex,
                    active.replaceId,
                    teamId,
                  )
                : addTeamToRow(current, active.rowIndex, teamId),
            );
            setActive(null);
          }}
          onClear={
            active.replaceId
              ? () => {
                  push(rows);
                  setRows((current) =>
                    removeTeamFromRow(
                      current,
                      active.rowIndex,
                      active.replaceId as string,
                    ),
                  );
                  setActive(null);
                }
              : undefined
          }
          onClose={closePicker}
        />
      ) : null}

      {active && pickerRow && subject === "players" ? (
        <PlayerPicker
          key={filterEpoch}
          heading={`Pick player · ${pickerRow.label || "tier"}`}
          hint="Players and head coaches. Board filters already applied."
          includeCoaches
          lockedFilters={playerFilters}
          currentId={active.replaceId}
          usedLabels={usedLabelsForPicker(rows, active.rowIndex, active.replaceId)}
          clearLabel={active.replaceId ? "Remove from row" : "Clear slot"}
          onPick={(playerId) => {
            push(rows);
            setRows((current) =>
              active.replaceId
                ? replaceTeamInRow(
                    current,
                    active.rowIndex,
                    active.replaceId,
                    playerId,
                  )
                : addTeamToRow(current, active.rowIndex, playerId),
            );
            setActive(null);
          }}
          onClear={
            active.replaceId
              ? () => {
                  push(rows);
                  setRows((current) =>
                    removeTeamFromRow(
                      current,
                      active.rowIndex,
                      active.replaceId as string,
                    ),
                  );
                  setActive(null);
                }
              : undefined
          }
          onClose={closePicker}
        />
      ) : null}
    </div>
  );
}
