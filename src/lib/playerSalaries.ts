import salaryData from "../../data/nba-salaries-202627.json";
import seasonStats from "../../data/nba-stats/nba-player-stats-202526-regular-season.json";
import espnHeadshots from "../../data/espn-player-headshots.json";

interface SalaryDataFile {
  season: string;
  source: string;
  salaries: Record<string, number>;
}

interface SeasonPlayerRow {
  espnId?: string;
  bbrPlayerId?: string;
}

interface SeasonStatsFile {
  players?: SeasonPlayerRow[];
}

const salaryFile = salaryData as SalaryDataFile;
const salariesByKey = new Map(Object.entries(salaryFile.salaries));
const espnToBbr = new Map<string, string>();

for (const row of (seasonStats as SeasonStatsFile).players ?? []) {
  const espnId = String(row.espnId ?? "").trim();
  const bbr = String(row.bbrPlayerId ?? "").trim();
  if (espnId && bbr) {
    espnToBbr.set(espnId, bbr);
  }
}

const headshotFile = espnHeadshots as {
  byBbrPlayerId?: Record<string, { espnId?: string }>;
};
for (const [bbr, row] of Object.entries(headshotFile.byBbrPlayerId ?? {})) {
  const espnId = String(row?.espnId ?? "").trim();
  if (espnId && !espnToBbr.has(espnId)) {
    espnToBbr.set(espnId, bbr);
  }
}

export const PLAYER_SALARY_SEASON = salaryFile.season;

export const bbrIdForEspn = (espnId?: string) => {
  const id = String(espnId ?? "").trim();
  return id ? espnToBbr.get(id) : undefined;
};

export const getPlayerSalary = (bbrPlayerId?: string, playerId?: string) => {
  if (bbrPlayerId && salariesByKey.has(bbrPlayerId)) {
    return salariesByKey.get(bbrPlayerId)!;
  }

  if (playerId && salariesByKey.has(playerId)) {
    return salariesByKey.get(playerId)!;
  }

  const mapped = bbrIdForEspn(playerId);
  if (mapped && salariesByKey.has(mapped)) {
    return salariesByKey.get(mapped)!;
  }

  return undefined;
};

export const hasPlayerContractSalary = (
  bbrPlayerId?: string,
  playerId?: string,
) => getPlayerSalary(bbrPlayerId, playerId) != null;

export const formatCapSalary = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}K`;
  }
  return `$${Math.round(value)}`;
};

export const salaryLabelForPlayer = (
  bbrPlayerId?: string,
  playerId?: string,
) => {
  const salary = getPlayerSalary(bbrPlayerId, playerId);
  return salary != null ? formatCapSalary(salary) : "";
};
