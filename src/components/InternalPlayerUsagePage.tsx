import { useMemo } from "react";
import { players as allPlayers } from "../data/players";
import {
  formatNbaPlayerWinPct,
  listNbaPlayerUsageRows,
  type NbaPlayerUsageMode,
} from "../lib/nbaPlayerUsage";
import { HubPageChrome } from "./HubPageChrome";

interface InternalPlayerUsagePageProps {
  onBack: () => void;
}

const MODE_LABELS: Record<NbaPlayerUsageMode, string> = {
  daily: "Daily",
  headToHead: "Casual",
  ranked: "Pro",
  allTime: "All-Time",
  event: "Events",
};

const MODE_ORDER: NbaPlayerUsageMode[] = [
  "headToHead",
  "ranked",
  "allTime",
  "event",
  "daily",
];

/**
 * Internal / QA-only roster usage table (drafts + win%).
 * Not linked from any user-facing nav.
 */
export function InternalPlayerUsagePage({ onBack }: InternalPlayerUsagePageProps) {
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const player of allPlayers) {
      map.set(player.id, player.name);
    }
    return map;
  }, []);

  const rows = useMemo(() => listNbaPlayerUsageRows(), []);

  return (
    <HubPageChrome
      className="internal-player-usage"
      title="Player usage (internal)"
      lede="Draft counts and win% by mode. Not shown in product nav."
      onBack={onBack}
      backLabel="Account"
    >
      <section className="hub-feature__panel">
        {rows.length === 0 ? (
          <p className="empty-state">No tracked lineups yet.</p>
        ) : (
          <div className="stats-table-wrap">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Drafts</th>
                  <th>W–L–T</th>
                  <th>Win%</th>
                  {MODE_ORDER.map((mode) => (
                    <th key={mode}>{MODE_LABELS[mode]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.playerId}>
                    <td>{nameById.get(row.playerId) ?? row.playerId}</td>
                    <td>{row.drafts}</td>
                    <td>
                      {row.wins}–{row.losses}–{row.ties}
                    </td>
                    <td>{formatNbaPlayerWinPct(row.winPct)}</td>
                    {MODE_ORDER.map((mode) => {
                      const modeRow = row.byMode[mode];
                      if (!modeRow) {
                        return <td key={mode}>—</td>;
                      }
                      if (mode === "daily") {
                        return <td key={mode}>{modeRow.drafts}d</td>;
                      }
                      const decided = modeRow.wins + modeRow.losses;
                      const pct =
                        decided > 0 ? modeRow.wins / decided : null;
                      return (
                        <td key={mode}>
                          {modeRow.wins}–{modeRow.losses}
                          {pct != null ? ` (${formatNbaPlayerWinPct(pct)})` : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </HubPageChrome>
  );
}
