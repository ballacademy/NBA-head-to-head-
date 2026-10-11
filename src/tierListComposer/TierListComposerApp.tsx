import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  onComposerTextChange,
} from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { TeamPicker } from "../standingsComposer/TeamPicker";
import { exportTierFilename, exportTierListPng } from "./exportTierPng";
import { PlayerFilterBar } from "./PlayerFilterBar";
import { PlayerPicker } from "./PlayerPicker";
import {
  TierListGraphic,
  type TierPickerTarget,
} from "./TierListGraphic";
import {
  EMPTY_PLAYER_FILTERS,
  searchPlayers,
  type PlayerSearchFilters,
} from "./nbaActivePlayers";
import {
  addTeamToRow,
  addTier,
  createDefaultRows,
  DEFAULT_TIER_TITLE,
  isTierDraft,
  MAX_TIERS,
  MIN_TIERS,
  placeTeamAt,
  removeLastTier,
  removeTeamFromRow,
  replaceTeamInRow,
  setTierLabel,
  usedLabelsForPicker,
  type TierRow,
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
    return { title: stored.title.trim() || DEFAULT_TIER_TITLE, rows: stored.rows };
  }
  return {
    title: stored?.title?.trim() ? stored.title : DEFAULT_TIER_TITLE,
    rows: createDefaultRows(),
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
  const filteredPlayerCount = useMemo(
    () => searchPlayers("", playerFilters).length,
    [playerFilters],
  );

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
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(storageKeyFor(subject), { title, rows });
  }, [title, rows, subject, hydrated]);

  const selectSubject = (next: TierSubject) => {
    if (next === subject) {
      return;
    }
    writeJson(storageKeyFor(subject), { title, rows });
    const draft = loadDraft(next);
    setSubject(next);
    setTitle(draft.title);
    setRows(draft.rows);
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
      await exportTierListPng(node, exportTierFilename(title), {
        title,
        rows,
        subject,
      });
      setStatus("Download started.");
    } catch (error) {
      console.error(error);
      setStatus("Could not export PNG.");
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    setTitle(DEFAULT_TIER_TITLE);
    setRows(createDefaultRows());
    setActive(null);
    setStatus("Board cleared.");
  };

  const pickerRow = active ? rows[active.rowIndex] : null;
  const noun = subject === "players" ? "player" : "team";

  return (
    <div className="sc-composer">
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">
            {subject === "players" ? "Player tier list" : "Team tier list"}
          </h1>
        </div>
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
        <div className="sc-toolbar__actions">
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => setRows((current) => addTier(current))}
            disabled={rows.length >= MAX_TIERS}
          >
            Add tier
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => setRows((current) => removeLastTier(current))}
            disabled={rows.length <= MIN_TIERS}
          >
            Remove tier
          </button>
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

      {subject === "players" ? (
        <PlayerFilterBar
          filters={playerFilters}
          matchCount={filteredPlayerCount}
          onChange={setPlayerFilters}
          onReset={resetPlayerFilters}
        />
      ) : null}

      <main className="sc-stage">
        <div className="sc-stage__frame">
          <TierListGraphic
            ref={boardRef}
            title={title}
            rows={rows}
            subject={subject}
            active={exporting ? null : active}
            exporting={exporting}
            onTitleChange={setTitle}
            onLabelChange={(index, label) =>
              setRows((current) => setTierLabel(current, index, label))
            }
            onSelectAdd={(rowIndex) =>
              setActive({ rowIndex, replaceId: null })
            }
            onSelectTeam={(rowIndex, teamId) =>
              setActive({ rowIndex, replaceId: teamId })
            }
            onRemoveTeam={(rowIndex, teamId) =>
              setRows((current) => removeTeamFromRow(current, rowIndex, teamId))
            }
            onPlaceTeam={(rowIndex, index, teamId) =>
              setRows((current) => placeTeamAt(current, rowIndex, index, teamId))
            }
          />
          <p className="sc-hint">
            Click a square to add a {noun}. Switch Teams / Players in the bar.
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
          hint="Board filters already applied. Search by name within that subset."
          lockedFilters={playerFilters}
          currentId={active.replaceId}
          usedLabels={usedLabelsForPicker(rows, active.rowIndex, active.replaceId)}
          clearLabel={active.replaceId ? "Remove from row" : "Clear slot"}
          onPick={(playerId) => {
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
